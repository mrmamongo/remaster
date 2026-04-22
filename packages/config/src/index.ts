import { z } from 'zod';

// ============================================================================
// Configuration Schema
// ============================================================================

export const configSchema = z.object({
  // App
  app: z.object({
    name: z.string().default('llm-platform'),
    env: z.enum(['development', 'staging', 'production']).default('development'),
    port: z.number().default(3000),
    url: z.string().url().optional(),
  }),

  // Database
  database: z.object({
    url: z.string(),
    poolSize: z.number().default(10),
    ssl: z.boolean().default(false),
  }),

  // NATS
  nats: z.object({
    url: z.string().default('nats://localhost:4222'),
    name: z.string().default('llm-platform'),
    user: z.string().optional(),
    pass: z.string().optional(),
  }),

  // Redis
  redis: z.object({
    url: z.string().default('redis://localhost:6379'),
  }),

  // Ory
  ory: z.object({
    kratos: z.object({
      url: z.string().default('http://localhost:4433'),
      adminUrl: z.string().default('http://localhost:4434'),
    }),
    keto: z.object({
      url: z.string().default('http://localhost:4464'),
    }),
    Hydra: z.object({
      url: z.string().default('http://localhost:4444'),
    }),
  }),

  // Auth
  auth: z.object({
    jwtSecret: z.string().min(32),
    jwtExpiresIn: z.string().default('24h'),
    refreshTokenExpiresIn: z.string().default('7d'),
    sessionCookieName: z.string().default('llm_platform_session'),
  }),

  // LLM
  llm: z.object({
    defaultModel: z.string().default('gpt-4o'),
    timeout: z.number().default(60000),
    maxRetries: z.number().default(3),
  }),

  // Observability
  observability: z.object({
    metricsPort: z.number().default(9090),
    logsLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type Config = z.infer<typeof configSchema>;

// ============================================================================
// Default Configuration
// ============================================================================

export const defaultConfig: Config = {
  app: {
    name: 'llm-platform',
    env: 'development',
    port: 3000,
    url: undefined,
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:5432/llmplatform',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    ssl: process.env.DATABASE_SSL === 'true',
  },
  nats: {
    url: process.env.NATS_URL || 'nats://localhost:4222',
    name: process.env.NATS_NAME || 'llm-platform',
    user: process.env.NATS_USER,
    pass: process.env.NATS_PASS,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  ory: {
    kratos: {
      url: process.env.KRATOS_URL || 'http://localhost:4433',
      adminUrl: process.env.KRATOS_ADMIN_URL || 'http://localhost:4434',
    },
    keto: {
      url: process.env.KETO_URL || 'http://localhost:4464',
    },
    Hydra: {
      url: process.env.HYDRA_URL || 'http://localhost:4444',
    },
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    sessionCookieName: process.env.SESSION_COOKIE_NAME || 'llm_platform_session',
  },
  llm: {
    defaultModel: process.env.LLM_DEFAULT_MODEL || 'gpt-4o',
    timeout: parseInt(process.env.LLM_TIMEOUT || '60000', 10),
    maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3', 10),
  },
  observability: {
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
    logsLevel: (process.env.LOGS_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  },
};

// ============================================================================
// Configuration Loader (for use in NestJS ConfigModule)
// ============================================================================

export const configuration = () => {
  const env = process.env;
  
  return configSchema.parse({
    app: {
      name: env.APP_NAME || 'llm-platform',
      env: (env.APP_ENV || 'development') as 'development' | 'staging' | 'production',
      port: parseInt(env.APP_PORT || '3000', 10),
      url: env.APP_URL,
    },
    database: {
      url: env.DATABASE_URL || 'postgresql://postgres:5432/llmplatform',
      poolSize: parseInt(env.DATABASE_POOL_SIZE || '10', 10),
      ssl: env.DATABASE_SSL === 'true',
    },
    nats: {
      url: env.NATS_URL || 'nats://localhost:4222',
      name: env.NATS_NAME || 'llm-platform',
      user: env.NATS_USER,
      pass: env.NATS_PASS,
    },
    redis: {
      url: env.REDIS_URL || 'redis://localhost:6379',
    },
    ory: {
      kratos: {
        url: env.KRATOS_URL || 'http://localhost:4433',
        adminUrl: env.KRATOS_ADMIN_URL || 'http://localhost:4434',
      },
      keto: {
        url: env.KETO_URL || 'http://localhost:4464',
      },
      Hydra: {
        url: env.HYDRA_URL || 'http://localhost:4444',
      },
    },
    auth: {
      jwtSecret: env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars',
      jwtExpiresIn: env.JWT_EXPIRES_IN || '24h',
      refreshTokenExpiresIn: env.REFRESH_TOKEN_EXPIRES_IN || '7d',
      sessionCookieName: env.SESSION_COOKIE_NAME || 'llm_platform_session',
    },
    llm: {
      defaultModel: env.LLM_DEFAULT_MODEL || 'gpt-4o',
      timeout: parseInt(env.LLM_TIMEOUT || '60000', 10),
      maxRetries: parseInt(env.LLM_MAX_RETRIES || '3', 10),
    },
    observability: {
      metricsPort: parseInt(env.METRICS_PORT || '9090', 10),
      logsLevel: (env.LOGS_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
    },
  });
};

export default configuration;