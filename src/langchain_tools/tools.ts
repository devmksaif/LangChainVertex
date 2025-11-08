import { tool } from "@langchain/core/tools";
import { Resend } from "resend";
import z from "zod";
import { WebClient } from '@slack/web-api';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { parseStringPromise, Builder } from 'xml2js';
import { supabase } from '../libs/supabase';

const emailTool = tool(
    async (args) => {
        const emailSchema = z.object({
            to: z.string(),
            body: z.string(),
            from: z.string(),
            apiKey: z.string().optional(),
            subject: z.string(),
            autoGenerate: z.boolean().optional(),
            generationPrompt: z.string().optional(),
        });

        const data = emailSchema.parse(args);

        try {
            const resend = new Resend(data.apiKey || process.env.RESEND_API_KEY);

            const emailData = {
                from: data.from,
                to: data.to,
                subject: data.subject,
                text: data.body,
            };

            const result = await resend.emails.send(emailData);

            if (result.error) {
                return `Error sending email: ${JSON.stringify(result.error)}`;
            }

            return JSON.stringify({
                success: true,
                id: result.data.id,
                message: `Email sent successfully to ${data.to}`
            });

        } catch (error) {
            return `Error executing email tool: ${error.message}`;
        }
    },
    {
        name: "send_email",
        description: "Sends an email to a recipient using Resend",
        schema: z.object({
            to: z.string().describe("Recipient's email address."),
            body: z.string().describe("Email body content."),
            from: z.string().describe("Sender's email address."),
            apiKey: z.string().optional().describe("API key for Resend."),
            subject: z.string().describe("Email subject."),
            autoGenerate: z.boolean().optional(),
            generationPrompt: z.string().optional(),
        }),
    }
);

const slackTool = tool(
    async (args) => {
        const slackSchema = z.object({
            botUserOAuthToken: z.string(),
            channel: z.string(),
            name: z.string().optional(),
            description: z.string().optional(),
            message: z.string(),
        });

        const data = slackSchema.parse(args);
        const { botUserOAuthToken, message, channel } = data;

        try {
            const slack = new WebClient(botUserOAuthToken);

            const result = await slack.chat.postMessage({
                channel: channel,
                text: message,
                blocks: [
                    {
                        type: 'section',
                        text: {
                            type: 'mrkdwn',
                            text: `*New Lead Alert!*\n${message}`
                        }
                    }
                ]
            });

            console.log('Slack message sent:', result.ts);
            
            // FIX: Return success message
            return JSON.stringify({
                success: true,
                timestamp: result.ts,
                channel: result.channel,
                message: `Message sent successfully to ${channel}`
            });
        } catch (error) {
            console.error('Error sending Slack message:', error);
            return `Error executing slack tool: ${error.message}`;
        }
    },
    {
        name: "slack_notifier",
        description: "Sends data to slack",
        schema: z.object({
            botUserOAuthToken: z.string().describe("Bot token of the slack"),
            channel: z.string().describe("The channel of the slack"),
            name: z.string().optional(),
            description: z.string().optional(),
            message: z.string().describe("Message to send to Slack"),
        }),
    }
);

const restApiTool = tool(
    async (args) => {
        const restApiSchema = z.object({
            method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
            url: z.string().url(),
            headers: z.string().optional(),
            body: z.string().optional(),
        });

        const data = restApiSchema.parse(args);
        const { url, method, headers: headersString, body: bodyString } = data;

        try {
            const httpMethod = method || (bodyString ? "POST" : "GET");

            const headers: HeadersInit = { "Content-Type": "application/json" };
            if (headersString) {
                const headersObj = JSON.parse(headersString);
                Object.assign(headers, headersObj);
            }

            let fetchBody = null;
            if (bodyString) {
                fetchBody = bodyString; // Assume it's JSON string
            }

            const response = await fetch(url, {
                method: httpMethod,
                headers: headers,
                body: httpMethod !== "GET" ? fetchBody : null,
            });

            if (response.ok) {
                const contentType = response.headers.get("content-type");
                let result;

                if (contentType && contentType.includes("application/json")) {
                    result = await response.json();
                } else {
                    result = await response.text();
                }

                return JSON.stringify({
                    success: true,
                    status: response.status,
                    data: result
                });
            } else {
                const errorText = await response.text();
                return JSON.stringify({
                    success: false,
                    status: response.status,
                    error: errorText
                });
            }
        } catch (error) {
            return `Error executing REST API: ${error.message}`;
        }
    },
    {
        name: "rest_api",
        description: "Makes an HTTP request to a REST API.",
        schema: z.object({
            method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional().describe("HTTP method."),
            url: z.string().url().describe("The API endpoint URL."),
            headers: z.string().optional().describe("JSON string of request headers."),
            body: z.string().optional().describe("JSON string of request body."),
        }),
    }
);

