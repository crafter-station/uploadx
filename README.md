# uploadx

An open-source [UploadThing](https://docs.uploadthing.com) clone using MinIO for storage. Same API, fully self-hosted.

## Monorepo Structure

```
uploadx/
├── packages/
│   ├── uploadx/          # Core SDK (@uploadx-sdk/core)
│   ├── react/            # React components and hooks (@uploadx-sdk/react)
│   └── cli/              # Command line interface (@uploadx-sdk/cli)
├── apps/
│   ├── dashboard/        # Next.js dashboard
│   └── demo/             # Example app consuming the SDK
└── docker-compose.yml    # MinIO + PostgreSQL local development
```

## Tech Stack

- **Runtime**: Bun
- **Build**: Turborepo + tsup
- **Lint/Format**: Biome
- **Storage**: MinIO (S3-compatible)
- **Framework**: Next.js (App Router)
- **UI**: Tailwind CSS
- **Auth** (dashboard): Clerk

## Getting Started

```bash
# Install dependencies
bun install

# Start MinIO
bun run minio

# Build all packages
bun run build

# Dev mode (watch)
bun run dev
```

## Packages

### `uploadx`

Core SDK with subpath exports:

```ts
import { createUploadx, createRouteHandler } from "uploadx/server";
import { uploadFiles } from "uploadx/client";
import { createNextRouteHandler } from "uploadx/next";
```

### `@uploadx-sdk/cli`

Manage apps, tokens and files from a terminal. The installed command is `uploadx`:

```bash
npm install -g @uploadx-sdk/cli

uploadx login                 # device flow — approve in a browser
uploadx init                  # wire up the current project
uploadx files upload ./dist --recursive --prefix build/
```

Every read command takes `--json`. In CI, set `UPLOADX_TOKEN` to an app token
instead of logging in.

**Using it with a coding agent** — install the skill so Claude Code, Cursor and
friends know the commands and the auth modes:

```bash
npx skills@latest add crafter-station/uploadx --skill=uploadx
```

### `@uploadx/react`

React components and hooks:

```ts
import { generateUploadButton, generateUploadDropzone, useUploadThing } from "@uploadx/react";
```

## Scripts

| Command | Description |
|---|---|
| `bun run build` | Build all packages |
| `bun run dev` | Watch mode |
| `bun run lint` | Lint with Biome |
| `bun run format` | Format with Biome |
| `bun run check` | Lint + format check |
| `bun run type-check` | TypeScript check |
| `bun run minio` | Start MinIO (Docker) |

## MinIO Local Access

- **API**: http://localhost:9000
- **Console**: http://localhost:9001
- **Credentials**: minioadmin / minioadmin

## License

MIT
