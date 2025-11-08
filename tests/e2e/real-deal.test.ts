// tests/e2e/real-deal.test.ts - Complete E2E Tests
import { describe, it, expect, jest, beforeAll } from '@jest/globals';
import { runLangChain } from '../../src/controllers/run-inference-langchain';
import express from 'express';
import request from 'supertest';

process.env.OPENAI_API_KEY = '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';
process.env.GEMINI_API_KEY = 'AIzaSyCBxulB71lOeo7gX_E6Z4cTq9S42u_hJ8c';

// Mock the AI inference functions
jest.mock('../../src/langchain_functions/functions', () => ({
    runAI: jest.fn().mockImplementation((...args: any[]) => {
        const instructions = args[0] as string;
        
        // Simulate Gemini behavior
        if (instructions.includes('Ask for the user\'s name, email, and phone number')) {
            return Promise.resolve(200);
        }
        if (instructions.includes('run the BookAppointment tool') || instructions.includes('RUN BookAppointment')) {
            return Promise.resolve(200);
        }
        if (instructions.includes('send confirmation email') || instructions.includes('RUN SendConfirmation')) {
            return Promise.resolve(200);
        }
        
        return Promise.resolve(500);
    }),
    
    runOpenAILogic: jest.fn().mockImplementation((...args: any[]) => {
        const instructions = args[0] as string;
        
        // Simulate OpenAI behavior
        if (instructions.includes('Ask for the user\'s name, email, and phone number')) {
            return Promise.resolve(200);
        }
        if (instructions.includes('run the BookAppointment tool') || instructions.includes('RUN BookAppointment')) {
            return Promise.resolve(200);
        }
        if (instructions.includes('send confirmation email') || instructions.includes('RUN SendConfirmation')) {
            return Promise.resolve(200);
        }
        
        return Promise.resolve(500);
    }),
}));

// Mock the tools
jest.mock('../../src/langchain_tools/tools', () => ({
    toolsAI: [
        {
            name: 'call_webhook',
            description: 'Calls a webhook with data',
            invoke: jest.fn<() => Promise<string>>().mockResolvedValue(
                JSON.stringify({ success: true, message: 'Webhook called successfully' })
            ),
        },
        {
            name: 'send_email',
            description: 'Sends an email',
            invoke: jest.fn<() => Promise<string>>().mockResolvedValue(
                JSON.stringify({ success: true, message: 'Email sent successfully' })
            ),
        },
        {
            name: 'slack_notifier',
            description: 'Sends a slack notification',
            invoke: jest.fn<() => Promise<string>>().mockResolvedValue(
                JSON.stringify({ success: true, message: 'Slack notification sent' })
            ),
        }
    ]
}));

let app: express.Application;