const discordWebhookTool = tool(
    async (args) => {
        const discordSchema = z.object({
            webhook_url: z.string().url(),
            content: z.string(),
        });

        const data = discordSchema.parse(args);

        try {
            const response = await fetch(data.webhook_url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: data.content }),
            });

            if (response.ok) {
                return JSON.stringify({ success: true, message: 'Discord message sent' });
            } else {
                return `Error: ${response.statusText}`;
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "discord_webhook",
        description: "Sends a message to a Discord channel via webhook.",
        schema: z.object({
            webhook_url: z.string().url().describe("The Discord webhook URL."),
            content: z.string().describe("The message content."),
        }),
    }
);

const graphqlTool = tool(
    async (args) => {
        const graphqlSchema = z.object({
            url: z.string().url(),
            query: z.string(),
            variables: z.string().optional(),
        });

        const data = graphqlSchema.parse(args);

        try {
            const response = await fetch(data.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: data.query,
                    variables: data.variables ? JSON.parse(data.variables) : undefined,
                }),
            });

            const result = await response.json();
            return JSON.stringify(result);
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "graphql",
        description: "Makes a request to a GraphQL API.",
        schema: z.object({
            url: z.string().url().describe("The GraphQL endpoint URL."),
            query: z.string().describe("The GraphQL query."),
            variables: z.string().optional().describe("JSON string of variables."),
        }),
    }
);

const gptPromptTool = tool(
    async (args) => {
        const gptSchema = z.object({
            credential_name: z.string(),
            model: z.string(),
            prompt: z.string(),
        });

        const data = gptSchema.parse(args);

        // Assume credential_name is API key or use env
        const apiKey = data.credential_name || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return "Error: No API key provided";
        }

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: data.model,
                    messages: [{ role: 'user', content: data.prompt }],
                }),
            });

            const result = await response.json();
            if (response.ok) {
                return result.choices[0].message.content;
            } else {
                return `Error: ${result.error.message}`;
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "gpt_prompt",
        description: "Sends a prompt to a GPT model and returns the response.",
        schema: z.object({
            credential_name: z.string().describe("The name of the OpenAI credential."),
            model: z.string().describe("The GPT model to use."),
            prompt: z.string().describe("The prompt to send."),
        }),
    }
);

const dataMappingTool = tool(
    async (args) => {
        const mappingSchema = z.object({
            mapping: z.string(),
            data_in: z.string(),
        });

        const data = mappingSchema.parse(args);
        let mapStr = data.mapping;
        const input = JSON.parse(data.data_in);

        // Replace {{input.data.field}} with actual values
        mapStr = mapStr.replace(/\{\{input\.data\.([^}]+)\}\}/g, (match, path) => {
            const value = path.split('.').reduce((obj, p) => obj?.[p], input);
            return value !== undefined ? String(value) : match;
        });

        const map = JSON.parse(mapStr);

        const output = {};
        for (const [key, value] of Object.entries(map)) {
            output[key] = value;
        }

        return JSON.stringify(output);
    },
    {
        name: "data_mapping",
        description: "Transforms input data using a mapping configuration.",
        schema: z.object({
            mapping: z.string().describe("JSON string of the mapping with {{input.data.field}} placeholders."),
            data_in: z.string().describe("JSON string of input data."),
        }),
    }
);

