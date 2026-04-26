import { useRef } from "react";
import type { ClientUploadedFileData } from "uploadx/client";
import type { FileRouter } from "uploadx/server";
import { useUploadX } from "../hooks/use-upload-x";
import { deriveAcceptString, deriveMaxFileCount } from "../utils";

export interface UploadButtonProps<TServerData = unknown> {
  endpoint: string;
  onClientUploadComplete?: (res: ClientUploadedFileData<TServerData>[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadBegin?: (fileName: string) => void;
  onUploadProgress?: (progress: number) => void;
  disabled?: boolean;
  url?: string;
  className?: string;
}

export const generateUploadButton = <TRouter extends FileRouter>() => {
  const UploadButton = (props: UploadButtonProps) => {
    const {
      endpoint,
      onClientUploadComplete,
      onUploadError,
      onUploadBegin,
      onUploadProgress,
      disabled,
      url,
      className,
    } = props;

    const inputRef = useRef<HTMLInputElement>(null);

    const { startUpload, isUploading, progress, routeConfig } = useUploadX<TRouter>(
      endpoint as keyof TRouter & string,
      { onClientUploadComplete, onUploadError, onUploadBegin, onUploadProgress, url },
    );

    const accept = routeConfig ? deriveAcceptString(routeConfig) : undefined;
    const maxFiles = routeConfig ? deriveMaxFileCount(routeConfig) : undefined;

    const handleClick = () => {
      if (!isUploading && !disabled) {
        inputRef.current?.click();
      }
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      await startUpload(files);
      // Reset input so the same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    return (
      <div
        className={className}
        data-state={isUploading ? "uploading" : "ready"}
        style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles !== 1}
          style={{ display: "none" }}
          onChange={handleChange}
          disabled={disabled || isUploading}
        />
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isUploading}
          data-state={isUploading ? "uploading" : "ready"}
          style={{
            cursor: disabled || isUploading ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            padding: "8px 16px",
            borderRadius: 6,
            border: "1px solid #ccc",
            background: isUploading ? "#e5e7eb" : "#3b82f6",
            color: isUploading ? "#6b7280" : "#fff",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          {isUploading ? `Uploading... ${progress}%` : "Choose File"}
        </button>
      </div>
    );
  };

  return UploadButton;
};
