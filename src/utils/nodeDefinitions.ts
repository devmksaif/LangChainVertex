import type { NodeData } from './types';

export type NodeType = 'manual_trigger' | 'webhook_trigger' | 'if_else' | 'switch' | 'email' | 'rest_api' | 'delay' | 'log' | 'slack' | 'data_mapping' | 'javascript' | 'gpt_prompt' | 's3' | 'try_catch' | 'parallel' | 'schedule' | 'graphql' | 'text_classification' | 'sql' | 'api_key_auth' | 'csv_processing' | 'discord_webhook' | 'json_xml' | 'embeddings' | 'sms' | 'shopify' | 'json_parser' | 'airtable' | 'hubspot';

export const nodeTypesDefinition: Record<NodeType, {
  type: NodeType;
  label: string;
  data: Partial<NodeData>;
}> = {
  manual_trigger: {
    type: 'manual_trigger',
    label: 'Manual Trigger',
    data: {
      label: 'Manual Trigger',
      inputs: [],
      outputs: [{ id: 'output', label: 'Start', type: 'execution' }],
      parameters: {
        payload: '{ "message": "Hello World" }',
      },
    },
  },
  webhook_trigger: {
    type: 'webhook_trigger',
    label: 'Webhook Trigger',
    data: {
      label: 'Webhook Trigger',
      inputs: [],
      outputs: [
        { id: 'output_exec', label: 'Run', type: 'execution' },
        { id: 'output_data', label: 'Data', type: 'data' },
      ],
      parameters: {
        webhook_url: 'Generated on creation',
        response_body: '{ "status": "received" }',
      },
    },
  },
  schedule: {
    type: 'schedule',
    label: 'Schedule',
    data: {
      label: 'Schedule Trigger',
      inputs: [],
      outputs: [{ id: 'output', label: 'Run', type: 'execution' }],
      parameters: {
        mode: 'basic',
        frequency: 'daily',
        minute: '0',
        hour: '9',
        dayOfWeek: '1',
        dayOfMonth: '1',
        cron: '0 9 * * *',
      },
    },
  },
  if_else: {
    type: 'if_else',
    label: 'If/Else',
    data: {
      label: 'If/Else Condition',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'Data', type: 'data' },
      ],
      outputs: [
        { id: 'true', label: 'True', type: 'execution' },
        { id: 'false', label: 'False', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        field: 'message',
        operator: '==',
        value: 'Hello World',
      },
    },
  },
  switch: {
    type: 'switch',
    label: 'Switch',
    data: {
      label: 'Switch',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'Data', type: 'data' },
      ],
      outputs: [
        { id: 'case1', label: 'Case 1', type: 'execution' },
        { id: 'case2', label: 'Case 2', type: 'execution' },
        { id: 'default', label: 'Default', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        switch_on: '{{input.value}}',
        case1_value: 'value1',
        case2_value: 'value2',
      },
    },
  },
  try_catch: {
    type: 'try_catch',
    label: 'Try / Catch',
    data: {
      label: 'Try / Catch',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'try', label: 'Try', type: 'execution' },
        { id: 'catch', label: 'Catch', type: 'execution' },
      ],
      parameters: {},
    },
  },
  parallel: {
    type: 'parallel',
    label: 'Parallel',
    data: {
      label: 'Parallel',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'Data', type: 'data' },
      ],
      outputs: [
        { id: 'path1', label: 'Path 1', type: 'execution' },
        { id: 'path2', label: 'Path 2', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {},
    },
  },
  delay: {
    type: 'delay',
    label: 'Delay',
    data: {
      label: 'Delay',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [{ id: 'output', label: 'Output', type: 'execution' }],
      parameters: {
        duration: '5s',
      },
    },
  },
  email: {
    type: 'email',
    label: 'Send Email',
    data: {
      label: 'Send Email',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [{ id: 'output', label: 'Output', type: 'execution' }],
      parameters: {
        credential_name: 'My Resend Key',
        from: 'onboarding@resend.dev',
        to: 'test@example.com',
        subject: 'Workflow Notification',
        body: 'This is a message from your workflow.',
      },
    },
  },
  slack: {
    type: 'slack',
    label: 'Slack Message',
    data: {
      label: 'Send Slack Message',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [{ id: 'output', label: 'Output', type: 'execution' }],
      parameters: {
        webhook_url: 'https://hooks.slack.com/services/...',
        channel: '#general',
        text: 'A message from your workflow!',
      },
    },
  },
  discord_webhook: {
    type: 'discord_webhook',
    label: 'Discord Webhook',
    data: {
      label: 'Send Discord Message',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [{ id: 'output', label: 'Output', type: 'execution' }],
      parameters: {
        webhook_url: 'https://discord.com/api/webhooks/...',
        content: 'A message from your workflow!',
      },
    },
  },
  rest_api: {
    type: 'rest_api',
    label: 'REST API',
    data: {
      label: 'REST API Call',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'output_exec', label: 'Success', type: 'execution' },
        { id: 'output_data', label: 'Data', type: 'data' },
        { id: 'output_error', label: 'Error', type: 'execution' },
      ],
      parameters: {
        method: 'GET',
        url: 'https://api.example.com/data',
        headers: '{\n  "Content-Type": "application/json"\n}',
        body: '{\n  "key": "value"\n}',
      },
    },
  },
  graphql: {
    type: 'graphql',
    label: 'GraphQL',
    data: {
      label: 'GraphQL Request',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'output_exec', label: 'Success', type: 'execution' },
        { id: 'output_data', label: 'Data', type: 'data' },
      ],
      parameters: {
        url: 'https://api.example.com/graphql',
        query: '{\n  users { id, name }\n}',
        variables: '{}',
      },
    },
  },
  s3: {
    type: 's3',
    label: 'S3 Storage',
    data: {
      label: 'S3 Storage',
      inputs: [{ id: 'input_exec', label: 'Execute', type: 'execution' }],
      outputs: [
        { id: 'output_exec', label: 'Success', type: 'execution' },
        { id: 'output_data', label: 'Data', type: 'data' },
        { id: 'output_error', label: 'Error', type: 'execution' },
      ],
      parameters: {
        action: 'upload',
        bucket: 'my-s3-bucket',
        key: 'path/to/file.txt',
        content: '{{input.data}}',
      },
    },
  },
  sql: {
    type: 'sql',
    label: 'SQL Query',
    data: {
      label: 'SQL Query',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'output_exec', label: 'Success', type: 'execution' },
        { id: 'output_data', label: 'Data', type: 'data' },
      ],
      parameters: {
        connection_ref: 'my-db-connection',
        query: 'SELECT * FROM users WHERE id = ?',
      },
    },
  },
  sms: {
    type: 'sms',
    label: 'Send SMS',
    data: {
      label: 'Send SMS',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [{ id: 'output', label: 'Output', type: 'execution' }],
      parameters: {
        credential_name: 'My Twilio Key',
        to: '+15551234567',
        from: '+15557654321',
        message: 'Hello from your workflow!',
      },
    },
  },
  shopify: {
    type: 'shopify',
    label: 'Shopify',
    data: {
      label: 'Shopify Action',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'output_exec', label: 'Success', type: 'execution' },
        { id: 'output_data', label: 'Data', type: 'data' },
      ],
      parameters: {
        credential_name: 'My Shopify Store',
        shop: 'my-shop.myshopify.com',
        action: 'get_product',
        product_id: '123456789',
      },
    },
  },
  airtable: {
    type: 'airtable',
    label: 'Airtable',
    data: {
      label: 'Airtable Action',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'output_exec', label: 'Success', type: 'execution' },
        { id: 'output_data', label: 'Data', type: 'data' },
        { id: 'output_error', label: 'Error', type: 'execution' },
      ],
      parameters: {
        credential_name: 'My Airtable Key',
        base_id: 'appXXXXXXXXXXXXXX',
        table_name: 'My Table',
        action: 'list_records',
        record_id: '',
        payload: '{\n  "fields": {\n    "Name": "New Record"\n  }\n}',
      },
    },
  },
  hubspot: {
    type: 'hubspot',
    label: 'HubSpot',
    data: {
      label: 'HubSpot Action',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'output_exec', label: 'Success', type: 'execution' },
        { id: 'output_data', label: 'Data', type: 'data' },
        { id: 'output_error', label: 'Error', type: 'execution' },
      ],
      parameters: {
        credential_name: 'My HubSpot Key',
        action: 'create_contact',
        contact_id: '',
        payload: '{\n  "properties": {\n    "email": "{{input.data.email}}",\n    "firstname": "{{input.data.firstName}}",\n    "lastname": "{{input.data.lastName}}"\n  }\n}',
      },
    },
  },
  data_mapping: {
    type: 'data_mapping',
    label: 'Data Mapping',
    data: {
      label: 'Data Mapping',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'Data', type: 'data' },
      ],
      outputs: [
        { id: 'exec_out', label: 'Execute', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        mapping: '{\n  "new_key": "old_key"\n}',
      },
    },
  },
  csv_processing: {
    type: 'csv_processing',
    label: 'CSV Processing',
    data: {
      label: 'CSV Processing',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'Data', type: 'data' },
      ],
      outputs: [
        { id: 'exec_out', label: 'Execute', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        action: 'csv_to_json',
        delimiter: ',',
      },
    },
  },
  json_xml: {
    type: 'json_xml',
    label: 'JSON <> XML',
    data: {
      label: 'JSON <> XML Transform',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'Data', type: 'data' },
      ],
      outputs: [
        { id: 'exec_out', label: 'Execute', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        action: 'json_to_xml',
      },
    },
  },
  json_parser: {
    type: 'json_parser',
    label: 'JSON Parser',
    data: {
      label: 'JSON Parser',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'JSON String', type: 'data' },
      ],
      outputs: [
        { id: 'exec_out', label: 'Execute', type: 'execution' },
        { id: 'data_out', label: 'Parsed JSON', type: 'data' },
      ],
      parameters: {
        json_string: '{{data_in}}',
      },
    },
  },
  gpt_prompt: {
    type: 'gpt_prompt',
    label: 'GPT Prompt',
    data: {
      label: 'GPT Prompt',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'exec_out', label: 'Continue', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        credential_name: 'My OpenAI Key',
        model: 'gpt-3.5-turbo',
        prompt: 'Summarize the following text: {{input.text}}',
      },
    },
  },
  text_classification: {
    type: 'text_classification',
    label: 'Text Classification',
    data: {
      label: 'Text Classification',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'exec_out', label: 'Continue', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        credential_name: 'My OpenAI Key',
        model: 'gpt-3.5-turbo',
        text: '{{input.text}}',
        task_instructions: 'Classify the text as "positive", "negative", or "neutral". Return a single JSON object with the key "sentiment".'
      },
    },
  },
  embeddings: {
    type: 'embeddings',
    label: 'Create Embeddings',
    data: {
      label: 'Create Embeddings',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [
        { id: 'exec_out', label: 'Continue', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        model: 'text-embedding-ada-002',
        text: '{{input.text}}',
      },
    },
  },
  javascript: {
    type: 'javascript',
    label: 'Javascript',
    data: {
      label: 'Run Javascript',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'Data', type: 'data' },
      ],
      outputs: [
        { id: 'exec_out', label: 'Execute', type: 'execution' },
        { id: 'data_out', label: 'Data', type: 'data' },
      ],
      parameters: {
        script: '// Access context data like: context[\'node-id\'].property\nconst message = context[\'start-1\']?.message || "default";\nreturn { ...context, processed_message: `JS says: ${message}` };',
      },
    },
  },
  log: {
    type: 'log',
    label: 'Console Log',
    data: {
      label: 'Console Log',
      inputs: [
        { id: 'exec_in', label: 'Execute', type: 'execution' },
        { id: 'data_in', label: 'Data', type: 'data' },
      ],
      outputs: [{ id: 'exec_out', label: 'Continue', type: 'execution' }],
      parameters: {
        message: 'Logging data: {{input.data}}',
      },
    },
  },
  api_key_auth: {
    type: 'api_key_auth',
    label: 'API Key Auth',
    data: {
      label: 'API Key Auth',
      inputs: [{ id: 'input', label: 'Input', type: 'execution' }],
      outputs: [{ id: 'output', label: 'Output', type: 'execution' }],
      parameters: {
        credential_name: 'my-api-key-credential',
        key_name: 'X-API-KEY',
        add_to: 'header',
      },
    },
  },
};
