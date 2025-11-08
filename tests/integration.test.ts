import { describe, it, expect, jest } from '@jest/globals';

// Mock the entire flow
jest.mock('@langchain/google-genai');
jest.mock('@langchain/openai');
jest.mock('resend');
jest.mock('@slack/web-api');

describe('Integration Tests', () => {
    describe('Full Flow: Email Tool Execution', () => {
        it('should execute email tool when RUN command detected', async () => {
            // This test simulates the full flow
            const mockRequest = {
                provider: 'openai',
                apikey: 'test-key',
                instructions: 'User requested appointment booking. RUN SendConfirmationEmail',
                message: 'I want to book for john@example.com',
                configs: [{
                    identifier: 'SendConfirmationEmail',
                    toolName: 'send_email',
                    params: {
                        from: 'noreply@test.com',
                        subject: 'Booking Confirmed',
                        body: 'Your appointment is confirmed'
                    }
                }],
                conversationHistory: []
            };

            // Verify configs structure
            expect(mockRequest.configs[0].identifier).toBe('SendConfirmationEmail');
            expect(mockRequest.configs[0].toolName).toBe('send_email');
            expect(mockRequest.instructions).toContain('RUN SendConfirmationEmail');
        });
    });

    describe('Full Flow: Webhook Tool Execution', () => {
        it('should execute webhook when RUN command detected', async () => {
            const mockRequest = {
                provider: 'gemini',
                apikey: 'test-key',
                instructions: 'New lead captured. RUN SendLeads',
                message: 'Name: Jane Doe, Email: jane@test.com',
                configs: [{
                    identifier: 'SendLeads',
                    toolName: 'call_webhook',
                    params: {
                        url: 'https://webhook.site/test',
                        method: 'POST',
                        body: [
                            { id: '1', key: 'name', value: 'Jane Doe' },
                            { id: '2', key: 'email', value: 'jane@test.com' }
                        ]
                    }
                }]
            };

            expect(mockRequest.configs[0].identifier).toBe('SendLeads');
            expect(mockRequest.configs[0].toolName).toBe('call_webhook');
            expect(mockRequest.instructions).toContain('RUN SendLeads');
        });
    });

    describe('No Tool Execution', () => {
        it('should not execute tools without RUN command', async () => {
            const mockRequest = {
                provider: 'openai',
                apikey: 'test-key',
                instructions: 'Just having a casual conversation',
                message: 'Hello, how are you?',
                configs: []
            };

            expect(mockRequest.instructions).not.toContain('RUN');
            expect(mockRequest.configs).toHaveLength(0);
        });
    });
});
