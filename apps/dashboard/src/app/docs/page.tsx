"use client";

import { useCallback, useMemo, useState } from "react";
import { highlight } from "sugar-high";

// ── CodeBlock with copy button ──────────────────────────────────────────────

function CodeBlock({ code, filename }: { code: string; filename?: string }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(code), [code]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [code]);

  return (
    <div className="relative my-4 rounded-lg border border-zinc-800 bg-zinc-950">
      {filename && (
        <div className="border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400">{filename}</div>
      )}
      <button
        type="button"
        onClick={handleCopy}
        className="absolute right-3 top-2.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-zinc-300">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  );
}

// ── Section anchor ──────────────────────────────────────────────────────────

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 pb-10">
      <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{children}</div>
    </section>
  );
}

// ── Nav items ───────────────────────────────────────────────────────────────

const NAV = [
  { id: "installation", label: "Installation" },
  { id: "env", label: "Environment" },
  { id: "file-router", label: "File Router" },
  { id: "route-handler", label: "Route Handler" },
  { id: "file-serving", label: "File Serving" },
  { id: "react", label: "React Components" },
  { id: "hook", label: "useUploadX Hook" },
  { id: "server-api", label: "Server API" },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  return (
    <div className="flex gap-10">
      {/* Sticky sidebar nav */}
      <nav className="hidden w-48 shrink-0 lg:block">
        <div className="sticky top-6 space-y-1">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            On this page
          </p>
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="block rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="min-w-0 max-w-3xl flex-1">
        <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Getting Started
        </h1>
        <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
          Integrate file uploads into your Next.js app in minutes.
        </p>

        {/* ── 1. Installation ──────────────────────────────────────────── */}
        <Section id="installation" title="1. Installation">
          <p className="mb-2">Install the SDK and React components in your Next.js project:</p>
          <CodeBlock code="bun add @uploadx-sdk/core @uploadx-sdk/react" />
          <p>Or with npm / pnpm:</p>
          <CodeBlock code="npm install @uploadx-sdk/core @uploadx-sdk/react" />
        </Section>

        {/* ── 2. Environment ───────────────────────────────────────────── */}
        <Section id="env" title="2. Environment Setup">
          <p className="mb-2">
            Create a{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              .env.local
            </code>{" "}
            file with your API token and the dashboard URL. You can generate a token from the{" "}
            <strong>Tokens</strong> page of your app.
          </p>
          <CodeBlock
            filename=".env.local"
            code={`UPLOADX_TOKEN=upx_live_your_token_here
UPLOADX_URL=http://localhost:3000`}
          />
          <p>
            That&apos;s it — no MinIO or storage configuration needed. The SDK automatically fetches
            connection details from the dashboard.
          </p>
        </Section>

        {/* ── 3. File Router ───────────────────────────────────────────── */}
        <Section id="file-router" title="3. Define a File Router">
          <p className="mb-2">
            A <strong>File Router</strong> declares what files your app accepts. Each route
            specifies file types, size limits, and what happens after upload.
          </p>
          <CodeBlock
            filename="src/lib/uploadx.ts"
            code={`import { createUploadx } from "@uploadx-sdk/core/server";
import type { FileRouter } from "@uploadx-sdk/core/server";

const f = createUploadx();

export const fileRouter = {
  // Accept up to 5 images, max 4MB each
  imageUploader: f({ image: { maxFileSize: "4MB", maxFileCount: 5 } })
    .middleware(({ req }) => {
      // Run server-side logic (auth, etc.)
      // Return metadata accessible in onUploadComplete
      return { userId: "user_123" };
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("Upload by", metadata.userId, ":", file.name);
      return { uploadedBy: metadata.userId };
    }),

  // Accept any file type up to 16MB
  fileUploader: f({ blob: { maxFileSize: "16MB" } })
    .onUploadComplete(({ file }) => {
      console.log("File uploaded:", file.name, file.size);
    }),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;`}
          />
          <p className="mt-3">
            <strong>File types:</strong>{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              image
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              video
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              audio
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              pdf
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              text
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              blob
            </code>{" "}
            (any). Size limits:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              &quot;4MB&quot;
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              &quot;512KB&quot;
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              &quot;1GB&quot;
            </code>
            .
          </p>
        </Section>

        {/* ── 4. Route Handler ─────────────────────────────────────────── */}
        <Section id="route-handler" title="4. Create the Route Handler">
          <p className="mb-2">
            Expose the file router as a Next.js API route. This handles presigned URL generation and
            upload completion.
          </p>
          <CodeBlock
            filename="src/app/api/uploadx/route.ts"
            code={`import { createNextRouteHandler } from "@uploadx-sdk/core/next";
import { fileRouter } from "@/lib/uploadx";

export const { GET, POST } = createNextRouteHandler({
  router: fileRouter,
});`}
          />
        </Section>

        {/* ── 5. File Serving ──────────────────────────────────────────── */}
        <Section id="file-serving" title="5. File Serving (Public URLs)">
          <p className="mb-2">
            Serve uploaded files through permanent, public URLs — no expiring presigned links. Mount
            a catch-all route that streams files directly from storage:
          </p>
          <CodeBlock
            filename="src/app/api/uploadx/f/[...key]/route.ts"
            code={`import { createNextFileServeHandler } from "@uploadx-sdk/core/next";

export const { GET } = createNextFileServeHandler();`}
          />
          <p className="mb-2 mt-4">Files are now accessible at stable URLs that never expire:</p>
          <CodeBlock
            code={`// Use in <img> tags, links, or anywhere you need a permanent URL
<img src="/api/uploadx/f/abc123-photo.png" />

// Or build the URL from a file key
const publicUrl = \`/api/uploadx/f/\${file.key}\`;`}
          />
          <p className="mt-3">
            The handler sets proper{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              Content-Type
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              ETag
            </code>
            , and{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              Cache-Control
            </code>{" "}
            headers automatically. Images display inline, PDFs render in the browser, and other
            files are served with their original content type.
          </p>
        </Section>

        {/* ── 6. React Components ──────────────────────────────────────── */}
        <Section id="react" title="6. React Components">
          <p className="mb-2">Generate type-safe upload components bound to your file router:</p>
          <CodeBlock
            filename="src/lib/uploadx-components.ts"
            code={`import { generateUploadButton, generateUploadDropzone } from "@uploadx-sdk/react";
import type { AppFileRouter } from "./uploadx";

export const UploadButton = generateUploadButton<AppFileRouter>();
export const UploadDropzone = generateUploadDropzone<AppFileRouter>();`}
          />
          <p className="mb-2 mt-4">Then use them in any client component:</p>
          <CodeBlock
            filename="src/app/page.tsx"
            code={`"use client";

import { UploadDropzone } from "@/lib/uploadx-components";

export default function Home() {
  return (
    <UploadDropzone
      endpoint="imageUploader"
      onClientUploadComplete={(files) => {
        console.log("Uploaded:", files);
      }}
      onUploadError={(error) => {
        console.error("Error:", error);
      }}
    />
  );
}`}
          />
          <p className="mt-3">
            <strong>UploadButton</strong> renders a simple button with a hidden file input.{" "}
            <strong>UploadDropzone</strong> renders a drag-and-drop zone with a progress bar.
          </p>
        </Section>

        {/* ── 7. useUploadX Hook ───────────────────────────────────────── */}
        <Section id="hook" title="7. useUploadX Hook">
          <p className="mb-2">
            For full control, use the hook directly instead of the pre-built components:
          </p>
          <CodeBlock
            code={`"use client";

import { useUploadX } from "@uploadx-sdk/react";
import type { AppFileRouter } from "@/lib/uploadx";

export function CustomUploader() {
  const { startUpload, isUploading, progress } = useUploadX<AppFileRouter>({
    endpoint: "imageUploader",
    onClientUploadComplete: (files) => {
      console.log("Done:", files);
    },
  });

  return (
    <div>
      <input
        type="file"
        onChange={async (e) => {
          const files = Array.from(e.target.files ?? []);
          await startUpload(files);
        }}
      />
      {isUploading && <p>Uploading... {progress}%</p>}
    </div>
  );
}`}
          />
          <p className="mt-3">
            The hook returns:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              startUpload
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              isUploading
            </code>
            ,{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              progress
            </code>{" "}
            (0-100), and{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              routeConfig
            </code>{" "}
            (file type constraints).
          </p>
        </Section>

        {/* ── 8. Server API ────────────────────────────────────────────── */}
        <Section id="server-api" title="8. Server-side API">
          <p className="mb-2">
            Use <strong>UploadxAPI</strong> on the server to list, delete, or generate download URLs
            for files:
          </p>
          <CodeBlock
            code={`import { UploadxAPI } from "@uploadx-sdk/core/server";

// Create instance (auto-fetches config from dashboard via token)
const api = await UploadxAPI.create();

// List all files in the bucket
const files = await api.listFiles();

// Generate a signed download URL (valid 1 hour)
const url = await api.generateSignedURL("file-key", 3600);

// Delete files
await api.deleteFiles(["file-key-1", "file-key-2"]);`}
          />
          <p className="mt-3">Example: create an API route for file management in your app:</p>
          <CodeBlock
            filename="src/app/api/files/route.ts"
            code={`import { NextResponse } from "next/server";
import { UploadxAPI } from "@uploadx-sdk/core/server";

let api: UploadxAPI | null = null;
async function getApi() {
  if (!api) api = await UploadxAPI.create();
  return api;
}

export async function GET() {
  const files = await (await getApi()).listFiles();
  return NextResponse.json(files);
}

export async function DELETE(request: Request) {
  const { keys } = await request.json();
  await (await getApi()).deleteFiles(keys);
  return NextResponse.json({ ok: true });
}`}
          />
        </Section>
      </div>
    </div>
  );
}
