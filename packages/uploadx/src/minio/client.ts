import { Client } from "minio";
import type { BucketItem } from "minio";
import type { MinioConfig } from "../shared/types";

/** Create a MinIO client from config. */
export const createMinioClient = (config: MinioConfig) => {
  return new Client({
    endPoint: config.endPoint,
    port: config.port ?? 9000,
    useSSL: config.useSSL ?? false,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
};

/** Ensure a bucket exists, creating it if necessary. */
export async function ensureBucket(client: Client, bucket: string): Promise<void> {
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket);
  }
}

/** Generate a presigned PUT URL for direct client uploads. */
export async function generatePresignedPutUrl(
  client: Client,
  bucket: string,
  objectKey: string,
  expirySeconds = 3600,
): Promise<string> {
  return client.presignedPutObject(bucket, objectKey, expirySeconds);
}

/** Generate a presigned GET URL for file access. */
export async function generatePresignedGetUrl(
  client: Client,
  bucket: string,
  objectKey: string,
  expirySeconds = 3600,
): Promise<string> {
  return client.presignedGetObject(bucket, objectKey, expirySeconds);
}

/** Verify an object exists and return its metadata, or null if not found. */
export async function verifyObjectExists(
  client: Client,
  bucket: string,
  objectKey: string,
): Promise<{ size: number; etag: string; lastModified: Date; contentType: string } | null> {
  try {
    const stat = await client.statObject(bucket, objectKey);
    return {
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      contentType: (stat.metaData?.["content-type"] as string) ?? "application/octet-stream",
    };
  } catch {
    return null;
  }
}

/** Delete a single object from a bucket. */
export async function deleteObject(
  client: Client,
  bucket: string,
  objectKey: string,
): Promise<void> {
  await client.removeObject(bucket, objectKey);
}

/** Delete multiple objects from a bucket. */
export async function deleteObjects(
  client: Client,
  bucket: string,
  objectKeys: string[],
): Promise<void> {
  await client.removeObjects(bucket, objectKeys);
}

/** Get a readable stream for an object. */
export async function getObject(
  client: Client,
  bucket: string,
  objectKey: string,
): Promise<import("stream").Readable> {
  return client.getObject(bucket, objectKey);
}

/** List objects in a bucket, converting the stream into a Promise<array>. */
export async function listObjects(
  client: Client,
  bucket: string,
  prefix = "",
  recursive = true,
): Promise<Array<{ name: string; size: number; lastModified: Date; etag: string }>> {
  return new Promise((resolve, reject) => {
    const results: Array<{
      name: string;
      size: number;
      lastModified: Date;
      etag: string;
    }> = [];
    const stream = client.listObjects(bucket, prefix, recursive);

    stream.on("data", (obj: BucketItem) => {
      if (obj.name) {
        results.push({
          name: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag,
        });
      }
    });
    stream.on("end", () => resolve(results));
    stream.on("error", reject);
  });
}
