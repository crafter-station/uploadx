import { type RouteHandlerConfig, createRouteHandler } from "../server/route-handler";

export const createNextRouteHandler = (config: RouteHandlerConfig) => {
  const handler = createRouteHandler(config);
  return {
    GET: handler.GET,
    POST: handler.POST,
  };
};
