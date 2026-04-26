"use client";

import { useCallback, useEffect, useState } from "react";
import { UploadDropzone } from "@/lib/uploadx-components";

interface FileItem {
  key: string;
  name: string;
  size: number;
  type: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = sizes[i] ?? "GB";
  return `${(bytes / k ** i).toFixed(1)} ${size}`;
}

export default function Home() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/files");
    const data = (await res.json()) as FileItem[];
    setFiles(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDownload = async (key: string) => {
    const res = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "download", key }),
    });
    const data = (await res.json()) as { url: string };
    window.open(data.url, "_blank");
  };

  const handleDelete = async (key: string) => {
    await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys: [key] }),
    });
    setFiles((prev) => prev.filter((f) => f.key !== key));
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold">uploadx Demo</h1>

      {/* Upload Section */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold">Upload Files</h2>
        <UploadDropzone
          endpoint="fileUploader"
          onClientUploadComplete={() => {
            fetchFiles();
          }}
          onUploadError={(error) => {
            console.error("Upload error:", error);
          }}
        />
      </section>

      {/* File List Section */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Files</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : files.length === 0 ? (
          <p className="text-gray-500">No files uploaded yet.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.key} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{file.name}</td>
                    <td className="px-4 py-3 text-gray-500">{formatBytes(file.size)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(file.key)}
                        className="mr-2 rounded bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(file.key)}
                        className="rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
