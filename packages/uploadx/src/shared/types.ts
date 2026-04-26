// ── File size & type primitives ──────────────────────────────────────────────

export type FileSize = `${number}${"KB" | "MB" | "GB"}`;

export type FileType = "image" | "video" | "audio" | "pdf" | "text" | "blob";

export type ACL = "public-read" | "private";

export type ContentDisposition = "inline" | "attachment";

// ── File route configuration ────────────────────────────────────────────────

export interface FileTypeConfig {
  maxFileSize?: FileSize;
  maxFileCount?: number;
  minFileCount?: number;
  acl?: ACL;
  contentDisposition?: ContentDisposition;
}

/** Input to `f()` — maps file type categories or MIME types to config. */
export type FileRouteInput = Partial<Record<FileType, FileTypeConfig>> &
  Record<string, FileTypeConfig>;

// ── File route builder output ───────────────────────────────────────────────

/** A fully resolved file route produced by the `f().middleware().onUploadComplete()` chain. */
export interface ResolvedFileRoute<TMetadata = Record<string, never>, TServerData = unknown> {
  _metadata?: TMetadata;
  _serverData?: TServerData;
  config: FileRouteInput;
  middleware: (opts: { req: Request }) => Promise<TMetadata> | TMetadata;
  onUploadComplete: (opts: {
    metadata: TMetadata;
    file: UploadedFile;
  }) => Promise<TServerData> | TServerData;
}

// biome-ignore lint/suspicious/noExplicitAny: type erasure required for heterogeneous route maps
export type FileRouter = Record<string, ResolvedFileRoute<any, any>>;

// ── MinIO / SDK configuration ───────────────────────────────────────────────

export interface MinioConfig {
  endPoint: string;
  port?: number;
  useSSL?: boolean;
  accessKey: string;
  secretKey: string;
  bucket?: string;
}

export interface UploadxConfig {
  minio?: MinioConfig;
  token?: string;
  callbackUrl?: string;
}

// ── Uploaded file metadata ──────────────────────────────────────────────────

export interface UploadedFile {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

// ── HTTP contract: presigned URL flow ───────────────────────────────────────

export interface PresignedUrlRequest {
  routeEndpoint: string;
  files: Array<{
    name: string;
    size: number;
    type: string;
  }>;
}

export interface PresignedUrlItem {
  url: string;
  key: string;
  name: string;
  fileUrl: string;
}

export interface PresignedUrlResponse {
  sessionId: string;
  presignedUrls: PresignedUrlItem[];
}

// ── HTTP contract: upload completion ────────────────────────────────────────

export interface UploadCompleteRequest {
  routeEndpoint: string;
  sessionId: string;
  fileKeys: string[];
}

export interface UploadCompleteResponse<TServerData = unknown> {
  serverData: TServerData[];
  files: UploadedFile[];
}

// ── Client-side types ───────────────────────────────────────────────────────

export interface UploadProgressEvent {
  file: string;
  progress: number;
}

export interface ClientUploadedFileData<TServerData = unknown> {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  serverData: TServerData;
}

// ── Error types ─────────────────────────────────────────────────────────────

export interface UploadError {
  code: string;
  message: string;
}
