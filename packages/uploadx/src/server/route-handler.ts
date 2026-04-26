import {
  createMinioClient,
  ensureBucket,
  generatePresignedGetUrl,
  generatePresignedPutUrl,
  verifyObjectExists,
} from "../minio/client";
import { UploadxError } from "../shared/errors";
import type {
  FileRouteInput,
  FileRouter,
  PresignedUrlResponse,
  UploadCompleteResponse,
  UploadedFile,
  UploadxConfig,
} from "../shared/types";
import { generateObjectKey } from "../shared/utils";
import { resolveBucket, resolveMinioConfig } from "./config";
import { uploadSessions } from "./upload-session";
import { validateFiles } from "./validation";

export interface RouteHandlerConfig {
  router: FileRouter;
  config?: UploadxConfig;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ error: { code, message } }, status);
}

/** Extract the serializable route config map for the client. */
function getRouteConfigs(router: FileRouter): Record<string, FileRouteInput> {
  const configs: Record<string, FileRouteInput> = {};
  for (const [name, route] of Object.entries(router)) {
    configs[name] = route.config;
  }
  return configs;
}

export const createRouteHandler = (handlerConfig: RouteHandlerConfig) => {
  const { router, config } = handlerConfig;

  return {
    /**
     * GET — returns the route config map so the client knows
     * accepted file types, sizes, and counts for each endpoint.
     */
    GET: async (_req: Request): Promise<Response> => {
      return jsonResponse(getRouteConfigs(router));
    },

    /**
     * POST — two actions distinguished by `?action=` query param:
     *
     * - `action=upload`: run middleware, validate files, generate presigned PUT URLs
     * - `action=complete`: verify files in MinIO, run onUploadComplete
     */
    POST: async (req: Request): Promise<Response> => {
      const url = new URL(req.url);
      const action = url.searchParams.get("action");

      try {
        if (action === "upload") {
          return await handleUpload(req, router, config);
        }
        if (action === "complete") {
          return await handleComplete(req, router, config);
        }

        return errorResponse(
          "INVALID_ACTION",
          'Missing or invalid "action" query param. Use ?action=upload or ?action=complete',
          400,
        );
      } catch (err) {
        if (err instanceof UploadxError) {
          const status =
            err.code === "UNAUTHORIZED" ? 401 : err.code === "ROUTE_NOT_FOUND" ? 404 : 400;
          return errorResponse(err.code, err.message, status);
        }
        const message = err instanceof Error ? err.message : "Unknown error";
        return errorResponse("INTERNAL_ERROR", message, 500);
      }
    },
  };
};

// ── POST ?action=upload ───────────────────────────────────────────────────────

interface UploadRequestBody {
  routeEndpoint: string;
  files: Array<{ name: string; size: number; type: string }>;
}

async function handleUpload(
  req: Request,
  router: FileRouter,
  config?: UploadxConfig,
): Promise<Response> {
  const body = (await req.json()) as UploadRequestBody;
  const { routeEndpoint, files } = body;

  // 1. Find the route
  const route = router[routeEndpoint];
  if (!route) {
    throw new UploadxError("ROUTE_NOT_FOUND", `Route "${routeEndpoint}" not found`);
  }

  // 2. Run middleware (auth / metadata)
  let metadata: unknown;
  try {
    metadata = await route.middleware({ req });
  } catch (err) {
    if (err instanceof UploadxError) throw err;
    throw new UploadxError("UNAUTHORIZED", err instanceof Error ? err.message : "Unauthorized");
  }

  // 3. Validate files against route config
  validateFiles(files, route.config);

  // 4. Generate presigned PUT URLs
  const minioConfig = resolveMinioConfig(config?.minio);
  const client = createMinioClient(minioConfig);
  const bucket = resolveBucket(minioConfig);
  await ensureBucket(client, bucket);

  const presignedUrls = await Promise.all(
    files.map(async (file) => {
      const key = generateObjectKey(file.name);
      const url = await generatePresignedPutUrl(client, bucket, key);
      const fileUrl = await generatePresignedGetUrl(client, bucket, key);
      return { url, key, name: file.name, fileUrl };
    }),
  );

  // 5. Store session for later completion
  const sessionFiles = presignedUrls.map((p, i) => {
    const original = files[i];
    return {
      key: p.key,
      name: p.name,
      size: original?.size ?? 0,
      type: original?.type ?? "application/octet-stream",
    };
  });
  const session = uploadSessions.create(routeEndpoint, sessionFiles, metadata);

  const response: PresignedUrlResponse = {
    sessionId: session.id,
    presignedUrls,
  };

  return jsonResponse(response);
}

// ── POST ?action=complete ─────────────────────────────────────────────────────

interface CompleteRequestBody {
  routeEndpoint: string;
  sessionId: string;
  fileKeys: string[];
}

async function handleComplete(
  req: Request,
  router: FileRouter,
  config?: UploadxConfig,
): Promise<Response> {
  const body = (await req.json()) as CompleteRequestBody;
  const { routeEndpoint, sessionId, fileKeys } = body;

  // 1. Find the route
  const route = router[routeEndpoint];
  if (!route) {
    throw new UploadxError("ROUTE_NOT_FOUND", `Route "${routeEndpoint}" not found`);
  }

  // 2. Look up the session
  const session = uploadSessions.get(sessionId);
  if (!session) {
    throw new UploadxError("UPLOAD_FAILED", "Upload session not found or expired");
  }
  if (session.routeEndpoint !== routeEndpoint) {
    throw new UploadxError("UPLOAD_FAILED", "Session route mismatch");
  }

  // 3. Verify files exist in MinIO
  const minioConfig = resolveMinioConfig(config?.minio);
  const client = createMinioClient(minioConfig);
  const bucket = resolveBucket(minioConfig);

  const uploadedFiles: UploadedFile[] = [];
  for (const key of fileKeys) {
    const sessionFile = session.files.find((f) => f.key === key);
    if (!sessionFile) {
      throw new UploadxError("FILE_NOT_FOUND", `File key "${key}" not found in session`);
    }

    const objStat = await verifyObjectExists(client, bucket, key);
    if (!objStat) {
      throw new UploadxError("FILE_NOT_FOUND", `File "${key}" not found in storage`);
    }

    const fileUrl = await generatePresignedGetUrl(client, bucket, key);
    uploadedFiles.push({
      key,
      url: fileUrl,
      name: sessionFile.name,
      size: objStat.size,
      type: sessionFile.type,
    });
  }

  // 4. Run onUploadComplete for each file
  const serverDataResults: unknown[] = [];
  for (const file of uploadedFiles) {
    const serverData = await route.onUploadComplete({
      metadata: session.metadata as Record<string, never>,
      file,
    });
    serverDataResults.push(serverData);
  }

  // 5. Clean up session
  uploadSessions.delete(sessionId);

  const response: UploadCompleteResponse = {
    serverData: serverDataResults,
    files: uploadedFiles,
  };

  return jsonResponse(response);
}
