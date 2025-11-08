// tests/setup.ts - Test Setup
import { jest } from '@jest/globals';

// Mock environment variables
process.env.RESEND_API_KEY = 'test_resend_key';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test_anon_key';
