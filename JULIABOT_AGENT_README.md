# Enhanced JuliaBot LangChain Implementation

This implementation provides a powerful integration between JuliaBot and LangChain, enabling advanced AI agent capabilities with tool execution support.

## Features

🤖 **Enhanced JuliaBot LLM**: Custom LangChain-compatible implementation of JuliaBot
🔧 **Tool Integration**: Automatic tool detection and execution for common tasks
📋 **Workflow Generation**: AI-powered workflow creation and editing
🚀 **Agent Capabilities**: Full LangChain agent support with ReAct pattern
🔄 **Fallback Support**: Graceful degradation when advanced features aren't available

## Architecture

### Core Components

1. **JuliaBotAgentLLM**: Base LLM implementation for JuliaBot API
2. **JuliaBotWithTools**: Enhanced version with automatic tool execution
3. **JuliaBotAgentCreator**: Main orchestrator for creating and managing agents
4. **EnhancedJuliaBotChatModel**: Backward-compatible model for existing code

### Tool Capabilities

The enhanced JuliaBot can automatically detect and execute tools for:

- **Email Sending**: Detects email configuration JSON and executes send_email tool
- **Slack Notifications**: Processes Slack webhook requests automatically  
- **REST API Calls**: Handles HTTP requests with proper configuration
- **Data Processing**: JSON/XML conversion, CSV processing, etc.
- **File Operations**: S3 uploads/downloads, data transformations

## Usage Examples

### Basic Setup

```typescript
import { JuliaBotAgentCreator } from './src/langchain_functions/juliabot-agent';

const creator = new JuliaBotAgentCreator(
  'https://core.juliabot.com/api/v1/bot/JuliabotChat/',
  'your_bearer_token',
  true // Enable tools
);
```

### Simple Conversation

```typescript
const result = await creator.executePrompt("Hello! How can you help me?");
console.log(result.output);
```

### Email Sending

```typescript
const emailPrompt = `Send an email {
  "type": "send_email",
  "config": {
    "to": "user@example.com",
    "subject": "Test Email",
    "body": "Hello from JuliaBot!",
    "from": "support@resend.dev",
    "apiKey": "your_resend_key"
  }
}`;

const result = await creator.executePrompt(emailPrompt);
```

### Workflow Generation

```typescript
const workflowPrompt = `Create a workflow that:
1. Receives a webhook
2. Processes the data
3. Sends notifications
4. Stores results`;

const result = await creator.executePrompt(workflowPrompt);
```

### LangChain Integration

```typescript
import { ChatPromptTemplate } from "@langchain/core/prompts";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant."],
  ["human", "{input}"]
]);

const result = await creator.executeChain(prompt, { input: "Hello!" });
```

## Controller Integration

### Workflow Generator

The workflow generator now uses the enhanced JuliaBot agent:

```typescript
// Enhanced agent with tool capabilities
const agentCreator = new JuliaBotAgentCreator(
  `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`,
  bearerToken,
  true
);

const workflowPrompt = `Generate a workflow based on: ${message}
Available Node Types: ${JSON.stringify(nodeTypesDefinition)}`;

const agentResult = await agentCreator.executePrompt(workflowPrompt);
```

### Workflow Editor

Similar enhancement for editing workflows:

```typescript
const editPromptText = `Modify the workflow according to: ${message}
Existing workflow: ${JSON.stringify(workflow)}
Available node types: ${JSON.stringify(nodeTypesDefinition)}`;

const agentResult = await agentCreator.executePrompt(editPromptText);
```

### AI Chat

Enhanced conversational capabilities with tool access:

```typescript
const conversationContext = messages.map(msg => 
  `${msg.role}: ${msg.content}`
).join('\\n');

const fullPrompt = `${systemPrompt}\\n\\nConversation:\\n${conversationContext}`;
const agentResult = await agentCreator.executePrompt(fullPrompt);
```

## Configuration

### Environment Variables

```bash
# JuliaBot API Configuration
PUBLIC_JULIA_BOT_API=https://core.juliabot.com

# Tool API Keys (optional)
RESEND_API_KEY=your_resend_key
OPENAI_API_KEY=your_openai_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
```

### Credential Format

Store JuliaBot credentials in your database:

```json
{
  "pb_Token": "bearer_token",
  "rf_Token": "refresh_token", 
  "csrfToken": "csrf_token"
}
```

## Error Handling

The implementation includes robust error handling:

1. **Agent Fallback**: Falls back to basic model if agent creation fails
2. **Tool Error Recovery**: Continues execution even if individual tools fail
3. **API Error Handling**: Proper error messages for API failures
4. **Graceful Degradation**: Works even without advanced LangChain packages

## Testing

Run the test suite to verify functionality:

```bash
npm test tests/juliabot-agent.test.ts
```

Test cases include:
- Basic JuliaBot conversation
- Tool execution capabilities
- Workflow generation
- Full agent functionality
- Error scenarios

## Performance Considerations

- **Tool Detection**: Uses regex patterns for fast tool detection
- **Caching**: Reuses agent instances when possible
- **Timeout Handling**: Implements reasonable timeouts for API calls
- **Memory Management**: Properly disposes of large response objects

## Security

- **Token Validation**: Validates bearer tokens before use
- **Input Sanitization**: Sanitizes prompts to prevent injection
- **Error Masking**: Doesn't expose sensitive information in errors
- **Rate Limiting**: Respects API rate limits

## Future Enhancements

- [ ] Support for custom tool registration
- [ ] Advanced prompt engineering templates
- [ ] Conversation memory and context persistence
- [ ] Multi-modal capabilities (images, files)
- [ ] Performance monitoring and analytics
- [ ] Plugin system for extensibility

## Troubleshooting

### Common Issues

1. **"Missing JuliaBot bearer token"**
   - Ensure token is properly stored in credentials
   - Check token expiration

2. **"Agent execution failed"** 
   - Verify LangChain packages are installed
   - Check API connectivity

3. **"Tool execution error"**
   - Validate tool configuration JSON
   - Check required API keys

### Debug Mode

Enable verbose logging:

```typescript
process.env.NODE_ENV = 'development';
const creator = new JuliaBotAgentCreator(apiURL, token, true);
```

## Support

For issues and questions:
- Check the test files for usage examples
- Review error messages for specific guidance
- Ensure all dependencies are properly installed

---

This enhanced implementation bridges the gap between JuliaBot's powerful AI capabilities and LangChain's robust agent framework, providing a seamless experience for building intelligent applications.