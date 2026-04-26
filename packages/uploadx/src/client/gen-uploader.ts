import type { ClientUploadedFileData, FileRouter } from "../shared/types";
import { type UploadFilesOptions, uploadFiles } from "./upload-files";

export interface GenUploaderOptions {
  /** Base URL of the uploadx route handler. Defaults to `"/api/uploadx"`. */
  url?: string;
}

type EndpointUploadOptions = Omit<UploadFilesOptions, "endpoint" | "url">;

/**
 * Generate a type-safe uploader bound to a specific FileRouter.
 *
 * ```ts
 * const { uploadFiles } = genUploader<AppFileRouter>();
 * const result = await uploadFiles("imageUploader", { files });
 * ```
 */
export const genUploader = <TRouter extends FileRouter>(opts?: GenUploaderOptions) => {
  const baseUrl = opts?.url ?? "/api/uploadx";

  return {
    uploadFiles: async <TEndpoint extends keyof TRouter & string>(
      endpoint: TEndpoint,
      options: EndpointUploadOptions,
    ): Promise<ClientUploadedFileData<TRouter[TEndpoint]["_serverData"]>[]> => {
      return uploadFiles({
        ...options,
        endpoint,
        url: baseUrl,
      }) as Promise<ClientUploadedFileData<TRouter[TEndpoint]["_serverData"]>[]>;
    },
  };
};