const smsTool = tool(
    async (args) => {
        const smsSchema = z.object({
            credential_name: z.string(),
            to: z.string(),
            from: z.string(),
            message: z.string(),
        });

        const data = smsSchema.parse(args);

        // Assume credential_name is accountSid:authToken
        const [accountSid, authToken] = data.credential_name.split(':');

        if (!accountSid || !authToken) {
            return "Error: Invalid credential format";
        }

        try {
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    To: data.to,
                    From: data.from,
                    Body: data.message,
                }),
            });

            const result = await response.json();
            if (response.ok) {
                return JSON.stringify({ success: true, sid: result.sid });
            } else {
                return `Error: ${result.error_message}`;
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "sms",
        description: "Sends an SMS message via Twilio.",
        schema: z.object({
            credential_name: z.string().describe("Twilio credential in format accountSid:authToken."),
            to: z.string().describe("Recipient phone number."),
            from: z.string().describe("Sender phone number."),
            message: z.string().describe("SMS message."),
        }),
    }
);

const s3Tool = tool(
    async (args) => {
        const s3Schema = z.object({
            credential_name: z.string().optional(),
            action: z.enum(['upload', 'download', 'delete', 'list']),
            bucket: z.string(),
            key: z.string().optional(),
            content: z.string().optional(),
        });

        const data = s3Schema.parse(args);

        let accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        let secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
        let region = process.env.AWS_REGION || 'us-east-1';

        if (data.credential_name) {
            // Assume credential_name is accessKeyId:secretAccessKey:region
            const [akId, sak, reg] = data.credential_name.split(':');
            if (akId && sak) {
                accessKeyId = akId;
                secretAccessKey = sak;
                if (reg) region = reg;
            }
        }

        if (!accessKeyId || !secretAccessKey) {
            return "Error: AWS credentials not provided. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION env vars or provide credential_name.";
        }

        const s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey,
            },
        });

        try {
            if (data.action === 'upload') {
                if (!data.key || !data.content) {
                    return "Error: Key and content required for upload";
                }
                const command = new PutObjectCommand({
                    Bucket: data.bucket,
                    Key: data.key,
                    Body: data.content,
                });
                await s3Client.send(command);
                return JSON.stringify({ success: true, message: `Uploaded to ${data.bucket}/${data.key}` });
            } else if (data.action === 'download') {
                if (!data.key) {
                    return "Error: Key required for download";
                }
                const command = new GetObjectCommand({
                    Bucket: data.bucket,
                    Key: data.key,
                });
                const response = await s3Client.send(command);
                const body = await response.Body?.transformToString();
                return JSON.stringify({ success: true, content: body });
            } else if (data.action === 'delete') {
                if (!data.key) {
                    return "Error: Key required for delete";
                }
                const command = new DeleteObjectCommand({
                    Bucket: data.bucket,
                    Key: data.key,
                });
                await s3Client.send(command);
                return JSON.stringify({ success: true, message: `Deleted ${data.bucket}/${data.key}` });
            } else if (data.action === 'list') {
                const command = new ListObjectsV2Command({
                    Bucket: data.bucket,
                    Prefix: data.key, // Optional prefix
                });
                const response = await s3Client.send(command);
                const keys = response.Contents?.map(obj => obj.Key) || [];
                return JSON.stringify({ success: true, keys });
            } else {
                return "Error: Invalid action";
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "s3",
        description: "Interacts with S3-compatible storage.",
        schema: z.object({
            credential_name: z.string().optional().describe("AWS credentials in format accessKeyId:secretAccessKey:region (optional if env vars set)."),
            action: z.enum(['upload', 'download', 'delete', 'list']).describe("Action to perform."),
            bucket: z.string().describe("Bucket name."),
            key: z.string().optional().describe("Object key."),
            content: z.string().optional().describe("Content for upload."),
        }),
    }
);

const logTool = tool(
    async (args) => {
        const logSchema = z.object({
            message: z.string(),
        });

        const data = logSchema.parse(args);
        console.log('Workflow Log:', data.message);
        return `Logged: ${data.message}`;
    },
    {
        name: "log",
        description: "Logs a message to the console.",
        schema: z.object({
            message: z.string().describe("Message to log."),
        }),
    }
);

