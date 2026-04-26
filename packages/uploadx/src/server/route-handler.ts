import type { FileRouter, UploadxConfig } from "../shared/types";

export interface RouteHandlerConfig {
  router: FileRouter;
  config?: UploadxConfig;
}

export const createRouteHandler = (_config: RouteHandlerConfig) => {
  return {
    GET: async (_req: Request) => {
      // TODO: return route config for client
      return new Response("Not implemented", { status: 501 });
    },
    POST: async (_req: Request) => {
      // TODO: handle presigned URL requests
      return new Response("Not implemented", { status: 501 });
    },
  };
};
