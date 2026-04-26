import type { UploadxConfig } from "../shared/types";

export class UploadxAPI {
  private config?: UploadxConfig;

  constructor(config?: UploadxConfig) {
    this.config = config;
  }

  async uploadFiles(_files: File[]) {
    // TODO: upload files to MinIO
    throw new Error("Not implemented");
  }

  async deleteFiles(_keys: string[]) {
    // TODO: delete files from MinIO
    throw new Error("Not implemented");
  }

  async listFiles() {
    // TODO: list files from MinIO
    throw new Error("Not implemented");
  }

  async generateSignedURL(_key: string, _expiresIn?: number) {
    // TODO: generate presigned URL
    throw new Error("Not implemented");
  }
}
