import type { FileRouter } from "uploadx/server";

export interface UploadDropzoneProps {
  endpoint: string;
  onClientUploadComplete?: (res: unknown[]) => void;
  onUploadError?: (error: Error) => void;
  onDrop?: (acceptedFiles: File[]) => void;
  disabled?: boolean;
}

export const generateUploadDropzone = <_TRouter extends FileRouter>() => {
  const UploadDropzone = (_props: UploadDropzoneProps) => {
    // TODO: implement drag-and-drop upload zone
    return null;
  };
  return UploadDropzone;
};
