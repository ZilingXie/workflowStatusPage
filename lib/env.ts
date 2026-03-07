function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  appBaseUrl: getRequiredEnv("APP_BASE_URL"),
  timezone: process.env.TZ ?? "UTC",
  databaseUrl: getRequiredEnv("DATABASE_URL"),
  ingestToken: getRequiredEnv("INGEST_TOKEN"),
  sessionSecret: getRequiredEnv("SESSION_SECRET")
} as const;
