import { describe, it, expect } from '@jest/globals';

function sanitizeTools(tools: any[]) {
    return tools.map((t) => {
        const copy: any = {};
        
        if (t.identifier) copy.identifier = t.identifier;
        if (t.toolName) copy.toolName = t.toolName;
        if (t.name) copy.name = t.name;
        if (t.description) copy.description = t.description;

        if (t.config) {
            copy.config = sanitizeObject(t.config);
        }

        if (t.params) {
            copy.params = sanitizeObject(t.params);
        }

        return copy;
    });
}

function sanitizeObject(obj: any): any {
    return JSON.parse(JSON.stringify(obj), (k, v) => {
        if (typeof v === 'string') {
            return v.replace(/{{\s*(.*?)\s*}}/g, '$1');
        }
        return v;
    });
}

describe('Config Sanitization Tests', () => {
    it('should remove {{ }} placeholders from strings', () => {
        const input = [{
            identifier: 'SendEmail',
            toolName: 'send_email',
            params: {
                to: '{{ userEmail }}',
                subject: 'Hello {{ userName }}',
                body: 'Plain text'
            }
        }];

        const result = sanitizeTools(input);
        
        expect(result[0].params.to).toBe('userEmail');
        expect(result[0].params.subject).toBe('Hello userName');
        expect(result[0].params.body).toBe('Plain text');
    });

    it('should preserve non-placeholder strings', () => {
        const input = [{
            identifier: 'Test',
            params: {
                url: 'https://example.com',
                normal: 'normal text'
            }
        }];

        const result = sanitizeTools(input);
        
        expect(result[0].params.url).toBe('https://example.com');
        expect(result[0].params.normal).toBe('normal text');
    });

    it('should handle nested objects', () => {
        const input = [{
            identifier: 'Test',
            config: {
                nested: {
                    value: '{{ placeholder }}',
                    array: ['{{ item1 }}', '{{ item2 }}']
                }
            }
        }];

        const result = sanitizeTools(input);
        
        expect(result[0].config.nested.value).toBe('placeholder');
        expect(result[0].config.nested.array[0]).toBe('item1');
        expect(result[0].config.nested.array[1]).toBe('item2');
    });

    it('should handle empty configs', () => {
        const input = [{ identifier: 'Test' }];
        const result = sanitizeTools(input);
        
        expect(result[0].identifier).toBe('Test');
        expect(result[0].params).toBeUndefined();
    });
});
