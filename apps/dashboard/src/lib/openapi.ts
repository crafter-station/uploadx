/**
 * OpenAPI description of the UploadX dashboard HTTP API.
 *
 * Served as JSON from `GET /api/openapi` and rendered with Scalar at `/docs/api`.
 * Keep this in sync with the route handlers under `src/app/api/`.
 */

/** An error response with the given description. */
const errorResponse = (description: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
    },
  },
});

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "UploadX API",
    version: "1.0.0",
    description: [
      "HTTP API behind the UploadX dashboard.",
      "",
      "Two kinds of caller are supported:",
      "",
      "- **API tokens** (`upx_live_…`) — used by the SDK and by your own backend. Pass them as",
      "  `Authorization: Bearer <token>`, or in the request body where noted.",
      "- **Dashboard session** — Clerk cookie auth, used by the dashboard UI itself. Endpoints",
      "  tagged *Dashboard* are only reachable from a signed-in browser session.",
      "",
      "Generate a token from the **Tokens** page of your app.",
    ].join("\n"),
  },
  servers: [
    { url: "https://uploadx.crafter.run", description: "Hosted dashboard" },
    { url: "http://localhost:3000", description: "Local development" },
  ],
  tags: [
    { name: "Tokens", description: "Create, list, revoke and validate API tokens." },
    { name: "Files", description: "List, register and delete uploaded files." },
    { name: "Uploads", description: "Presigned upload URLs and upload completion." },
    { name: "Apps", description: "Manage apps and their storage buckets." },
  ],
  paths: {
    "/api/tokens/validate": {
      post: {
        tags: ["Tokens"],
        summary: "Validate an API token",
        description:
          "Called by the SDK on startup to exchange an `UPLOADX_TOKEN` for the app's bucket and storage connection details. Updates the token's `lastUsedAt`. This endpoint is public — no session required.",
        operationId: "validateToken",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token"],
                properties: {
                  token: {
                    type: "string",
                    description: "The raw API token.",
                    examples: ["upx_live_1a2b3c4d5e6f"],
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Token is valid",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    valid: { type: "boolean", const: true },
                    appId: { type: "string", format: "uuid" },
                    bucketName: { type: "string" },
                    minio: { $ref: "#/components/schemas/StorageConfig" },
                  },
                },
              },
            },
          },
          400: errorResponse("Token missing"),
          401: errorResponse("Invalid token"),
          404: errorResponse("App not found"),
        },
      },
    },

    "/api/files": {
      get: {
        tags: ["Files"],
        summary: "List files",
        description:
          "Returns a paginated list of files for an app. Authenticate with a Bearer token, or pass `appId` when calling from the dashboard.",
        operationId: "listFiles",
        parameters: [
          {
            name: "appId",
            in: "query",
            required: false,
            description: "App to list files for. Ignored when a Bearer token is supplied.",
            schema: { type: "string", format: "uuid" },
          },
          {
            name: "search",
            in: "query",
            required: false,
            description: "Case-sensitive substring match on the file name.",
            schema: { type: "string" },
          },
          {
            name: "page",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, default: 1 },
          },
          {
            name: "pageSize",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 10 },
          },
          {
            name: "dir",
            in: "query",
            required: false,
            description: "Sort direction on `uploadedAt`.",
            schema: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
        ],
        responses: {
          200: {
            description: "A page of files",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    files: {
                      type: "array",
                      items: { $ref: "#/components/schemas/File" },
                    },
                    pagination: { $ref: "#/components/schemas/Pagination" },
                  },
                },
              },
            },
          },
          400: errorResponse("Neither `appId` nor a Bearer token was supplied"),
          401: errorResponse("Invalid token"),
        },
      },
      post: {
        tags: ["Files"],
        summary: "Register uploaded files",
        description:
          "Records file metadata after the client has uploaded directly to storage. Authenticates with the token in the request body rather than a header.",
        operationId: "registerFiles",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["token", "files"],
                properties: {
                  token: { type: "string", examples: ["upx_live_1a2b3c4d5e6f"] },
                  files: {
                    type: "array",
                    minItems: 1,
                    items: { $ref: "#/components/schemas/FileInput" },
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Files registered",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    files: { type: "array", items: { $ref: "#/components/schemas/File" } },
                  },
                },
              },
            },
          },
          400: errorResponse("`token` or `files` missing"),
          401: errorResponse("Invalid token"),
        },
      },
      delete: {
        tags: ["Files"],
        summary: "Delete files",
        description:
          "Removes objects from storage and their metadata rows. With a Bearer token, delete by storage `keys`. From the dashboard, delete by `fileId` or `fileIds`.",
        operationId: "deleteFiles",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  keys: {
                    type: "array",
                    items: { type: "string" },
                    description: "Storage keys. Required when authenticating with a Bearer token.",
                  },
                  fileId: {
                    type: "string",
                    format: "uuid",
                    description: "Single file id. Dashboard session only.",
                  },
                  fileIds: {
                    type: "array",
                    items: { type: "string", format: "uuid" },
                    description: "Several file ids. Dashboard session only.",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Files deleted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Success" } },
            },
          },
          400: errorResponse("No `keys`, `fileId` or `fileIds` supplied"),
          401: errorResponse("Invalid token"),
        },
      },
    },

    "/api/files/download": {
      get: {
        tags: ["Files"],
        summary: "Get a presigned download URL",
        description: "Returns a presigned GET URL for a stored file, valid for one hour.",
        operationId: "getDownloadUrl",
        security: [{ dashboardSession: [] }],
        parameters: [
          {
            name: "fileId",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Presigned URL",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { url: { type: "string", format: "uri" } },
                },
              },
            },
          },
          400: errorResponse("`fileId` missing"),
          404: errorResponse("File or app not found"),
        },
      },
    },

    "/api/files/upload": {
      post: {
        tags: ["Uploads"],
        summary: "Request presigned upload URLs, or complete an upload",
        description: [
          "Two-phase upload used by the dashboard uploader.",
          "",
          "1. Omit `action` to receive a presigned PUT URL per file, valid for one hour.",
          '2. Send `action: "complete"` with the returned `key` for each file to record its metadata.',
        ].join("\n"),
        operationId: "createUpload",
        security: [{ dashboardSession: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/PresignUploadRequest" },
                  { $ref: "#/components/schemas/CompleteUploadRequest" },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: "Presigned URLs (phase 1) or registered files (phase 2)",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        uploads: {
                          type: "array",
                          items: { $ref: "#/components/schemas/PresignedUpload" },
                        },
                      },
                    },
                    {
                      type: "object",
                      properties: {
                        files: { type: "array", items: { $ref: "#/components/schemas/File" } },
                      },
                    },
                  ],
                },
              },
            },
          },
          400: errorResponse("`appId` or `files` missing"),
          404: errorResponse("App not found"),
        },
      },
    },

    "/api/apps": {
      get: {
        tags: ["Apps"],
        summary: "List apps, or fetch one",
        description:
          "Without `appId`, lists every app for the caller's organization. With `appId`, returns that single app.",
        operationId: "listApps",
        security: [{ dashboardSession: [] }],
        parameters: [
          {
            name: "appId",
            in: "query",
            required: false,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Apps",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    {
                      type: "object",
                      properties: {
                        apps: { type: "array", items: { $ref: "#/components/schemas/App" } },
                      },
                    },
                    {
                      type: "object",
                      properties: { app: { $ref: "#/components/schemas/App" } },
                    },
                  ],
                },
              },
            },
          },
          400: errorResponse("No active organization"),
          404: errorResponse("App not found"),
        },
      },
      post: {
        tags: ["Apps"],
        summary: "Create an app",
        description: "Creates the app and provisions a dedicated storage bucket for it.",
        operationId: "createApp",
        security: [{ dashboardSession: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name"],
                properties: {
                  name: { type: "string", examples: ["My App"] },
                  storageLimit: {
                    type: ["integer", "null"],
                    description: "Storage limit in bytes. `null` means unlimited.",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "App created",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/App" } },
            },
          },
          400: errorResponse("`name` missing, or no active organization"),
        },
      },
      patch: {
        tags: ["Apps"],
        summary: "Update an app",
        operationId: "updateApp",
        security: [{ dashboardSession: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["appId"],
                properties: {
                  appId: { type: "string", format: "uuid" },
                  name: { type: "string" },
                  storageLimit: { type: ["integer", "null"] },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Updated app",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/App" } },
            },
          },
          400: errorResponse("`appId` missing"),
        },
      },
      delete: {
        tags: ["Apps"],
        summary: "Delete an app",
        description:
          "Empties and removes the app's bucket, then deletes the app. Tokens and file metadata are removed with it.",
        operationId: "deleteApp",
        security: [{ dashboardSession: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["appId"],
                properties: { appId: { type: "string", format: "uuid" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "App deleted",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Success" } },
            },
          },
          400: errorResponse("`appId` missing"),
          404: errorResponse("App not found"),
        },
      },
    },

    "/api/tokens": {
      get: {
        tags: ["Tokens"],
        summary: "List an app's tokens",
        description:
          "Token hashes are never returned — only the display prefix and usage metadata.",
        operationId: "listTokens",
        security: [{ dashboardSession: [] }],
        parameters: [
          {
            name: "appId",
            in: "query",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: {
            description: "Tokens, newest first",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    tokens: { type: "array", items: { $ref: "#/components/schemas/ApiToken" } },
                  },
                },
              },
            },
          },
          400: errorResponse("`appId` missing"),
        },
      },
      post: {
        tags: ["Tokens"],
        summary: "Create a token",
        description:
          "The raw token is returned **once** and only stored as a SHA-256 hash. Copy it immediately.",
        operationId: "createToken",
        security: [{ dashboardSession: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["appId", "name"],
                properties: {
                  appId: { type: "string", format: "uuid" },
                  name: { type: "string", examples: ["Production"] },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Token created",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    token: { type: "string", examples: ["upx_live_1a2b3c4d5e6f"] },
                  },
                },
              },
            },
          },
          400: errorResponse("`appId` or `name` missing"),
        },
      },
      delete: {
        tags: ["Tokens"],
        summary: "Revoke a token",
        operationId: "deleteToken",
        security: [{ dashboardSession: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tokenId"],
                properties: { tokenId: { type: "string", format: "uuid" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Token revoked",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/Success" } },
            },
          },
          400: errorResponse("`tokenId` missing"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerToken: {
        type: "http",
        scheme: "bearer",
        description: "An UploadX API token, e.g. `Authorization: Bearer upx_live_…`.",
      },
      dashboardSession: {
        type: "apiKey",
        in: "cookie",
        name: "__session",
        description:
          "Clerk session cookie. Set automatically for a signed-in dashboard browser session.",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
      Success: {
        type: "object",
        properties: { success: { type: "boolean", const: true } },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          pageSize: { type: "integer" },
          total: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      App: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          teamId: { type: "string", format: "uuid" },
          name: { type: "string" },
          bucketName: { type: "string" },
          storageLimit: {
            type: ["integer", "null"],
            description: "Storage limit in bytes. `null` means unlimited.",
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      ApiToken: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          name: { type: "string" },
          tokenPrefix: {
            type: "string",
            description: "First characters of the token, for display only.",
          },
          lastUsedAt: { type: ["string", "null"], format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      File: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          appId: { type: "string", format: "uuid" },
          key: { type: "string", description: "Storage key inside the app's bucket." },
          name: { type: "string" },
          size: { type: "integer", description: "Size in bytes." },
          type: { type: "string", description: "MIME type." },
          uploadedAt: { type: "string", format: "date-time" },
        },
      },
      FileInput: {
        type: "object",
        required: ["key", "name", "size", "type"],
        properties: {
          key: { type: "string" },
          name: { type: "string" },
          size: { type: "integer" },
          type: { type: "string" },
        },
      },
      PresignUploadRequest: {
        type: "object",
        title: "Request presigned URLs",
        required: ["appId", "files"],
        properties: {
          appId: { type: "string", format: "uuid" },
          files: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              required: ["name", "size", "type"],
              properties: {
                name: { type: "string" },
                size: { type: "integer" },
                type: { type: "string" },
              },
            },
          },
        },
      },
      CompleteUploadRequest: {
        type: "object",
        title: "Complete an upload",
        required: ["appId", "action", "files"],
        properties: {
          appId: { type: "string", format: "uuid" },
          action: { type: "string", const: "complete" },
          files: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/FileInput" },
          },
        },
      },
      PresignedUpload: {
        type: "object",
        properties: {
          key: { type: "string", description: "Storage key to send back when completing." },
          name: { type: "string" },
          size: { type: "integer" },
          type: { type: "string" },
          presignedUrl: {
            type: "string",
            format: "uri",
            description: "PUT the file bytes here. Valid for one hour.",
          },
        },
      },
      StorageConfig: {
        type: "object",
        properties: {
          endPoint: { type: "string" },
          port: { type: "integer" },
          useSSL: { type: "boolean" },
          accessKey: { type: "string" },
          secretKey: { type: "string" },
        },
      },
    },
  },
  security: [{ bearerToken: [] }],
};
