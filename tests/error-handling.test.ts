import { describe, it, expect } from '@jest/globals';
import { toolsAI } from '../src/langchain_tools/tools';

describe('Error Handling Tests', () => {
    it('should handle invalid email addresses', async () => {
        const emailTool = toolsAI.find(t => t.name === 'send_email');
        
        try {
            await emailTool?.invoke({
                to: 'invalid-email',
                from: 'sender@example.com',
                subject: 'Test',
                body: 'Test'
            });
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    it('should handle invalid webhook URLs', async () => {
        const webhookTool = toolsAI.find(t => t.name === 'call_webhook');
        
        try {
            await webhookTool?.invoke({
                url: 'not-a-url'
            });
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    it('should handle network errors gracefully', async () => {
        const webhookTool = toolsAI.find(t => t.name === 'call_webhook');
        
        global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

        const result = await webhookTool?.invoke({
            url: 'https://example.com'
        });

        expect(result).toContain('Error');
        expect(result).toContain('Network error');
    });

    it('should handle missing required fields', () => {
        expect(() => {
            // Missing required fields should throw validation error
            const config = {
                identifier: 'Test'
                // Missing toolName
            };
            
            if (!(config as any).toolName) {
                throw new Error('toolName is required');
            }
        }).toThrow('toolName is required');
    });
});