const textClassificationTool = tool(
    async (args) => {
        const classificationSchema = z.object({
            credential_name: z.string(),
            model: z.string(),
            text: z.string(),
            task_instructions: z.string(),
        });

        const data = classificationSchema.parse(args);

        const apiKey = data.credential_name || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return "Error: No API key provided";
        }

        const prompt = `${data.task_instructions}\n\nText: ${data.text}`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: data.model,
                    messages: [{ role: 'user', content: prompt }],
                }),
            });

            const result = await response.json();
            if (response.ok) {
                return result.choices[0].message.content;
            } else {
                return `Error: ${result.error.message}`;
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "text_classification",
        description: "Classifies text using AI based on task instructions.",
        schema: z.object({
            credential_name: z.string().describe("OpenAI credential."),
            model: z.string().describe("Model to use."),
            text: z.string().describe("Text to classify."),
            task_instructions: z.string().describe("Instructions for classification."),
        }),
    }
);

const embeddingsTool = tool(
    async (args) => {
        const embeddingsSchema = z.object({
            model: z.string(),
            text: z.string(),
        });

        const data = embeddingsSchema.parse(args);

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return "Error: No API key provided";
        }

        try {
            const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: data.model,
                    input: data.text,
                }),
            });

            const result = await response.json();
            if (response.ok) {
                return JSON.stringify(result.data[0].embedding);
            } else {
                return `Error: ${result.error.message}`;
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "embeddings",
        description: "Generates embeddings for text using OpenAI.",
        schema: z.object({
            model: z.string().describe("The embedding model to use."),
            text: z.string().describe("The text to embed."),
        }),
    }
);

