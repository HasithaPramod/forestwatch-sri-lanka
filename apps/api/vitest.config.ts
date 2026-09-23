import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    env: {
      NODE_ENV: 'test',
      API_PORT: '3001',
      DATABASE_URL: 'postgresql://forestwatch:forestwatch@localhost:5433/forestwatch',
      JWT_SECRET: 'test-access-secret-key',
      JWT_REFRESH_SECRET: 'test-refresh-secret-key',
      STORAGE_PROVIDER: 'local',
      STORAGE_LOCAL_ROOT: './uploads',
      STORAGE_PUBLIC_BASE_URL: 'http://localhost:3001/api/v1/files',
    },
  },
});
