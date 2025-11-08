import { Request, Response } from "express";
import { toolsAI } from "../../langchain_tools/tools";
import { supabase } from '../../libs/supabase';

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    inputs: Array<{
      id: string;
      label: string;
      type: 'execution' | 'data';
    }>;
    outputs: Array<{
      id: string;
      label: string;
      type: 'execution' | 'data';
    }>;
    parameters: Record<string, any>;
  };
}

async function resolveCredential(userId: string, service: string, name: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('credentials')
    .select('credential')
    .eq('user_id', userId)
    .eq('service', service)
    .eq('name', name)
    .single();
  if (error || !data) return null;
  return data.credential.apiKey || data.credential; // Assuming credential is { apiKey: ... } or string
}

export async function executeWorkflow(req: Request, res: Response) {
    const { workflow, start_node_id, initial_context = {}, is_dry_run = false, userId } = req.body;

    if (!workflow) {
        res.status(400).json({
            success: false,
            message: "Missing required fields: workflow, apikey"
        });
        return;
    }

    try {
        const { nodes, edges }: { nodes: Node[]; edges: any[] } = workflow;
        const context: Record<string, any> = { ...initial_context };
        const logs: string[] = [];
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const edgeMap = new Map<string, any[]>();
        edges.forEach(e => {
            if (!edgeMap.has(e.source)) edgeMap.set(e.source, []);
            edgeMap.get(e.source)!.push(e);
        });

        // Topological execution: respect edges and order
        const incomingCount = new Map<string, number>();
        nodes.forEach(n => incomingCount.set(n.id, 0));
        edges.forEach(e => {
            const count = incomingCount.get(e.target) || 0;
            incomingCount.set(e.target, count + 1);
        });

        const queue: string[] = [];
        if (start_node_id) {
            // Start from specific node
            queue.push(start_node_id);
            // Set incoming count for start_node to 0 if it has incoming, but since starting, ignore
            incomingCount.set(start_node_id, 0);
        } else {
            nodes.forEach(n => {
                if ((incomingCount.get(n.id) || 0) === 0) queue.push(n.id);
            });
        }

        while (queue.length > 0) {
            const nodeId = queue.shift()!;
            const node = nodeMap.get(nodeId)!;
            const tool = toolsAI.find(t => t.name === node.type);
            if (tool) {
                if (is_dry_run) {
                    logs.push(`[DRY RUN] Would execute tool for node ${nodeId} (${node.type})`);
                    context[nodeId] = { dryRun: true, message: "Mock result for dry run" };
                } else {
                    // Resolve parameters with context
                    const params = { ...node.data.parameters };
                    // Resolve credential_name to actual credential
                    if (params.credential_name && userId) {
                        let service = '';
                        if (['gpt_prompt', 'text_classification', 'embeddings'].includes(node.type)) {
                            service = params.model?.startsWith('gemini') ? 'gemini' : 'openai';
                        } else if (node.type === 'email') {
                            service = 'resend';
                        } else if (node.type === 'sms') {
                            service = 'twilio';
                        } else if (node.type === 'shopify') {
                            service = 'shopify';
                        } else if (node.type === 'api_key_auth') {
                            service = 'api_key';
                        } else if (node.type === 'airtable') {
                            service = 'airtable';
                        } else if (node.type === 'hubspot') {
                            service = 'hubspot';
                        }
                        if (service) {
                            const actualCred = await resolveCredential(userId, service, params.credential_name);
                            if (actualCred) {
                                if (node.type === 'email') {
                                    params.apiKey = actualCred;
                                    delete params.credential_name;
                                } else {
                                    params.credential_name = actualCred;
                                }
                            } else {
                                logs.push(`Credential not found for ${service}:${params.credential_name}`);
                            }
                        }
                    }
                    for (const key in params) {
                        if (typeof params[key] === 'string') {
                            params[key] = params[key].replace(/\{\{([^}]+)\}\}/g, (match, path) => {
                                const value = path.split('.').reduce((obj, p) => obj?.[p], context);
                                return value || match;
                            });
                        }
                    }
                    // Add data for tools that need input data
                    if (node.type === 'data_mapping' || node.type === 'csv_processing' || node.type === 'json_parser' || node.type === 'json_xml') {
                        const dataEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'data_in');
                        if (dataEdge) {
                            const dataKey = node.type === 'data_mapping' ? 'data_in' : node.type === 'csv_processing' ? 'data' : 'json_string';
                            params[dataKey] = JSON.stringify(context[dataEdge.source]);
                        }
                    }
                    if (node.type === 'javascript') {
                        params.context = context;
                    }
                    // Call the tool
                    logs.push(`Params for ${node.type}: ${JSON.stringify(params)}`);
                    const result = await tool.invoke(params);
                    logs.push(`Node ${nodeId} executed with params: ${JSON.stringify(params)}`);
                    logs.push(`Node ${nodeId} result: ${result}`);
                    try {
                        const parsed = JSON.parse(result);
                        context[nodeId] = parsed;
                        logs.push(`Node ${nodeId} context set to parsed JSON: ${JSON.stringify(parsed)}`);
                    } catch {
                        context[nodeId] = result;
                        logs.push(`Node ${nodeId} context set to string: ${result}`);
                    }
                }
            } else {
                // Handle triggers
                if (node.type === 'webhook_trigger') {
                    // Simulate incoming data
                    const data = {
                        customer_email: "john@example.com",
                        customer_name: "John Doe",
                        order_id: "12345",
                        product_id: "P001",
                        product_name: "Widget",
                        quantity: 2,
                        total: 100
                    };
                    const simulatedData = { Data: data };
                    context[nodeId] = simulatedData;
                    logs.push(`Trigger ${nodeId} simulated data: ${JSON.stringify(simulatedData)}`);
                } else if (node.type === 'schedule') {
                    context[nodeId] = {};
                    logs.push(`Trigger ${nodeId} scheduled trigger activated`);
                } else if (node.type === 'manual_trigger') {
                    const payload = JSON.parse(node.data.parameters.payload || '{}');
                    context[nodeId] = payload;
                    logs.push(`Trigger ${nodeId} manual trigger with payload: ${JSON.stringify(payload)}`);
                }
                // Handle logic nodes
                if (node.type === 'if_else') {
                    const dataEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'data_in');
                    if (dataEdge) {
                        const inputData = context[dataEdge.source];
                        const { field, operator, value: valueStr } = node.data.parameters;
                        const fieldValue = inputData[field];
                        let value;
                        try {
                            value = JSON.parse(valueStr);
                        } catch {
                            value = valueStr;
                        }
                        let condition = false;
                        switch (operator) {
                            case '==': condition = fieldValue == value; break;
                            case '!=': condition = fieldValue != value; break;
                            case '>': condition = fieldValue > value; break;
                            case '<': condition = fieldValue < value; break;
                            case '>=': condition = fieldValue >= value; break;
                            case '<=': condition = fieldValue <= value; break;
                        }
                        const handle = condition ? 'true' : 'false';
                        logs.push(`Logic ${nodeId} (if_else): field=${field}, fieldValue=${fieldValue}, operator=${operator}, value=${value}, condition=${condition}, branch=${handle}`);
                        const outgoing = edgeMap.get(nodeId) || [];
                        const branchEdge = outgoing.find(e => e.sourceHandle === handle);
                        if (branchEdge) {
                            const count = incomingCount.get(branchEdge.target)! - 1;
                            incomingCount.set(branchEdge.target, count);
                            if (count === 0) queue.push(branchEdge.target);
                        }
                        // Propagate data to data_out
                        context[nodeId] = inputData;
                    }
                } else if (node.type === 'parallel') {
                    // Parallel adds both paths, handled by topological
                    const dataEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'data_in');
                    if (dataEdge) {
                        context[nodeId] = context[dataEdge.source];
                        logs.push(`Logic ${nodeId} (parallel): propagated data from ${dataEdge.source}`);
                    } else {
                        logs.push(`Logic ${nodeId} (parallel): no data input`);
                    }
                } else if (node.type === 'delay') {
                    // For delay, add outgoing after duration, but simplified, add immediately
                    logs.push(`Logic ${nodeId} (delay): delaying for ${node.data.parameters.duration || '5s'}`);
                    const outgoing = edgeMap.get(nodeId) || [];
                    outgoing.forEach(e => {
                        const count = incomingCount.get(e.target)! - 1;
                        incomingCount.set(e.target, count);
                        if (count === 0) queue.push(e.target);
                    });
                } else if (node.type === 'try_catch') {
                    // Simplified, add try path
                    logs.push(`Logic ${nodeId} (try_catch): executing try path`);
                    const outgoing = edgeMap.get(nodeId) || [];
                    const tryEdge = outgoing.find(e => e.sourceHandle === 'try');
                    if (tryEdge) {
                        const count = incomingCount.get(tryEdge.target)! - 1;
                        incomingCount.set(tryEdge.target, count);
                        if (count === 0) queue.push(tryEdge.target);
                    }
                } else {
                    // For other logic nodes, propagate data if they have data outputs
                    const hasDataOutput = node.data.outputs.some((o: any) => o.type === 'data');
                    if (hasDataOutput) {
                        const dataEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'data_in');
                        if (dataEdge) {
                            context[nodeId] = context[dataEdge.source];
                            logs.push(`Logic ${nodeId} (${node.type}): propagated data from ${dataEdge.source}`);
                        } else {
                            logs.push(`Logic ${nodeId} (${node.type}): no data input`);
                        }
                    } else {
                        logs.push(`Logic ${nodeId} (${node.type}): no data output`);
                    }
                }
            }
            // Add outgoing targets to queue if all incoming are processed
            const outgoing = edgeMap.get(nodeId) || [];
            outgoing.forEach(e => {
                const count = incomingCount.get(e.target)! - 1;
                incomingCount.set(e.target, count);
                if (count === 0) queue.push(e.target);
            });
        }

        res.json({
            success: true,
            results: context,
            logs
        });
    } catch (error) {
        console.error("Error executing workflow:", error);
        res.status(500).json({
            success: false,
            message: "Failed to execute workflow",
            error: error.message
        });
    }
}
