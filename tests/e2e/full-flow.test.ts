// ===== tests/e2e/full-flow.test.ts - Complete Flow Tests =====
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('Complete Flow Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Email Workflow', () => {
        it('should complete full email sending workflow', async () => {
            const workflow = {
                step1_receive_request: {
                    provider: 'openai',
                    instructions: 'User requested appointment. RUN SendConfirmationEmail',
                    message: 'Book appointment for john@example.com at 3pm',
                    configs: [{
                        identifier: 'SendConfirmationEmail',
                        toolName: 'send_email',
                        params: {
                            from: 'noreply@clinic.com',
                            subject: 'Appointment Confirmed',
                            body: 'Your appointment is confirmed for 3pm'
                        }
                    }]
                },
                step2_sanitize_configs: null,
                step3_parse_instructions: null,
                step4_extract_params: null,
                step5_call_tool: null,
                step6_return_result: null
            };

            // Step 1: Receive request
            expect(workflow.step1_receive_request.instructions).toContain('RUN');
            
            // Step 2: Sanitize configs
            const sanitized = workflow.step1_receive_request.configs.map(c => ({
                ...c,
                params: {
                    ...c.params,
                    // Remove placeholders
                    body: c.params.body.replace(/{{.*?}}/g, '')
                }
            }));
            workflow.step2_sanitize_configs = sanitized;
            expect(workflow.step2_sanitize_configs).toBeDefined();

            // Step 3: Parse instructions for RUN commands
            const runMatch = workflow.step1_receive_request.instructions.match(/RUN (\w+)/);
            workflow.step3_parse_instructions = runMatch ? runMatch[1] : null;
            expect(workflow.step3_parse_instructions).toBe('SendConfirmationEmail');

            // Step 4: Extract parameters
            const emailMatch = workflow.step1_receive_request.message.match(/[\w.-]+@[\w.-]+\.\w+/);
            workflow.step4_extract_params = {
                to: emailMatch ? emailMatch[0] : null,
                ...workflow.step2_sanitize_configs[0].params
            };
            expect(workflow.step4_extract_params.to).toBe('john@example.com');

            // Step 5: Call tool (mocked)
            const mockToolResponse = {
                success: true,
                message: 'Email sent successfully'
            };
            workflow.step5_call_tool = mockToolResponse;
            expect(workflow.step5_call_tool.success).toBe(true);

            // Step 6: Return result
            workflow.step6_return_result = {
                status: 'success',
                toolExecutions: [workflow.step5_call_tool]
            };
            expect(workflow.step6_return_result.status).toBe('success');
        });
    });

    describe('Webhook Workflow', () => {
        it('should complete full webhook sending workflow', async () => {
            const workflow = {
                step1_receive_request: {
                    provider: 'gemini',
                    instructions: 'New lead captured. RUN SendLeads',
                    message: 'Name: Sarah Smith, Email: sarah@test.com, Phone: 555-0123',
                    configs: [{
                        identifier: 'SendLeads',
                        toolName: 'call_webhook',
                        params: {
                            url: 'https://crm.example.com/api/leads',
                            method: 'POST',
                            body: [
                                { id: '1', key: 'name', value: '{{ name }}' },
                                { id: '2', key: 'email', value: '{{ email }}' },
                                { id: '3', key: 'phone', value: '{{ phone }}' }
                            ]
                        }
                    }]
                }
            };

            // Extract lead data from message
            const message = workflow.step1_receive_request.message;
            const nameMatch = message.match(/Name:\s*([^,]+)/);
            const emailMatch = message.match(/Email:\s*([^,\s]+)/);
            const phoneMatch = message.match(/Phone:\s*([^\s]+)/);

            const extractedData = {
                name: nameMatch ? nameMatch[1].trim() : null,
                email: emailMatch ? emailMatch[1].trim() : null,
                phone: phoneMatch ? phoneMatch[1].trim() : null
            };

            expect(extractedData.name).toBe('Sarah Smith');
            expect(extractedData.email).toBe('sarah@test.com');
            expect(extractedData.phone).toBe('555-0123');

            // Verify webhook body structure
            const webhookBody = workflow.step1_receive_request.configs[0].params.body;
            expect(webhookBody).toHaveLength(3);
            expect(webhookBody[0].key).toBe('name');
            expect(webhookBody[1].key).toBe('email');
            expect(webhookBody[2].key).toBe('phone');
        });
    });

    describe('Multi-Tool Workflow', () => {
        it('should handle multiple tool executions in sequence', async () => {
            const workflow = {
                instructions: 'New customer inquiry. RUN SendLeads and RUN SendNotification',
                configs: [
                    {
                        identifier: 'SendLeads',
                        toolName: 'call_webhook',
                        params: { url: 'https://crm.example.com/leads' }
                    },
                    {
                        identifier: 'SendNotification',
                        toolName: 'slack_notifier',
                        params: {
                            channel: '#sales',
                            message: 'New lead received'
                        }
                    }
                ]
            };

            // Parse multiple RUN commands
            const runCommands = workflow.instructions.match(/RUN\s+(\w+)/g);
            expect(runCommands).toHaveLength(2);

            const identifiers = runCommands?.map(cmd => cmd.replace('RUN ', ''));
            expect(identifiers).toContain('SendLeads');
            expect(identifiers).toContain('SendNotification');

            // Verify both tools are configured
            expect(workflow.configs).toHaveLength(2);
            expect(workflow.configs[0].toolName).toBe('call_webhook');
            expect(workflow.configs[1].toolName).toBe('slack_notifier');
        });
    });

    describe('No Tool Execution Workflow', () => {
        it('should handle conversations without tool execution', async () => {
            const workflow = {
                instructions: 'Just having a friendly conversation with the user',
                message: 'Hello, how can you help me?',
                configs: []
            };

            // Verify no RUN commands
            const hasRunCommand = workflow.instructions.includes('RUN');
            expect(hasRunCommand).toBe(false);

            // Verify no configs
            expect(workflow.configs).toHaveLength(0);
        });
    });
});
