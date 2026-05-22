import type { Client } from "minio";
import {
  createMinioClient,
  deleteObject,
  deleteObjects,
  ensureBucket,
  generatePresignedGetUrl,
  listObjects,
} from "../minio/client";
import type { UploadedFile, UploadxConfig } from "../shared/types";
import { generateObjectKey } from "../shared/utils";
import { resolveBucket, resolveMinioConfig, resolveMinioConfigAsync } from "./config";

/**
 * Server-side API for managing files in MinIO.
 *
 * ```ts
 * // Direct mode (MINIO_* env vars set):
 * const api = new UploadxAPI();
 *
 * // Hosted mode (UPLOADX_TOKEN + UPLOADX_URL):
 * const api = await UploadxAPI.create();
 *
 * const files = await api.listFiles();
 * await api.deleteFiles(["key1", "key2"]);
 * const url = await api.generateSignedURL("key1", 3600);
 * ```
 */
export class UploadxAPI {
  private client: Client;
  private bucket: string;

  constructor(config?: UploadxConfig) {
    const minioConfig = resolveMinioConfig(config?.minio);
    this.client = createMinioClient(minioConfig);
    this.bucket = resolveBucket(minioConfig);
  }

  /**
   * Async factory for hosted mode (UPLOADX_TOKEN + UPLOADX_URL).
   * Fetches MinIO config from the dashboard, then returns a ready-to-use instance.
   */
  static async create(config?: UploadxConfig): Promise<UploadxAPI> {
    const minioConfig = await resolveMinioConfigAsync(config?.minio);
    const api = Object.create(UploadxAPI.prototype) as UploadxAPI;
    api.client = createMinioClient(minioConfig);
    api.bucket = resolveBucket(minioConfig);
    return api;
  }

  /**
   * Upload files directly to MinIO from the server side.
   * Returns metadata for each uploaded file.
   */
  async uploadFiles(
    files: Array<{ name: string; data: Buffer | ReadableStream | string; type?: string }>,
  ): Promise<UploadedFile[]> {
    await ensureBucket(this.client, this.bucket);

    const results: UploadedFile[] = [];
    for (const file of files) {
      const key = generateObjectKey(file.name);
      const contentType = file.type ?? "application/octet-stream";

      await this.client.putObject(this.bucket, key, file.data as Buffer, undefined, {
        "Content-Type": contentType,
      });

      const url = await generatePresignedGetUrl(this.client, this.bucket, key);
      const stat = await this.client.statObject(this.bucket, key);

      results.push({
        key,
        url,
        name: file.name,
        size: stat.size,
        type: contentType,
      });
    }

    await registerFilesWithDashboard(results);

    return results;
  }

  /** Delete one or more files by their object keys. */
  async deleteFiles(keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const hosted = getHostedConfig();
    if (hosted) {
      // Dashboard handles both DB and MinIO deletion
      const res = await fetch(`${hosted.url}/api/files`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hosted.token}`,
        },
        body: JSON.stringify({ keys }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to delete files: ${res.status} ${res.statusText} ${text}`);
      }
      return;
    }

    if (keys.length === 1 && keys[0]) {
      await deleteObject(this.client, this.bucket, keys[0]);
    } else if (keys.length > 1) {
      await deleteObjects(this.client, this.bucket, keys);
    }
  }

  /** List files in the bucket, optionally filtering by prefix. */
  async listFiles(prefix?: string): Promise<UploadedFile[]> {
    const hosted = getHostedConfig();
    if (hosted) {
      // Dashboard is source of truth — read from its DB
      const params = new URLSearchParams({ pageSize: "1000" });
      if (prefix) params.set("search", prefix);

      const res = await fetch(`${hosted.url}/api/files?${params}`, {
        headers: { Authorization: `Bearer ${hosted.token}` },
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to list files: ${res.status} ${res.statusText} ${text}`);
      }

      const data = (await res.json()) as {
        files: Array<{ key: string; name: string; size: number; type: string }>;
      };

      const results: UploadedFile[] = [];
      for (const file of data.files) {
        const url = await generatePresignedGetUrl(this.client, this.bucket, file.key);
        results.push({
          key: file.key,
          url,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      }
      return results;
    }

    const objects = await listObjects(this.client, this.bucket, prefix);
    const results: UploadedFile[] = [];
    for (const obj of objects) {
      const url = await generatePresignedGetUrl(this.client, this.bucket, obj.name);
      results.push({
        key: obj.name,
        url,
        name: obj.name.split("/").pop() ?? obj.name,
        size: obj.size,
        type: "application/octet-stream",
      });
    }
    return results;
  }

  /** Generate a presigned GET URL for a file. */
  async generateSignedURL(key: string, expiresIn = 3600): Promise<string> {
    return generatePresignedGetUrl(this.client, this.bucket, key, expiresIn);
  }
}

/**
 * Returns hosted-mode config (UPLOADX_TOKEN + UPLOADX_URL) or null if not set.
 * The URL has any trailing slash stripped.
 */
function getHostedConfig(): { token: string; url: string } | null {
  const token = process.env.UPLOADX_TOKEN;
  const url = process.env.UPLOADX_URL;
  if (!token || !url) return null;
  return { token, url: url.replace(/\/$/, "") };
}

/**
 * Register uploaded files with the Uploadx dashboard so they appear in the
 * file listing. Only runs in hosted mode (UPLOADX_TOKEN + UPLOADX_URL set).
 * Failures are logged but never throw — the upload itself already succeeded.
 */
async function registerFilesWithDashboard(files: UploadedFile[]): Promise<void> {
  if (files.length === 0) return;

  const hosted = getHostedConfig();
  if (!hosted) return;

  try {
    const res = await fetch(`${hosted.url}/api/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: hosted.token,
        files: files.map((f) => ({ key: f.key, name: f.name, size: f.size, type: f.type })),
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[uploadx] Failed to register files with dashboard: ${res.status} ${res.statusText} ${text}`,
      );
    }
  } catch (err) {
    console.error("[uploadx] Failed to register files with dashboard:", err);
  }
}
