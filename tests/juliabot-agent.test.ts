import { JuliaBotAgentCreator, executeJuliaBotAgent } from '../src/langchain_functions/juliabot-agent';
import { PUBLIC_JULIA_BOT_API } from '../src/constants';

// Test configuration
const TEST_API_URL = `${PUBLIC_JULIA_BOT_API}/api/v1/bot/JuliabotChat/`;
const TEST_TOKEN = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzYwOTc5NDM5LCJpYXQiOjE3NTk2ODM0MzksImp0aSI6IjIzMTQzYTgwMmUzYjQ5YTM4OTRkNTQyNDI0OWQzYTc0IiwidXNlcl9pZCI6ImQ0OTJhMTg1LWQ3YjAtNDU0Zi1iNGFmLTY5OWRjMzczMmZkNSJ9.PV1Dxndvlz_Y_adJ14f1DxP0WXU6VA5YVd7MTBscIjA`;

async function testBasicJuliaBot() {
  console.log('🤖 Testing Basic JuliaBot LLM...');
  
  try {
    const creator = new JuliaBotAgentCreator(TEST_API_URL, TEST_TOKEN, false);
    const result = await creator.executePrompt("Hello! How are you today?");
    
    console.log('✅ Basic JuliaBot Response:', result);
  } catch (error: any) {
    console.error('❌ Basic JuliaBot Error:', error?.message || String(error));
  }
}

async function testJuliaBotWithTools() {
  console.log('\n🔧 Testing JuliaBot with Tools...');
  
  try {
    const creator = new JuliaBotAgentCreator(TEST_API_URL, TEST_TOKEN, true);
    
    // Test email sending capability
    const emailPrompt = `Send an email with the following configuration:
    {
      "type": "send_email",
      "config": {
        "to": "test@example.com",
        "body": "This is a test email from JuliaBot agent",
        "from": "support@resend.dev",
        "subject": "Test Email from JuliaBot Agent",
        "apiKey": "test_key"
      }
    }`;
    
    const result = await creator.executePrompt(emailPrompt);
    console.log('✅ JuliaBot with Tools Response:', result);
  } catch (error: any) {
    console.error('❌ JuliaBot with Tools Error:', error?.message || String(error));
  }
}

async function testWorkflowGeneration() {
  console.log('\n📋 Testing Workflow Generation...');
  
  try {
    const creator = new JuliaBotAgentCreator(TEST_API_URL, TEST_TOKEN, true);
    
    const workflowPrompt = `Generate a workflow that:
    1. Receives an email notification
    2. Extracts important information 
    3. Sends a Slack notification
    4. Stores data in a database
    
    Please create a JSON workflow structure with nodes and edges.`;
    
    const result = await creator.executePrompt(workflowPrompt);
    console.log('✅ Workflow Generation Response:', result);
  } catch (error: any) {
    console.error('❌ Workflow Generation Error:', error?.message || String(error));
  }
}

async function testFullAgent() {
  console.log('\n🚀 Testing Full Agent Implementation...');
  
  try {
    const creator = new JuliaBotAgentCreator(TEST_API_URL, TEST_TOKEN, true);
    
    // Test if full agent is available
    try {
      const agent = await creator.createFullAgent();
      console.log('✅ Full Agent created successfully');
      
      const result = await creator.executePrompt("What tools are available to me?");
      console.log('✅ Full Agent Response:', result);
    } catch (agentError: any) {
      console.log('⚠️ Full Agent not available, using simplified approach');
      console.log('Agent Error:', agentError?.message || String(agentError));
      
      // Test simplified approach
      const result = await creator.executePrompt("What can you help me with?");
      console.log('✅ Simplified Agent Response:', result);
    }
  } catch (error: any) {
    console.error('❌ Full Agent Test Error:', error?.message || String(error));
  }
}

async function runAllTests() {
  console.log('🧪 Starting JuliaBot Agent Tests...\n');
  
  await testBasicJuliaBot();
  await testJuliaBotWithTools();
  await testWorkflowGeneration();
  await testFullAgent();
  
  console.log('\n✨ All tests completed!');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export {
  testBasicJuliaBot,
  testJuliaBotWithTools,
  testWorkflowGeneration,
  testFullAgent,
  runAllTests
};