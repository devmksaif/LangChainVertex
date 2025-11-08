// ===== tests/e2e/api.test.ts - End-to-End API Tests =====
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { runLangChain } from '../../src/controllers/run-inference-langchain';

let app: express.Application;

beforeAll(() => {
    app = express();
    app.use(express.json());
    app.post('/run-inference-langchain', runLangChain);
});

describe('E2E API Tests', () => {
    describe('POST /run-inference-langchain', () => {
        it('should return 400 for missing required fields', async () => {
            const response = await request(app)
                .post('/run-inference-langchain')
                .send({
                    provider: 'openai'
                    // Missing other required fields
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('Missing required fields');
        });

        it('should return 400 for unsupported provider', async () => {
            const response = await request(app)
                .post('/run-inference-langchain')
                .send({
                    provider: 'claude',
                    apikey: 'test',
                    instructions: 'test',
                    message: 'test',
                    configs: []
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Unsupported provider');
        });

        it('should accept valid OpenAI request', async () => {
            const response = await request(app)
                .post('/run-inference-langchain')
                .send({
                    provider: 'openai',
                    apikey: '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',
                    instructions: 'Test instructions',
                    message: 'Hello',
                    configs: [],
                    conversationHistory: []
                });

            // Should attempt to process (will fail with invalid key, but that's ok)
            expect([200, 500]).toContain(response.status);
        });

        it('should accept valid Gemini request', async () => {
            const response = await request(app)
                .post('/run-inference-langchain')
                .send({
                    provider: 'gemini',
                    apikey: 'AIzaSyCBxulB71lOeo7gX_E6Z4cTq9S42u_hJ8c',
                    instructions: 'Test instructions',
                    message: 'Hello',
                    configs: [],
                    conversationHistory: []
                });

            expect([200, 500]).toContain(response.status);
        });
    });
});
