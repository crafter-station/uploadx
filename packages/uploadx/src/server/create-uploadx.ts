import type { FileRouteInput, ResolvedFileRoute, UploadedFile } from "../shared/types";

type MiddlewareFn<TMetadata> = (opts: {
  req: Request;
}) => Promise<TMetadata> | TMetadata;

type OnUploadCompleteFn<TMetadata, TServerData> = (opts: {
  metadata: TMetadata;
  file: UploadedFile;
}) => Promise<TServerData> | TServerData;

interface BuilderAfterMiddleware<TMetadata> {
  onUploadComplete: <TServerData>(
    fn: OnUploadCompleteFn<TMetadata, TServerData>,
  ) => ResolvedFileRoute<TMetadata, TServerData>;
}

interface BuilderAfterConfig {
  middleware: <TMetadata>(fn: MiddlewareFn<TMetadata>) => BuilderAfterMiddleware<TMetadata>;
  onUploadComplete: <TServerData>(
    fn: OnUploadCompleteFn<Record<string, never>, TServerData>,
  ) => ResolvedFileRoute<Record<string, never>, TServerData>;
}

/**
 * Create the uploadx file route builder.
 *
 * ```ts
 * const f = createUploadx();
 * const router = {
 *   imageUploader: f({ image: { maxFileSize: "4MB" } })
 *     .middleware(({ req }) => ({ userId: "123" }))
 *     .onUploadComplete(({ metadata, file }) => {
 *       console.log(metadata.userId); // typed as string
 *     }),
 * } satisfies FileRouter;
 * ```
 */
export const createUploadx = () => {
  const f = (config: FileRouteInput): BuilderAfterConfig => {
    // biome-ignore lint/suspicious/noExplicitAny: middleware type is erased at runtime
    let middlewareFn: MiddlewareFn<any> = () => ({});

    return {
      middleware<TMetadata>(fn: MiddlewareFn<TMetadata>) {
        middlewareFn = fn;
        return {
          onUploadComplete<TServerData>(
            onComplete: OnUploadCompleteFn<TMetadata, TServerData>,
          ): ResolvedFileRoute<TMetadata, TServerData> {
            return {
              config,
              middleware: middlewareFn,
              onUploadComplete: onComplete,
            };
          },
        };
      },
      onUploadComplete<TServerData>(
        onComplete: OnUploadCompleteFn<Record<string, never>, TServerData>,
      ): ResolvedFileRoute<Record<string, never>, TServerData> {
        return {
          config,
          middleware: middlewareFn,
          onUploadComplete: onComplete,
        };
      },
    };
  };

  return f;
};
