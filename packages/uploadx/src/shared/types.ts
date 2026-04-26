export type FileSize = `${number}${"KB" | "MB" | "GB"}`;

export type FileType = "image" | "video" | "audio" | "pdf" | "text" | "blob";

export interface FileRouteConfig {
  [key: string]: {
    maxFileSize?: FileSize;
    maxFileCount?: number;
    minFileCount?: number;
    acl?: "public-read" | "private";
    contentDisposition?: "inline" | "attachment";
  };
}

export interface FileRouter {
  [routeName: string]: unknown;
}

export interface UploadxConfig {
  minio?: {
    endPoint: string;
    port?: number;
    useSSL?: boolean;
    accessKey: string;
    secretKey: string;
    bucket?: string;
  };
  token?: string;
  callbackUrl?: string;
}

export interface UploadedFile {
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

export interface UploadError {
  code: string;
  message: string;
}