const javascriptTool = tool(
    async (args) => {
        const jsSchema = z.object({
            script: z.string(),
            context: z.record(z.any(),z.any()).optional(),
        });

        const data = jsSchema.parse(args);

        try {
            // Inject context into the script and wrap in function
            const contextStr = data.context ? `const context = ${JSON.stringify(data.context)};` : '';
            const result = eval(`(function() { ${contextStr} ${data.script} })()`);
            return JSON.stringify(result);
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "javascript",
        description: "Executes JavaScript code with access to context.",
        schema: z.object({
            script: z.string().describe("The JavaScript code to execute."),
            context: z.record(z.any(),z.any()).optional().describe("Context object for the script."),
        }),
    }
);

const jsonParserTool = tool(
    async (args) => {
        const parserSchema = z.object({
            json_string: z.string(),
        });

        const data = parserSchema.parse(args);

        try {
            const parsed = JSON.parse(data.json_string);
            return JSON.stringify(parsed);
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "json_parser",
        description: "Parses a JSON string into a JSON object.",
        schema: z.object({
            json_string: z.string().describe("The JSON string to parse."),
        }),
    }
);

const shopifyTool = tool(
    async (args) => {
        const shopifySchema = z.object({
            credential_name: z.string(),
            shop: z.string(),
            action: z.enum(['get_product', 'create_product', 'update_product', 'delete_product']),
            product_id: z.string().optional(),
            product_data: z.string().optional(),
        });

        const data = shopifySchema.parse(args);

        const accessToken = data.credential_name;
        const shop = data.shop;
        const action = data.action;

        const baseUrl = `https://${shop}.myshopify.com/admin/api/2023-10`;

        try {
            let url = `${baseUrl}/products`;
            let method = 'GET';
            let body = null;

            if (action === 'get_product' && data.product_id) {
                url = `${baseUrl}/products/${data.product_id}.json`;
            } else if (action === 'create_product' && data.product_data) {
                method = 'POST';
                body = data.product_data;
            } else if (action === 'update_product' && data.product_id && data.product_data) {
                url = `${baseUrl}/products/${data.product_id}.json`;
                method = 'PUT';
                body = data.product_data;
            } else if (action === 'delete_product' && data.product_id) {
                url = `${baseUrl}/products/${data.product_id}.json`;
                method = 'DELETE';
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'X-Shopify-Access-Token': accessToken,
                    'Content-Type': 'application/json',
                },
                body: method !== 'GET' ? body : null,
            });

            const result = await response.json();
            return JSON.stringify(result);
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "shopify",
        description: "Interacts with Shopify API for product management.",
        schema: z.object({
            credential_name: z.string().describe("Shopify access token."),
            shop: z.string().describe("Shop name."),
            action: z.enum(['get_product', 'create_product', 'update_product', 'delete_product']).describe("Action to perform."),
            product_id: z.string().optional().describe("Product ID for actions."),
            product_data: z.string().optional().describe("Product data JSON for create/update."),
        }),
    }
);

const airtableTool = tool(
    async (args) => {
        const airtableSchema = z.object({
            credential_name: z.string(),
            base_id: z.string().optional(),
            table_name: z.string().optional(),
            action: z.enum(['list_records', 'create_record', 'get_record', 'update_record', 'delete_record']),
            record_id: z.string().optional(),
            payload: z.string().optional(),
        });

        const data = airtableSchema.parse(args);

        const apiKey = data.credential_name;
        const baseId = data.base_id || 'appXXXXXXXXXXXXXX'; // Default if not provided
        const tableName = data.table_name || 'Table 1'; // Default if not provided
        const action = data.action;

        const baseUrl = `https://api.airtable.com/v0/${baseId}/${tableName}`;

        try {
            let url = baseUrl;
            let method = 'GET';
            let body = null;

            if (action === 'get_record' && data.record_id) {
                url = `${baseUrl}/${data.record_id}`;
            } else if (action === 'create_record' && data.payload) {
                method = 'POST';
                let body = data.payload;
                if (data.payload.startsWith('{{') && data.payload.endsWith('}}')) {
                    const code = data.payload.slice(2, -2);
                    body = eval(code);
                } else {
                    body = JSON.parse(data.payload);
                }
            } else if (action === 'update_record' && data.record_id && data.payload) {
                url = `${baseUrl}/${data.record_id}`;
                method = 'PATCH';
                let body = data.payload;
                if (data.payload.startsWith('{{') && data.payload.endsWith('}}')) {
                    const code = data.payload.slice(2, -2);
                    body = eval(code);
                } else {
                    body = JSON.parse(data.payload);
                }
            } else if (action === 'delete_record' && data.record_id) {
                url = `${baseUrl}/${data.record_id}`;
                method = 'DELETE';
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: method !== 'GET' ? body : null,
            });

            const result = await response.json();
            return JSON.stringify(result);
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "airtable",
        description: "Interacts with Airtable API for record management.",
        schema: z.object({
            credential_name: z.string().describe("Airtable API key."),
            base_id: z.string().describe("Airtable base ID."),
            table_name: z.string().describe("Table name."),
            action: z.enum(['list_records', 'create_record', 'get_record', 'update_record', 'delete_record']).describe("Action to perform."),
            record_id: z.string().optional().describe("Record ID for actions."),
            payload: z.string().optional().describe("Payload JSON for create/update."),
        }),
    }
);

const sqlTool = tool(
    async (args) => {
        const sqlSchema = z.object({
            connection_ref: z.string(),
            query: z.string(),
        });

        const data = sqlSchema.parse(args);

        // Assume connection_ref is table name, and query is SELECT statement
        const table = data.connection_ref;
        const query = data.query;

        // For security, only allow SELECT
        if (!query.toUpperCase().startsWith('SELECT')) {
            return "Error: Only SELECT queries are allowed.";
        }

        try {
            const { data: result, error } = await supabase.from(table).select(query.replace('SELECT ', '').replace(`FROM ${table}`, ''));

            if (error) {
                return `Error: ${error.message}`;
            }

            return JSON.stringify(result);
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "sql",
        description: "Executes a SELECT SQL query against the database.",
        schema: z.object({
            connection_ref: z.string().describe("Table name."),
            query: z.string().describe("SELECT query."),
        }),
    }
);

const hubspotTool = tool(
    async (args) => {
        const hubspotSchema = z.object({
            credential_name: z.string(),
            action: z.enum(['create_contact', 'get_contact_by_email', 'update_contact', 'delete_contact']),
            contact_id: z.string().optional(),
            payload: z.string().optional(),
        });

        const data = hubspotSchema.parse(args);

        const apiKey = data.credential_name;
        const action = data.action;

        const baseUrl = 'https://api.hubapi.com/crm/v3/objects/contacts';

        try {
            let url = baseUrl;
            let method = 'GET';
            let body = null;

            if (action === 'get_contact_by_email') {
                url = `${baseUrl}/search`;
                method = 'POST';
                body = JSON.stringify({ filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: data.contact_id }] }] });
            } else if (action === 'create_contact' && data.payload) {
                method = 'POST';
                body = data.payload;
            } else if (action === 'update_contact' && data.contact_id && data.payload) {
                url = `${baseUrl}/${data.contact_id}`;
                method = 'PATCH';
                body = data.payload;
            } else if (action === 'delete_contact' && data.contact_id) {
                url = `${baseUrl}/${data.contact_id}`;
                method = 'DELETE';
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: method !== 'GET' ? body : null,
            });

            const result = await response.json();
            return JSON.stringify(result);
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "hubspot",
        description: "Interacts with HubSpot API for contact management.",
        schema: z.object({
            credential_name: z.string().describe("HubSpot API key."),
            action: z.enum(['create_contact', 'get_contact_by_email', 'update_contact', 'delete_contact']).describe("Action to perform."),
            contact_id: z.string().optional().describe("Contact ID or email for actions."),
            payload: z.string().optional().describe("Payload JSON for create/update."),
        }),
    }
);