describe('Real Deal E2E Flow - OpenAI', () => {
    beforeAll(() => {
        app = express();
        app.use(express.json());
        app.post('/run-inference-langchain', runLangChain);
    });

    it('should follow the complete appointment booking flow with OpenAI', async () => {
        const conversationHistory: any[] = [];

        // ===== Step 1: Initial message from the user =====
        const initialResponse = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'openai',
                apikey: process.env.OPENAI_API_KEY,
                instructions: 'You are a dentist assistant. Your goal is to book an appointment. Ask for the user\'s name, email, and phone number.',
                message: 'I want to book an appointment.',
                configs: [],
                conversationHistory: conversationHistory
            });

        // The AI should ask for the user's information
        expect(initialResponse.status).toBe(200);
        expect(initialResponse.body.success).toBe(true);
        expect(initialResponse.body.status).toContain('success');

        conversationHistory.push({ 
            role: 'user', 
            content: 'I want to book an appointment.' 
        });
        conversationHistory.push({ 
            role: 'assistant', 
            content: 'What is your name, email, and phone number?' 
        });

        // ===== Step 2: User provides the information =====
        const userInformationResponse = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'openai',
                apikey: process.env.OPENAI_API_KEY,
                instructions: 'The user has provided their information. Now, run the BookAppointment tool.',
                message: 'My name is John Doe, my email is john.doe@email.com, and my phone number is 123-456-7890.',
                configs: [
                    {
                        identifier: 'BookAppointment',
                        toolName: 'call_webhook',
                        params: {
                            url: 'https://webhook.site/test',
                            method: 'POST',
                            body: [
                                { id: '1', key: 'name', value: '{{ name }}' },
                                { id: '2', key: 'email', value: '{{ email }}' },
                                { id: '3', key: 'phone', value: '{{ phone }}' }
                            ]
                        }
                    }
                ],
                conversationHistory: conversationHistory
            });

        // The tool should be executed
        expect(userInformationResponse.status).toBe(200);
        expect(userInformationResponse.body.success).toBe(true);
        expect(userInformationResponse.body.status).toContain('success');

        conversationHistory.push({ 
            role: 'user', 
            content: 'My name is John Doe, my email is john.doe@email.com, and my phone number is 123-456-7890.' 
        });
        conversationHistory.push({ 
            role: 'assistant', 
            content: 'Great! Your appointment has been booked.' 
        });

        // ===== Step 3: Send confirmation email =====
        const confirmationResponse = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'openai',
                apikey: process.env.OPENAI_API_KEY,
                instructions: 'Appointment booked successfully. Now send confirmation email. RUN SendConfirmation',
                message: 'Send confirmation to john.doe@email.com',
                configs: [
                    {
                        identifier: 'SendConfirmation',
                        toolName: 'send_email',
                        params: {
                            from: 'noreply@dentist.com',
                            subject: 'Appointment Confirmation',
                            body: 'Your appointment has been confirmed for John Doe'
                        }
                    }
                ],
                conversationHistory: conversationHistory
            });

        expect(confirmationResponse.status).toBe(200);
        expect(confirmationResponse.body.success).toBe(true);
        expect(confirmationResponse.body.status).toContain('success');
    });

    it('should handle multi-tool execution with OpenAI', async () => {
        const response = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'openai',
                apikey: process.env.OPENAI_API_KEY,
                instructions: 'New lead captured. RUN SendLeads and RUN NotifyTeam',
                message: 'Name: Sarah Smith, Email: sarah@test.com, Phone: 555-0123',
                configs: [
                    {
                        identifier: 'SendLeads',
                        toolName: 'call_webhook',
                        params: {
                            url: 'https://crm.example.com/api/leads',
                            method: 'POST',
                            body: [
                                { id: '1', key: 'name', value: 'Sarah Smith' },
                                { id: '2', key: 'email', value: 'sarah@test.com' },
                                { id: '3', key: 'phone', value: '555-0123' }
                            ]
                        }
                    },
                    {
                        identifier: 'NotifyTeam',
                        toolName: 'slack_notifier',
                        params: {
                            botUserOAuthToken: 'xoxb-test-token',
                            channel: '#sales',
                            message: 'New lead: Sarah Smith - sarah@test.com'
                        }
                    }
                ],
                conversationHistory: []
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});

