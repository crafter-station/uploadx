import { createMinioClient, ensureBucket } from "uploadx/server";

export function getMinioClient() {
  return createMinioClient({
    endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
    port: process.env.MINIO_PORT ? Number(process.env.MINIO_PORT) : 9000,
    useSSL: process.env.MINIO_USE_SSL === "true",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "minioadmin",
    secretKey: process.env.MINIO_SECRET_KEY ?? "minioadmin",
  });
}

export async function ensureAppBucket(bucketName: string) {
  const client = getMinioClient();
  await ensureBucket(client, bucketName);
}
