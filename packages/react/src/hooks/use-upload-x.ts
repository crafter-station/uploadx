import { useCallback, useEffect, useRef, useState } from "react";
import { type ClientUploadedFileData, uploadFiles } from "uploadx/client";
import type { FileRouteInput, FileRouter } from "uploadx/server";

export interface UseUploadThingProps<TServerData = unknown> {
  onClientUploadComplete?: (res: ClientUploadedFileData<TServerData>[]) => void;
  onUploadError?: (error: Error) => void;
  onUploadProgress?: (progress: number) => void;
  onUploadBegin?: (fileName: string) => void;
  /** Base URL of the uploadx route handler. Defaults to `"/api/uploadx"`. */
  url?: string;
}

export interface UseUploadThingReturn<TServerData = unknown> {
  startUpload: (files: File[]) => Promise<ClientUploadedFileData<TServerData>[] | undefined>;
  isUploading: boolean;
  /** Per-file progress percentages (averaged into a single 0-100 value). */
  progress: number;
  /** Route config fetched from the server (available after mount). */
  routeConfig: FileRouteInput | undefined;
}

export const useUploadX = <TRouter extends FileRouter>(
  endpoint: keyof TRouter & string,
  opts?: UseUploadThingProps,
): UseUploadThingReturn => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [routeConfig, setRouteConfig] = useState<FileRouteInput | undefined>(undefined);
  const baseUrl = opts?.url ?? "/api/uploadx";
  const optsRef = useRef(opts);
  optsRef.current = opts;

  // Fetch route config on mount
  useEffect(() => {
    let cancelled = false;
    fetch(baseUrl)
      .then((res) => res.json())
      .then((configs: Record<string, FileRouteInput>) => {
        if (!cancelled && configs[endpoint]) {
          setRouteConfig(configs[endpoint]);
        }
      })
      .catch(() => {
        // Silently ignore — route config is optional for functionality
      });
    return () => {
      cancelled = true;
    };
  }, [baseUrl, endpoint]);

  const startUpload = useCallback(
    async (files: File[]) => {
      setIsUploading(true);
      setProgress(0);

      const fileProgress = new Map<string, number>();
      for (const f of files) {
        fileProgress.set(f.name, 0);
      }

      try {
        const result = await uploadFiles({
          files,
          endpoint,
          url: baseUrl,
          onUploadBegin: ({ file }) => {
            optsRef.current?.onUploadBegin?.(file);
          },
          onUploadProgress: ({ file, progress: filePercent }) => {
            fileProgress.set(file, filePercent);
            // Average progress across all files
            let total = 0;
            for (const p of fileProgress.values()) {
              total += p;
            }
            const avg = Math.round(total / fileProgress.size);
            setProgress(avg);
            optsRef.current?.onUploadProgress?.(avg);
          },
        });

        setProgress(100);
        optsRef.current?.onClientUploadComplete?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        optsRef.current?.onUploadError?.(error);
        return undefined;
      } finally {
        setIsUploading(false);
      }
    },
    [endpoint, baseUrl],
  );

  return { startUpload, isUploading, progress, routeConfig };
};
