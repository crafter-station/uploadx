import { UploadAnimation } from "@/components/upload-animation";
import Link from "next/link";

function CodeWindow({
  filename,
  children,
}: {
  filename: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl">
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-500" />
        <span className="h-3 w-3 rounded-full bg-yellow-500" />
        <span className="h-3 w-3 rounded-full bg-green-500" />
        <span className="ml-2 text-xs text-zinc-400">{filename}</span>
      </div>
      <pre className="overflow-x-auto p-5 text-[13px] leading-relaxed text-zinc-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 text-white">
      {/* Grid background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />

      {/* Nav */}
      <nav className="relative border-b border-zinc-800/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            upload<span className="text-red-500">X</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-zinc-400 transition hover:text-white">
              Documentation
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium transition hover:bg-zinc-700"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16 lg:pt-28">
          <div className="flex flex-col-reverse items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
            <div className="max-w-2xl flex-1">
              <h1 className="text-5xl font-bold leading-tight tracking-tight lg:text-6xl">
                Better file uploads <span className="text-red-500">for developers</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-zinc-400">
                Developers deserve better than S3. That&apos;s why we made UploadX, the easier (and
                safer) alternative. From the button to the server, we&apos;ve got you covered.
              </p>
              <div className="mt-8 flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold transition hover:bg-red-700"
                >
                  Get Started for Free
                </Link>
                <Link
                  href="/docs"
                  className="text-sm font-medium text-zinc-300 transition hover:text-white"
                >
                  Documentation &rarr;
                </Link>
              </div>
            </div>
            <div className="w-full max-w-sm shrink-0 lg:max-w-md">
              <UploadAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative border-t border-zinc-800/50">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <p className="font-mono text-sm tracking-widest text-red-500">Your Auth. Our Storage.</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight lg:text-4xl">
            The right balance of security and simplicity.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-zinc-400">
            Authentication happens on your server, the upload happens on ours. Type-safe from client
            to server with full progress tracking.
          </p>

          {/* Feature grid */}
          <div className="mt-16 grid gap-8 text-left sm:grid-cols-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="mb-3 text-2xl">&#9889;</div>
              <h3 className="font-semibold">Presigned Uploads</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Files go directly from the browser to storage via presigned URLs. No server
                bottleneck.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="mb-3 text-2xl">&#128274;</div>
              <h3 className="font-semibold">Type-safe Middleware</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Run auth and validation on your server before any upload starts. Full TypeScript
                inference.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <div className="mb-3 text-2xl">&#9881;&#65039;</div>
              <h3 className="font-semibold">Self-hosted MinIO</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Your data stays on your infrastructure. S3-compatible storage you control
                completely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Code Preview */}
      <section className="relative border-t border-zinc-800/50">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-6 lg:grid-cols-2">
            <CodeWindow filename="server.ts">
              <span className="text-violet-400">export const</span>{" "}
              <span className="text-blue-300">fileRouter</span>{" "}
              <span className="text-zinc-500">= {"{"}</span>
              {"\n"}
              {"  "}
              <span className="text-blue-300">imageUploader</span>
              {": "}
              <span className="text-yellow-300">f</span>
              {"({ "}
              <span className="text-green-300">image</span>
              {": { "}
              <span className="text-blue-300">maxFileSize</span>
              {': "'}
              <span className="text-green-300">4MB</span>
              {'" '} {"} })"}
              {"\n"}
              {"    ."}
              <span className="text-yellow-300">middleware</span>
              {"("}
              <span className="text-violet-400">async</span>
              {" ({ "}
              <span className="text-orange-300">req</span>
              {" }) => {"}
              {"\n"}
              {"      "}
              <span className="text-zinc-500">
                {"// This code runs on your server before upload"}
              </span>
              {"\n"}
              {"      "}
              <span className="text-violet-400">const</span>{" "}
              <span className="text-blue-300">user</span>
              {" = "}
              <span className="text-violet-400">await</span>{" "}
              <span className="text-yellow-300">auth</span>
              {"(req);"}
              {"\n\n"}
              {"      "}
              <span className="text-zinc-500">{"// Throw to block uploading"}</span>
              {"\n"}
              {"      "}
              <span className="text-violet-400">if</span>
              {" (!user) "}
              <span className="text-violet-400">throw new</span>{" "}
              <span className="text-red-400">Error</span>
              {'("Unauthorized");'}
              {"\n\n"}
              {"      "}
              <span className="text-violet-400">return</span>
              {" { "}
              <span className="text-blue-300">userId</span>
              {": user.id };"}
              {"\n"}
              {"    }),"}
            </CodeWindow>

            <CodeWindow filename="client.tsx">
              {"<"}
              <span className="text-blue-300">UploadButton</span>
              {"\n"}
              {"  "}
              <span className="text-green-300">endpoint</span>
              {"="}
              <span className="text-yellow-300">{'"imageUploader"'}</span>
              {"  "}
              <span className="text-zinc-500">{"// Typesafe btw"}</span>
              {"\n"}
              {"  "}
              <span className="text-green-300">onClientUploadComplete</span>
              {"="}
              <span className="text-zinc-500">{"{(response) => ...}"}</span>
              {"\n"}
              {"  "}
              <span className="text-green-300">onUploadError</span>
              {"="}
              <span className="text-zinc-500">{"{(error) => ...}"}</span>
              {"\n"}
              {"/>"}
            </CodeWindow>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-zinc-800/50 py-8 text-center text-sm text-zinc-500">
        <div className="mx-auto max-w-6xl px-6">
          UploadX &mdash; Open-source file uploads for modern apps.
        </div>
      </footer>
    </div>
  );
}
