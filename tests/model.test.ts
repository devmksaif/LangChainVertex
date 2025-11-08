import { describe, it, expect, beforeEach } from '@jest/globals';
import { ModelInstance } from '../src/model/model';

jest.mock('@langchain/google-genai', () => ({
    ChatGoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        bindTools: jest.fn().mockReturnValue('bound model'),
    })),
}));
jest.mock('@langchain/openai', () => ({
    ChatOpenAI: jest.fn().mockImplementation(() => ({
        bindTools: jest.fn().mockReturnValue('bound model'),
    })),
}));

describe('Model Instance Tests', () => {
    describe('Gemini Model', () => {
        it('should initialize Gemini model correctly', () => {
            const model = new ModelInstance(
                'test-api-key',
                0.7,
                'gemini-2.5-flash',
                'gemini',
                'test instructions',
                '{}',
                []
            );

            model.initModel();
            
            expect(model.provider).toBe('gemini');
            expect(model.temperature).toBe(0.7);
            expect(model.googleAI).toBeDefined();
        });

        it('should bind tools for Gemini', () => {
            const model = new ModelInstance(
                'test-api-key',
                0.7,
                'gemini-2.5-flash',
                'gemini',
                'test instructions',
                '{}',
                []
            );

            model.initModel();
            const boundModel = model.getBindTools();
            
            expect(boundModel).toBeDefined();
        });
    });

    describe('OpenAI Model', () => {
        it('should initialize OpenAI model correctly', () => {
            const model = new ModelInstance(
                'test-api-key',
                0.7,
                'gpt-4-turbo',
                'openai',
                'test instructions',
                '{}',
                []
            );

            model.initModel();
            
            expect(model.provider).toBe('openai');
            expect(model.temperature).toBe(0.7);
            expect(model.openAI).toBeDefined();
        });

        it('should bind tools for OpenAI', () => {
            const model = new ModelInstance(
                'test-api-key',
                0.7,
                'gpt-4-turbo',
                'openai',
                'test instructions',
                '{}',
                []
            );

            model.initModel();
            const boundModel = model.getBindTools();
            
            expect(boundModel).toBeDefined();
        });
    });
});