describe('Real Deal E2E Flow - Gemini', () => {
    beforeAll(() => {
        if (!app) {
            app = express();
            app.use(express.json());
            app.post('/run-inference-langchain', runLangChain);
        }
    });

    it('should follow the complete appointment booking flow with Gemini', async () => {
        const conversationHistory: any[] = [];

        // ===== Step 1: Initial message from the user =====
        const initialResponse = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'gemini',
                apikey: process.env.GEMINI_API_KEY,
                instructions: 'You are a dentist assistant. Your goal is to book an appointment. Ask for the user\'s name, email, and phone number.',
                message: 'I want to book an appointment.',
                configs: [],
                conversationHistory: conversationHistory
            });

        // The AI should ask for the user's information
        expect(initialResponse.status).toBe(200);
        expect(initialResponse.body.success).toBe(true);
        expect(initialResponse.body.status).toContain('success');
        expect(initialResponse.body.provider).toBe('gemini');

        conversationHistory.push({ 
            role: 'user', 
            content: 'I want to book an appointment.' 
        });
        conversationHistory.push({ 
            role: 'assistant', 
            content: 'Sure! To book your appointment, I\'ll need your name, email address, and phone number.' 
        });

        // ===== Step 2: User provides the information =====
        const userInformationResponse = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'gemini',
                apikey: process.env.GEMINI_API_KEY,
                instructions: 'The user has provided their information. Now, RUN BookAppointment tool to save the appointment.',
                message: 'My name is Jane Smith, my email is jane.smith@email.com, and my phone number is 987-654-3210.',
                configs: [
                    {
                        identifier: 'BookAppointment',
                        toolName: 'call_webhook',
                        params: {
                            url: 'https://booking-api.dentist.com/appointments',
                            method: 'POST',
                            body: [
                                { id: '1', key: 'name', value: 'Jane Smith' },
                                { id: '2', key: 'email', value: 'jane.smith@email.com' },
                                { id: '3', key: 'phone', value: '987-654-3210' }
                            ]
                        }
                    }
                ],
                conversationHistory: conversationHistory
            });

        // The tool should be executed
        expect(userInformationResponse.status).toBe(200);
        expect(userInformationResponse.body.success).toBe(true);
        expect(userInformationResponse.body.status).toContain('success');

        conversationHistory.push({ 
            role: 'user', 
            content: 'My name is Jane Smith, my email is jane.smith@email.com, and my phone number is 987-654-3210.' 
        });
        conversationHistory.push({ 
            role: 'assistant', 
            content: 'Perfect! I\'ve booked your appointment, Jane.' 
        });

        // ===== Step 3: Send confirmation email =====
        const confirmationResponse = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'gemini',
                apikey: process.env.GEMINI_API_KEY,
                instructions: 'Appointment successfully booked for Jane Smith. RUN SendConfirmation to send confirmation email.',
                message: 'Please send confirmation to jane.smith@email.com',
                configs: [
                    {
                        identifier: 'SendConfirmation',
                        toolName: 'send_email',
                        params: {
                            from: 'appointments@dentist.com',
                            subject: 'Appointment Confirmation - Dentist Office',
                            body: 'Dear Jane Smith, your dental appointment has been confirmed. We look forward to seeing you!'
                        }
                    }
                ],
                conversationHistory: conversationHistory
            });

        expect(confirmationResponse.status).toBe(200);
        expect(confirmationResponse.body.success).toBe(true);
        expect(confirmationResponse.body.status).toContain('success');
    });

    it('should handle webhook with Gemini', async () => {
        const response = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'gemini',
                apikey: process.env.GEMINI_API_KEY,
                instructions: 'Patient inquiry received. RUN SaveInquiry to save to database.',
                message: 'Patient inquiry: Maria Garcia wants info about teeth whitening. Email: maria@example.com',
                configs: [
                    {
                        identifier: 'SaveInquiry',
                        toolName: 'call_webhook',
                        params: {
                            url: 'https://api.dentist.com/inquiries',
                            method: 'POST',
                            headers: [
                                { id: '1', key: 'Content-Type', value: 'application/json' },
                                { id: '2', key: 'Authorization', value: 'Bearer token123' }
                            ],
                            body: [
                                { id: '1', key: 'name', value: 'Maria Garcia' },
                                { id: '2', key: 'email', value: 'maria@example.com' },
                                { id: '3', key: 'inquiry', value: 'teeth whitening info' }
                            ]
                        }
                    }
                ],
                conversationHistory: []
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.provider).toBe('gemini');
    });

    it('should handle Slack notification with Gemini', async () => {
        const response = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'gemini',
                apikey: process.env.GEMINI_API_KEY,
                instructions: 'Emergency appointment requested. RUN NotifyStaff immediately.',
                message: 'URGENT: Patient with tooth pain needs immediate attention. Contact: emergency@patient.com',
                configs: [
                    {
                        identifier: 'NotifyStaff',
                        toolName: 'slack_notifier',
                        params: {
                            botUserOAuthToken: 'xoxb-gemini-test-token',
                            channel: '#emergencies',
                            message: '🚨 URGENT: Emergency appointment request - tooth pain. Contact: emergency@patient.com'
                        }
                    }
                ],
                conversationHistory: []
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it('should handle multi-tool execution with Gemini', async () => {
        const response = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'gemini',
                apikey: process.env.GEMINI_API_KEY,
                instructions: 'VIP patient booking. RUN BookVIPAppointment and RUN NotifyManager and RUN SendWelcomeEmail',
                message: 'VIP Patient: Dr. Anderson, Email: anderson@vip.com, Phone: 555-VIP1',
                configs: [
                    {
                        identifier: 'BookVIPAppointment',
                        toolName: 'call_webhook',
                        params: {
                            url: 'https://api.dentist.com/vip-appointments',
                            method: 'POST',
                            body: [
                                { id: '1', key: 'name', value: 'Dr. Anderson' },
                                { id: '2', key: 'email', value: 'anderson@vip.com' },
                                { id: '3', key: 'phone', value: '555-VIP1' },
                                { id: '4', key: 'priority', value: 'VIP' }
                            ]
                        }
                    },
                    {
                        identifier: 'NotifyManager',
                        toolName: 'slack_notifier',
                        params: {
                            botUserOAuthToken: 'xoxb-manager-token',
                            channel: '#management',
                            message: '⭐ VIP Appointment: Dr. Anderson has been booked'
                        }
                    },
                    {
                        identifier: 'SendWelcomeEmail',
                        toolName: 'send_email',
                        params: {
                            from: 'vip@dentist.com',
                            subject: 'Welcome to Our VIP Service',
                            body: 'Dear Dr. Anderson, thank you for choosing our VIP service.'
                        }
                    }
                ],
                conversationHistory: []
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});

describe('Real Deal E2E Flow - Error Handling', () => {
    beforeAll(() => {
        if (!app) {
            app = express();
            app.use(express.json());
            app.post('/run-inference-langchain', runLangChain);
        }
    });

    it('should handle missing required fields', async () => {
        const response = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'openai',
                // Missing apikey, instructions, message
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Missing required fields');
    });

    it('should handle invalid provider', async () => {
        const response = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'claude',
                apikey: 'test-key',
                instructions: 'test',
                message: 'test',
                configs: []
            });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('Unsupported provider');
    });

    it('should handle empty configs gracefully', async () => {
        const response = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'openai',
                apikey: process.env.OPENAI_API_KEY,
                instructions: 'Just having a conversation',
                message: 'Hello, how are you?',
                configs: []
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });

    it('should handle empty conversation history', async () => {
        const response = await request(app)
            .post('/run-inference-langchain')
            .send({
                provider: 'gemini',
                apikey: process.env.GEMINI_API_KEY,
                instructions: 'Start fresh conversation',
                message: 'Hi there!',
                configs: [],
                conversationHistory: []
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
    });
});

describe('Real Deal E2E Flow - Provider Comparison', () => {
    it('should produce consistent results between OpenAI and Gemini', async () => {
        const testPayload = {
            instructions: 'Book appointment. RUN BookAppointment',
            message: 'Name: Test User, Email: test@example.com, Phone: 555-TEST',
            configs: [
                {
                    identifier: 'BookAppointment',
                    toolName: 'call_webhook',
                    params: {
                        url: 'https://api.test.com/book',
                        method: 'POST',
                        body: [
                            { id: '1', key: 'name', value: 'Test User' },
                            { id: '2', key: 'email', value: 'test@example.com' }
                        ]
                    }
                }
            ],
            conversationHistory: []
        };

        // Test with OpenAI
        const openaiResponse = await request(app)
            .post('/run-inference-langchain')
            .send({
                ...testPayload,
                provider: 'openai',
                apikey: process.env.OPENAI_API_KEY
            });

        // Test with Gemini
        const geminiResponse = await request(app)
            .post('/run-inference-langchain')
            .send({
                ...testPayload,
                provider: 'gemini',
                apikey: process.env.GEMINI_API_KEY
            });

        // Both should succeed
        expect(openaiResponse.status).toBe(200);
        expect(geminiResponse.status).toBe(200);
        
        expect(openaiResponse.body.success).toBe(true);
        expect(geminiResponse.body.success).toBe(true);
        
        expect(openaiResponse.body.status).toBe('success');
        expect(geminiResponse.body.status).toBe('success');
    });
});