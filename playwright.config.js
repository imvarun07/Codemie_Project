const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  webServer: {
    command: 'node backend/server.js',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 10_000,
    env: {
      DATABASE_FILE: 'backend/test.sqlite',
      PORT: '3000',
    },
  },
});
