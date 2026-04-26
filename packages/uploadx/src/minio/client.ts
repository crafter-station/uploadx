import { Client } from "minio";
import type { UploadxConfig } from "../shared/types";

export const createMinioClient = (config: NonNullable<UploadxConfig["minio"]>) => {
  return new Client({
    endPoint: config.endPoint,
    port: config.port ?? 9000,
    useSSL: config.useSSL ?? false,
    accessKey: config.accessKey,
    secretKey: config.secretKey,
  });
};
