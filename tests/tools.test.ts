import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { toolsAI } from '../src/langchain_tools/tools';

// Mock external dependencies
jest.mock('resend');
jest.mock('@slack/web-api');
jest.mock('node-fetch');

describe('Tool Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Email Tool', () => {
        it('should have correct name and schema', () => {
            const emailTool = toolsAI.find(t => t.name === 'send_email');
            expect(emailTool).toBeDefined();
            expect(emailTool?.name).toBe('send_email');
            expect(emailTool?.description).toContain('email');
        });

        it('should validate email parameters', async () => {
            const emailTool = toolsAI.find(t => t.name === 'send_email');
            
            const validParams = {
                to: 'test@example.com',
                from: 'sender@example.com',
                subject: 'Test Email',
                body: 'Test body content'
            };

            // Mock Resend
            const { Resend } = await import('resend');
            const mockSend = jest.fn<() => Promise<{ data: { id: string; }; error: null; }>>().mockResolvedValue({
                data: { id: 'test-id' },
                error: null
            });
            (Resend as any).mockImplementation(() => ({
                emails: { send: mockSend }
            }));

            const result = await emailTool?.invoke(validParams);
            expect(result).toContain('success');
            expect(result).toContain('test@example.com');
        });

        it('should handle email errors', async () => {
            const emailTool = toolsAI.find(t => t.name === 'send_email');
            
            // Mock Resend error
            const { Resend } = await import('resend');
            const mockSend = jest.fn<() => Promise<{ data: null; error: { message: string; }; }>>().mockResolvedValue({
                data: null,
                error: { message: 'Invalid API key' }
            });
            (Resend as any).mockImplementation(() => ({
                emails: { send: mockSend }
            }));

            const result = await emailTool?.invoke({
                to: 'test@example.com',
                from: 'sender@example.com',
                subject: 'Test',
                body: 'Test'
            });

            expect(result).toContain('Error');
        });
    });

    describe('Webhook Tool', () => {
        it('should have correct name and schema', () => {
            const webhookTool = toolsAI.find(t => t.name === 'call_webhook');
            expect(webhookTool).toBeDefined();
            expect(webhookTool?.name).toBe('call_webhook');
        });

        it('should make POST request with body', async () => {
            const webhookTool = toolsAI.find(t => t.name === 'call_webhook');
            
            // Mock fetch
            global.fetch = jest.fn<() => Promise<{ ok: boolean; status: number; headers: Map<string, string>; json: () => Promise<{ success: boolean; }>; }>>().mockResolvedValue({
                ok: true,
                status: 200,
                headers: new Map([['content-type', 'application/json']]),
                json: async () => ({ success: true })
            }) as any;

            const result = await webhookTool?.invoke({
                url: 'https://webhook.site/test',
                method: 'POST',
                body: [
                    { id: '1', key: 'name', value: 'John Doe' },
                    { id: '2', key: 'email', value: 'john@example.com' }
                ]
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://webhook.site/test',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json'
                    }),
                    body: expect.stringContaining('John Doe')
                })
            );
            expect(result).toContain('success');
        });

        it('should handle webhook errors', async () => {
            const webhookTool = toolsAI.find(t => t.name === 'call_webhook');
            
            global.fetch = jest.fn<() => Promise<{ ok: boolean; status: number; text: () => Promise<string>; }>>().mockResolvedValue({
                ok: false,
                status: 404,
                text: async () => 'Not Found'
            }) as any;

            const result = await webhookTool?.invoke({
                url: 'https://webhook.site/invalid'
            });

            expect(result).toContain('404');
        });
    });

    describe('Slack Tool', () => {
        it('should have correct name and schema', () => {
            const slackTool = toolsAI.find(t => t.name === 'slack_notifier');
            expect(slackTool).toBeDefined();
            expect(slackTool?.name).toBe('slack_notifier');
        });

        it('should send slack message', async () => {
            const slackTool = toolsAI.find(t => t.name === 'slack_notifier');
            
            // Mock Slack WebClient
            const { WebClient } = await import('@slack/web-api');
            const mockPostMessage = jest.fn<() => Promise<{ ts: string; channel: string; }>>().mockResolvedValue({
                ts: '1234567890.123456',
                channel: 'C123456'
            });
            (WebClient as any).mockImplementation(() => ({
                chat: { postMessage: mockPostMessage }
            }));

            const result = await slackTool?.invoke({
                botUserOAuthToken: 'xoxb-test-token',
                channel: '#general',
                message: 'Test notification'
            });

            expect(mockPostMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    channel: '#general',
                    text: 'Test notification'
                })
            );
            expect(result).toContain('success');
        });
    });
});
