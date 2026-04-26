import type { FileRouter } from "uploadx/server";

export interface UploadButtonProps {
  endpoint: string;
  onClientUploadComplete?: (res: unknown[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadBegin?: (fileName: string) => void;
  disabled?: boolean;
}

export const generateUploadButton = <_TRouter extends FileRouter>() => {
  const UploadButton = (_props: UploadButtonProps) => {
    // TODO: implement upload button with file picker
    return null;
  };
  return UploadButton;
};