const csvProcessingTool = tool(
    async (args) => {
        const csvSchema = z.object({
            action: z.enum(['csv_to_json', 'json_to_csv']),
            data: z.string(),
            delimiter: z.string().optional(),
        });

        const data = csvSchema.parse(args);
        const delimiter = data.delimiter || ',';

        try {
            if (data.action === 'csv_to_json') {
                const lines = data.data.trim().split('\n');
                if (lines.length < 2) return JSON.stringify([]);

                const headers = lines[0].split(delimiter).map(h => h.trim());
                const rows = lines.slice(1).map(line => {
                    const values = line.split(delimiter).map(v => v.trim());
                    const obj: Record<string, string> = {};
                    headers.forEach((h, i) => obj[h] = values[i] || '');
                    return obj;
                });
                return JSON.stringify(rows);
            } else if (data.action === 'json_to_csv') {
                const jsonArray = JSON.parse(data.data);
                if (!Array.isArray(jsonArray) || jsonArray.length === 0) return '';

                const headers = Object.keys(jsonArray[0]);
                const csvLines = [headers.join(delimiter)];

                jsonArray.forEach(row => {
                    const values = headers.map(h => row[h] || '');
                    csvLines.push(values.join(delimiter));
                });

                return csvLines.join('\n');
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "csv_processing",
        description: "Converts between CSV and JSON formats.",
        schema: z.object({
            action: z.enum(['csv_to_json', 'json_to_csv']).describe("Conversion action."),
            data: z.string().describe("Input data (CSV string or JSON string)."),
            delimiter: z.string().optional().describe("Delimiter for CSV."),
        }),
    }
);

const jsonXmlTool = tool(
    async (args) => {
        const xmlSchema = z.object({
            action: z.enum(['json_to_xml', 'xml_to_json']),
            data: z.string(),
        });

        const data = xmlSchema.parse(args);

        try {
            if (data.action === 'json_to_xml') {
                const obj = JSON.parse(data.data);
                const builder = new Builder();
                const xml = builder.buildObject(obj);
                return xml;
            } else if (data.action === 'xml_to_json') {
                const result = await parseStringPromise(data.data);
                return JSON.stringify(result);
            }
        } catch (error) {
            return `Error: ${error.message}`;
        }
    },
    {
        name: "json_xml",
        description: "Converts between JSON and XML formats.",
        schema: z.object({
            action: z.enum(['json_to_xml', 'xml_to_json']).describe("Conversion action."),
            data: z.string().describe("Input data (JSON string or XML string)."),
        }),
    }
);

const apiKeyAuthTool = tool(
    async (args) => {
        const authSchema = z.object({
            credential_name: z.string(),
            key_name: z.string(),
            add_to: z.string(),
        });

        const data = authSchema.parse(args);

        if (data.add_to === 'header') {
            return JSON.stringify({ [data.key_name]: data.credential_name });
        }

        return "Only header supported";
    },
    {
        name: "api_key_auth",
        description: "Adds API key to headers for authentication.",
        schema: z.object({
            credential_name: z.string().describe("API key value."),
            key_name: z.string().describe("Header name."),
            add_to: z.string().describe("Where to add (header)."),
        }),
    }
);

export const toolsAI = [restApiTool, emailTool, slackTool, discordWebhookTool, graphqlTool, gptPromptTool, dataMappingTool, smsTool, s3Tool, logTool, textClassificationTool, embeddingsTool, javascriptTool, jsonParserTool, shopifyTool, airtableTool, sqlTool, hubspotTool, csvProcessingTool, jsonXmlTool, apiKeyAuthTool];
