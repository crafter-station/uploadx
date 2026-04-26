import type { ClientUploadedFileData } from "@uploadx-sdk/core/client";
import type { FileRouter } from "@uploadx-sdk/core/server";
import { useCallback, useRef, useState } from "react";
import { useUploadX } from "../hooks/use-upload-x";
import { deriveAcceptString, deriveMaxFileCount } from "../utils";

export interface UploadDropzoneProps<TServerData = unknown> {
  endpoint: string;
  onClientUploadComplete?: (res: ClientUploadedFileData<TServerData>[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadBegin?: (fileName: string) => void;
  onUploadProgress?: (progress: number) => void;
  onDrop?: (acceptedFiles: File[]) => void;
  disabled?: boolean;
  url?: string;
  className?: string;
}

export const generateUploadDropzone = <TRouter extends FileRouter>() => {
  const UploadDropzone = (props: UploadDropzoneProps) => {
    const {
      endpoint,
      onClientUploadComplete,
      onUploadError,
      onUploadBegin,
      onUploadProgress,
      onDrop,
      disabled,
      url,
      className,
    } = props;

    const [isDragging, setIsDragging] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    const { startUpload, isUploading, progress, routeConfig } = useUploadX<TRouter>(
      endpoint as keyof TRouter & string,
      { onClientUploadComplete, onUploadError, onUploadBegin, onUploadProgress, url },
    );

    const accept = routeConfig ? deriveAcceptString(routeConfig) : undefined;
    const maxFiles = routeConfig ? deriveMaxFileCount(routeConfig) : undefined;

    const handleFiles = useCallback(
      (files: File[]) => {
        setSelectedFiles(files);
        onDrop?.(files);
      },
      [onDrop],
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && !isUploading) {
          setIsDragging(true);
        }
      },
      [disabled, isUploading],
    );

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
    }, []);

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (disabled || isUploading) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
          handleFiles(files);
        }
      },
      [disabled, isUploading, handleFiles],
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) {
        handleFiles(files);
      }
    };

    const handleUpload = async () => {
      if (selectedFiles.length === 0 || isUploading) return;
      await startUpload(selectedFiles);
      setSelectedFiles([]);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    };

    const state = isUploading ? "uploading" : isDragging ? "dragging" : "ready";

    return (
      <div
        className={className}
        data-state={state}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: 32,
          border: `2px dashed ${isDragging ? "#3b82f6" : "#d1d5db"}`,
          borderRadius: 8,
          background: isDragging ? "#eff6ff" : isUploading ? "#f9fafb" : "#fff",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "border-color 0.2s, background 0.2s",
        }}
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

        {/* Upload icon */}
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDragging ? "#3b82f6" : "#9ca3af"}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          role="img"
          aria-label="Upload icon"
        >
          <title>Upload</title>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        {isUploading ? (
          <>
            <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>Uploading... {progress}%</p>
            <div
              style={{
                width: "100%",
                maxWidth: 200,
                height: 4,
                background: "#e5e7eb",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "#3b82f6",
                  transition: "width 0.2s",
                }}
              />
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 14, color: "#6b7280" }}>
              {isDragging ? "Drop files here" : "Drag & drop files here, or click to browse"}
            </p>
            {selectedFiles.length > 0 ? (
              <>
                <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>
                  {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""} selected
                </p>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={disabled}
                  style={{
                    padding: "6px 16px",
                    borderRadius: 6,
                    border: "none",
                    background: "#3b82f6",
                    color: "#fff",
                    fontWeight: 500,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Upload {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={disabled}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#374151",
                  fontWeight: 500,
                  fontSize: 13,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
              >
                Choose Files
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  return UploadDropzone;
};
