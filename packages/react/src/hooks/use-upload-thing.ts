import type { FileRouter } from "uploadx/server";

export interface UseUploadThingProps {
  onClientUploadComplete?: (res: unknown[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadBegin?: (fileName: string) => void;
}

export const useUploadThing = <TRouter extends FileRouter>(
  _endpoint: keyof TRouter & string,
  _opts?: UseUploadThingProps,
) => {
  // TODO: implement upload hook with state management
  return {
    startUpload: async (_files: File[]) => {
      throw new Error("Not implemented");
    },
    isUploading: false,
    routeConfig: undefined,
  };
};
