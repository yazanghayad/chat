/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './public')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'e2e'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/features/**/actions/**'],
      exclude: ['src/__tests__/**', 'src/components/ui/**']
    },
    // Mock environment variables for tests
    env: {
      NEXT_PUBLIC_APPWRITE_ENDPOINT: 'https://test.appwrite.io/v1',
      NEXT_PUBLIC_APPWRITE_PROJECT: 'test-project',
      NEXT_PUBLIC_APPWRITE_DATABASE: 'test-db',
      NEXT_PUBLIC_APPWRITE_BUCKET: 'test-bucket',
      APPWRITE_API_KEY: 'test-api-key',
      OPENAI_API_KEY: 'test-openai-key'
    }
  }
});
