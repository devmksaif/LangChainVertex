# Hard Workflow Prompts

## Prompt 1: Multi-Branch Workflow with AI and Notifications
Create a complex workflow that starts with a webhook, uses AI to classify the message sentiment (positive/negative), then branches: if positive, sends a Slack message and emails the user; if negative, logs the issue, waits 10 seconds, and posts to Discord. Include parallel execution for notifications.

## Prompt 2: Data Processing Pipeline with Error Handling
Build a workflow that fetches data from an API, processes it with CSV transformation, maps fields, checks if a value is greater than 100, and if so, stores in S3 and sends an SMS; otherwise, retries the API call. Include try-catch for errors.

## Prompt 3: Advanced Logic with Loops and External Services
Design a workflow that triggers manually, loops through a list of items from a database query, for each item performs a GraphQL mutation, checks the response, and if successful, updates Airtable; if failed, sends a HubSpot contact update. Use parallel processing for efficiency.
