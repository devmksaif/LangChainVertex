import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const adminClient = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
    const langchainApiUrl = Deno.env.get('LANGCHAIN_API_URL');
    if (!langchainApiUrl) throw new Error("LANGCHAIN_API_URL environment variable not set.");

    const { workflow_id, start_node_id, initial_context = {}, trigger_type = 'webhook', run_draft = false, is_dry_run = false, apikey } = await req.json();
    if (!workflow_id || !start_node_id || !apikey) throw new Error("workflow_id, start_node_id, and apikey are required.");

    const { data: workflow, error: wfError } = await adminClient.from('workflows').select('user_id, published_version_id, nodes, edges').eq('id', workflow_id).single();
    if (wfError) throw new Error(`Failed to fetch workflow: ${wfError.message}`);
    const userId = workflow.user_id;

    let nodes, edges;
    if (run_draft || is_dry_run) {
      nodes = workflow.nodes;
      edges = workflow.edges;
    } else {
      const publishedVersionId = workflow.published_version_id;
      if (!publishedVersionId) {
        throw new Error(`Workflow ${workflow_id} is not published. Automated triggers will not run.`);
      }
      const { data: publishedVersion, error: versionError } = await adminClient.from('workflow_versions').select('nodes, edges').eq('id', publishedVersionId).single();
      if (versionError) throw new Error(`Failed to fetch published version ${publishedVersionId}: ${versionError.message}`);
      nodes = publishedVersion.nodes;
      edges = publishedVersion.edges;
    }

    // --- PLAN LIMIT CHECK ---
    if (!is_dry_run) {
      const { data: profile, error: profileError } = await adminClient.from('profiles').select('plan').eq('id', userId).single();
      if (profileError) throw new Error(`Could not fetch user profile: ${profileError.message}`);
      const plan = profile.plan || 'free';
      const limit = PLAN_LIMITS[plan];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count, error: countError } = await adminClient.from('workflow_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId).gt('started_at', thirtyDaysAgo);
      if (countError) throw new Error(`Could not count recent runs: ${countError.message}`);
      if (count >= limit) {
        throw new Error(`Plan limit of ${limit} runs per month exceeded. Workflow not executed.`);
      }
    }
    // --- END PLAN LIMIT CHECK ---

    const { data: runRecord, error: runInsertError } = await adminClient.from('workflow_runs').insert({
      workflow_id,
      user_id: userId,
      status: 'started',
      trigger_type: trigger_type,
      logs: []
    }).select('id').single();
    if (runInsertError) throw new Error(`Failed to create run record: ${runInsertError.message}`);
    const runId = runRecord.id;

    const logs = [];
    const log = (message) => {
      const logEntry = `[${new Date().toISOString()}] ${message}`;
      logs.push(logEntry);
      console.log(`[${workflow_id}] ${message}`);
    };

    log(`Workflow execution started from node: ${start_node_id}`);
    if (is_dry_run) {
      log('--- THIS IS A TEST RUN. NO EXTERNAL ACTIONS WILL BE PERFORMED. ---');
    }

    // Instead of local execution, proxy to LangChain project API
    const apiResponse = await fetch(`${langchainApiUrl}/execute-workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apikey}`, // Assuming the project uses Bearer token for apikey
      },
      body: JSON.stringify({
        workflow: { nodes, edges },
        apikey,
        start_node_id, // Pass additional params if needed
        initial_context,
        is_dry_run,
        userId
      })
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      throw new Error(`LangChain API error: ${apiResponse.status} ${errorText}`);
    }

    const apiResult = await apiResponse.json();

    // Update logs and status
    let finalStatus = 'completed';
    try {
      // Assuming apiResult has success and logs
      if (!apiResult.success) {
        finalStatus = 'failed';
        log(`Workflow failed: ${apiResult.message || 'Unknown error'}`);
      } else {
        log('Workflow completed successfully via LangChain API.');
      }
    } catch (error) {
      finalStatus = 'failed';
      log(`Error processing API response: ${error.message}`);
    } finally {
      await adminClient.from('workflow_runs').update({
        finished_at: new Date().toISOString(),
        status: finalStatus,
        logs: logs
      }).eq('id', runId);
    }

    return new Response(JSON.stringify(apiResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[execute-workflow] CRITICAL ERROR: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

// Note: PLAN_LIMITS and other constants are removed as they were part of the old code, but plan check is kept.
const PLAN_LIMITS = {
  free: 500,
  pro: 10000,
  business: Infinity
};
