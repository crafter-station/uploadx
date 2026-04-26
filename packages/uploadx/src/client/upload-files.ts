import type {
  ClientUploadedFileData,
  PresignedUrlResponse,
  UploadCompleteResponse,
} from "../shared/types";
import { uploadToPresignedUrl } from "./presigned-upload";

export interface UploadFilesOptions {
  files: File[];
  endpoint: string;
  /** Base URL of the uploadx route handler. Defaults to `"/api/uploadx"`. */
  url?: string;
  onUploadProgress?: (progress: { file: string; progress: number }) => void;
  onUploadBegin?: (data: { file: string }) => void;
}

/**
 * Standalone function to upload files through the uploadx route handler.
 *
 * 1. POST ?action=upload → get presigned URLs
 * 2. PUT each file to its presigned URL (with progress)
 * 3. POST ?action=complete → get server data
 */
export const uploadFiles = async (opts: UploadFilesOptions): Promise<ClientUploadedFileData[]> => {
  const { files, endpoint, url = "/api/uploadx", onUploadProgress, onUploadBegin } = opts;

  // 1. Request presigned URLs
  const presignRes = await fetch(`${url}?action=upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routeEndpoint: endpoint,
      files: files.map((f) => ({ name: f.name, size: f.size, type: f.type })),
    }),
  });

  if (!presignRes.ok) {
    const errBody = await presignRes.json().catch(() => null);
    const message =
      (errBody as { error?: { message?: string } })?.error?.message ?? presignRes.statusText;
    throw new Error(`Failed to get presigned URLs: ${message}`);
  }

  const presignData = (await presignRes.json()) as PresignedUrlResponse;

  // 2. Upload each file to its presigned URL
  const uploadPromises = presignData.presignedUrls.map(async (presigned, i) => {
    const file = files[i];
    if (!file) return;

    onUploadBegin?.({ file: file.name });

    await uploadToPresignedUrl(file, presigned.url, (progress) => {
      onUploadProgress?.({ file: file.name, progress });
    });
  });

  await Promise.all(uploadPromises);

  // 3. Notify server that uploads are complete
  const completeRes = await fetch(`${url}?action=complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      routeEndpoint: endpoint,
      sessionId: presignData.sessionId,
      fileKeys: presignData.presignedUrls.map((p) => p.key),
    }),
  });

  if (!completeRes.ok) {
    const errBody = await completeRes.json().catch(() => null);
    const message =
      (errBody as { error?: { message?: string } })?.error?.message ?? completeRes.statusText;
    throw new Error(`Upload completion failed: ${message}`);
  }

  const completeData = (await completeRes.json()) as UploadCompleteResponse;

  // 4. Merge into ClientUploadedFileData
  return completeData.files.map((file, i) => ({
    key: file.key,
    url: file.url,
    name: file.name,
    size: file.size,
    type: file.type,
    serverData: completeData.serverData[i],
  }));
};
