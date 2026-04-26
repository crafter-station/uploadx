import type { FileRouter } from "../shared/types";

export interface GenUploaderOptions {
  url?: string;
}

export const genUploader = <TRouter extends FileRouter>(_opts?: GenUploaderOptions) => {
  return {
    uploadFiles: async (_endpoint: keyof TRouter, _opts: { files: File[] }) => {
      // TODO: request presigned URLs from server, then upload to MinIO
      throw new Error("Not implemented");
    },
  };
};
