import { describe, it, expect } from '@jest/globals';
import { prompt, promptOpenAI } from '../src/prompts';

describe('Prompt Template Tests', () => {
    describe('Gemini Prompt', () => {
        it('should format messages correctly', async () => {
            const formatted = await prompt.formatMessages({
                context: {
                    instructions: 'Test instructions',
                    message: 'Test message'
                },
                configs: '[]',
                conversationHistory: []
            });

            expect(formatted).toBeDefined();
            expect(formatted.length).toBeGreaterThan(0);
        });

        it('should include conversation history', async () => {
            const history = [
                { role: 'user', content: 'Previous message' },
                { role: 'assistant', content: 'Previous response' }
            ];

            const formatted = await prompt.formatMessages({
                context: {
                    instructions: 'Test instructions',
                    message: 'New message'
                },
                configs: '[]',
                conversationHistory: history
            });

            expect(formatted.length).toBeGreaterThan(2);
        });

        it('should handle context object correctly', async () => {
            const formatted = await prompt.formatMessages({
                context: {
                    instructions: 'AI agent instructions with RUN command',
                    message: 'User message'
                },
                configs: JSON.stringify([{ identifier: 'TestTool' }]),
                conversationHistory: []
            });

            expect(formatted).toBeDefined();
            expect(formatted.length).toBeGreaterThan(0);
        });
    });

    describe('OpenAI Prompt', () => {
        it('should format messages correctly', async () => {
            const formatted = await promptOpenAI.formatMessages({
                instructions: 'Test instructions',
                configs: '[]',
                message: 'Test message',
                conversationHistory: []
            });

            expect(formatted).toBeDefined();
            expect(formatted.length).toBeGreaterThan(0);
        });

        it('should include instructions and message correctly', async () => {
            const formatted = await promptOpenAI.formatMessages({
                instructions: 'RUN SendEmail',
                configs: JSON.stringify([{ identifier: 'SendEmail' }]),
                message: 'Send to test@example.com',
                conversationHistory: []
            });

            // The human message contains both instructions and message
            const humanMessage = formatted[formatted.length - 1];
            expect(humanMessage.content).toContain('RUN SendEmail');
            expect(humanMessage.content).toContain('test@example.com');
        });

        it('should handle conversation history', async () => {
            const history = [
                { role: 'user', content: 'First message' },
                { role: 'assistant', content: 'First response' }
            ];

            const formatted = await promptOpenAI.formatMessages({
                instructions: 'Continue conversation',
                configs: '[]',
                message: 'Second message',
                conversationHistory: history
            });

            expect(formatted.length).toBeGreaterThan(2);
        });

        it('should properly structure instructions and message', async () => {
            const formatted = await promptOpenAI.formatMessages({
                instructions: 'System instruction with RUN command',
                configs: JSON.stringify([]),
                message: 'User input text',
                conversationHistory: []
            });

            // Should have system message and human message
            expect(formatted.length).toBeGreaterThanOrEqual(2);
            
            // Last message should be human message
            const lastMessage = formatted[formatted.length - 1];
            expect(lastMessage).toHaveProperty('content');
            expect(typeof lastMessage.content).toBe('string');
        });
    });
});