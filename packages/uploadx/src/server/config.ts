import type { MinioConfig } from "../shared/types";

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
      "MinIO configuration is required. Provide it via createRouteHandler config " +
        "or set MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY environment variables.",
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

/** Resolve the bucket name from config or env, defaulting to "uploadx". */
export function resolveBucket(config?: MinioConfig): string {
  return config?.bucket ?? process.env.MINIO_BUCKET ?? "uploadx";
}
