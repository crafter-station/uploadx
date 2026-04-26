export interface UploadFilesOptions {
  files: File[];
  endpoint: string;
  url?: string;
  onUploadProgress?: (progress: { file: string; progress: number }) => void;
  onUploadBegin?: (data: { file: string }) => void;
}

export const uploadFiles = async (_opts: UploadFilesOptions) => {
  // TODO: standalone upload function
  throw new Error("Not implemented");
};
