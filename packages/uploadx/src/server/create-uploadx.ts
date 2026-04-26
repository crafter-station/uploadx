import type { FileRouteConfig } from "../shared/types";

export const createUploadx = () => {
  return (_config: FileRouteConfig) => {
    return {
      middleware: (_fn: (opts: { req: Request }) => unknown) => {
        return {
          onUploadComplete: (_fn: (opts: { metadata: unknown; file: unknown }) => unknown) => {
            // TODO: implement file route builder
          },
        };
      },
    };
  };
};
