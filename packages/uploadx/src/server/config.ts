import type { MinioConfig } from "../shared/types";

// Cache for hosted mode config (fetched once from dashboard)
let hostedConfigCache: { minioConfig: MinioConfig; bucket: string } | null = null;

/**
 * Resolve MinIO configuration from explicit config or environment variables.
 * Explicit config takes precedence over env vars.
 */
export function resolveMinioConfig(explicit?: MinioConfig): MinioConfig {
  if (explicit) return explicit;

  const endPoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (!endPoint || !accessKey || !secretKey) {
    throw new Error(
      "MinIO configuration is required. Provide it via createRouteHandler config, " +
        "set MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY environment variables, " +
        "or set UPLOADX_TOKEN + UPLOADX_URL for hosted mode.",
    );
  }

  return {
    endPoint,
    port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : undefined,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey,
    secretKey,
    bucket: process.env.MINIO_BUCKET,
  };
}

/**
 * Resolve MinIO config with hosted mode support.
 *
 * Priority:
 * 1. Explicit config passed in code
 * 2. MINIO_* env vars (direct mode)
 * 3. UPLOADX_TOKEN + UPLOADX_URL (hosted mode — fetch from dashboard)
 */
export async function resolveMinioConfigAsync(explicit?: MinioConfig): Promise<MinioConfig> {
  if (explicit) return explicit;

  // Try direct env vars first
  const endPoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;

  if (endPoint && accessKey && secretKey) {
    return {
      endPoint,
      port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : undefined,
      useSSL: process.env.MINIO_USE_SSL === "true",
      accessKey,
      secretKey,
      bucket: process.env.MINIO_BUCKET,
    };
  }

  // Try hosted mode
  const hosted = await resolveConfigFromToken();
  if (hosted) return hosted.minioConfig;

  throw new Error(
    "MinIO configuration is required. Provide it via createRouteHandler config, " +
      "set MINIO_ENDPOINT/MINIO_ACCESS_KEY/MINIO_SECRET_KEY environment variables, " +
      "or set UPLOADX_TOKEN + UPLOADX_URL for hosted mode.",
  );
}

/**
 * Fetch MinIO config from the dashboard using UPLOADX_TOKEN + UPLOADX_URL.
 * Results are cached in memory.
 */
export async function resolveConfigFromToken(): Promise<{
  minioConfig: MinioConfig;
  bucket: string;
} | null> {
  if (hostedConfigCache) return hostedConfigCache;

  const token = process.env.UPLOADX_TOKEN;
  const url = process.env.UPLOADX_URL;

  if (!token || !url) return null;

  const response = await fetch(`${url}/api/tokens/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new Error(`Failed to validate UPLOADX_TOKEN: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    valid: boolean;
    bucketName: string;
    minio: {
      endPoint: string;
      port: number;
      useSSL: boolean;
      accessKey: string;
      secretKey: string;
    };
  };

  if (!data.valid) {
    throw new Error("UPLOADX_TOKEN is invalid");
  }

  hostedConfigCache = {
    minioConfig: {
      endPoint: data.minio.endPoint,
      port: data.minio.port,
      useSSL: data.minio.useSSL,
      accessKey: data.minio.accessKey,
      secretKey: data.minio.secretKey,
      bucket: data.bucketName,
    },
    bucket: data.bucketName,
  };

  return hostedConfigCache;
}

/** Resolve the bucket name from config or env, defaulting to "uploadx". */
export function resolveBucket(config?: MinioConfig): string {
  return config?.bucket ?? process.env.MINIO_BUCKET ?? "uploadx";
}
