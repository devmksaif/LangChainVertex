# Medium Workflow Prompts

## Prompt 1: Conditional Email with Delay
Create a workflow that triggers on a webhook, checks if the payload status is "active", and if so, waits 5 seconds then sends an email with the payload data.

## Prompt 2: Data Mapping and Slack Notification
Build a workflow that receives JSON data via webhook, maps the "name" field to "user_name", and posts a message to Slack saying "New user: {user_name}".

## Prompt 3: API Response Processing
Design a workflow that calls a REST API to get user data, parses the JSON response, and logs the user's email if it exists.
