import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: 'fundos',
  logLevel: 'log',
  maxDuration: 300,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1_000,
      maxTimeoutInMs: 30_000,
      factor: 2,
    },
  },
  dirs: ['./src/trigger'],
})
