"use client";

import { ConfirmModal } from "@/components/confirm-modal";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DownloadIcon,
  FileTextIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
  XIcon,
} from "@/components/icons";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface FileItem {
  id: string;
  key: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface UploadItem {
  id: string;
  file: File;
  key?: string;
  presignedUrl?: string;
  progress: number;
  status: "queued" | "uploading" | "complete" | "error";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

let uploadIdCounter = 0;

export default function FilesPage() {
  const { appId } = useParams<{ appId: string }>();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);
  const dragCounterRef = useRef(0);
  const pendingRef = useRef<{ id: string; file: File }[]>([]);

  const isUploading = uploadQueue.some((u) => u.status === "uploading" || u.status === "queued");

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      appId,
      page: String(pagination.page),
      pageSize: String(pagination.pageSize),
    });
    if (search) params.set("search", search);
    const res = await fetch(`/api/files?${params}`);
    if (res.ok) {
      const data = await res.json();
      setFiles(data.files);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [appId, pagination.page, pagination.pageSize, search]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // ── Upload queue processing ──────────────────────────────────────────────

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    while (pendingRef.current.length > 0) {
      const next = pendingRef.current.shift();
      if (!next) break;
      const { id, file } = next;

      setUploadQueue((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: "uploading" as const } : u)),
      );

      try {
        // Phase 1: get presigned URL
        const prepRes = await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId,
            files: [{ name: file.name, size: file.size, type: file.type }],
          }),
        });

        if (!prepRes.ok) throw new Error("Failed to prepare upload");

        const { uploads } = (await prepRes.json()) as {
          uploads: Array<{ key: string; presignedUrl: string }>;
        };

        const target = uploads[0];
        if (!target) throw new Error("No upload target returned");

        // Phase 2: upload to MinIO via XHR for progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("PUT", target.presignedUrl);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              const progress = Math.round((ev.loaded / ev.total) * 100);
              setUploadQueue((prev) => prev.map((u) => (u.id === id ? { ...u, progress } : u)));
            }
          };
          xhr.onload = () => resolve();
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.send(file);
        });

        // Phase 3: register in DB
        await fetch("/api/files/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appId,
            action: "complete",
            files: [
              {
                key: target.key,
                name: file.name,
                size: file.size,
                type: file.type || "application/octet-stream",
              },
            ],
          }),
        });

        setUploadQueue((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "complete" as const, progress: 100 } : u)),
        );
      } catch {
        setUploadQueue((prev) =>
          prev.map((u) => (u.id === id ? { ...u, status: "error" as const } : u)),
        );
      }
    }

    processingRef.current = false;
    fetchFiles();

    // Clear completed items after a delay
    setTimeout(() => {
      setUploadQueue((prev) => prev.filter((u) => u.status !== "complete"));
    }, 2000);
  }, [appId, fetchFiles]);

  // Trigger processing whenever queued items appear
  // biome-ignore lint/correctness/useExhaustiveDependencies: uploadQueue triggers re-check of pendingRef
  useEffect(() => {
    if (pendingRef.current.length > 0 && !processingRef.current) {
      processQueue();
    }
  }, [uploadQueue, processQueue]);

  const addFiles = useCallback((newFiles: File[]) => {
    const items: UploadItem[] = newFiles.map((file) => ({
      id: `upload-${++uploadIdCounter}`,
      file,
      progress: 0,
      status: "queued" as const,
    }));
    pendingRef.current.push(...items.map((i) => ({ id: i.id, file: i.file })));
    setUploadQueue((prev) => [...prev, ...items]);
  }, []);

  const removeFromQueue = (id: string) => {
    pendingRef.current = pendingRef.current.filter((p) => p.id !== id);
    setUploadQueue((prev) => prev.filter((u) => u.id !== id || u.status === "uploading"));
  };

  // ── Drag and drop handlers ───────────────────────────────────────────────

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) addFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    addFiles(Array.from(selectedFiles));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Table handlers ───────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: deleteTarget }),
    });
    setDeleting(false);
    setDeleteTarget(null);
    if (res.ok) fetchFiles();
  };

  const confirmBulkDelete = async () => {
    if (selected.size === 0) return;
    setBulkDeleting(true);
    const res = await fetch("/api/files", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileIds: Array.from(selected) }),
    });
    setBulkDeleting(false);
    setShowBulkDelete(false);
    setSelected(new Set());
    if (res.ok) fetchFiles();
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map((f) => f.id)));
  };

  const goToPage = (p: number) => {
    setPagination((prev) => ({ ...prev, page: p }));
  };

  const handleDownload = async (fileId: string) => {
    const res = await fetch(`/api/files/download?fileId=${fileId}`);
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Files</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          These are all of the files that have been uploaded via your uploader.
        </p>
      </div>

      {/* Dropzone */}
      <button
        type="button"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-4 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 transition-colors ${
          isDragging
            ? "border-red-400 bg-red-50/50 dark:border-red-500 dark:bg-red-950/20"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700 dark:hover:border-zinc-600"
        }`}
      >
        <UploadIcon
          width={32}
          height={32}
          className={`mb-2 ${isDragging ? "text-red-500" : "text-zinc-400"}`}
        />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {isDragging ? "Drop files here" : "Drag & drop files or click to browse"}
        </span>
        <span className="mt-1 text-xs text-zinc-400">Upload files of any size</span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Upload queue */}
      {uploadQueue.length > 0 && (
        <div className="mb-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {isUploading
                ? `Uploading ${uploadQueue.filter((u) => u.status === "complete").length} / ${uploadQueue.length}`
                : `${uploadQueue.length} file${uploadQueue.length > 1 ? "s" : ""} uploaded`}
            </span>
            {!isUploading && (
              <button
                type="button"
                onClick={() => setUploadQueue([])}
                className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {uploadQueue.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                <FileTextIcon width={16} height={16} className="shrink-0 text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {item.file.name}
                    </span>
                    <span className="ml-2 shrink-0 text-xs text-zinc-400">
                      {formatSize(item.file.size)}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          item.status === "error" ? "bg-red-500" : "bg-red-500"
                        }`}
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                      {item.progress}%
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  {item.status === "complete" && (
                    <CheckIcon width={16} height={16} className="text-green-500" />
                  )}
                  {item.status === "error" && (
                    <XIcon width={16} height={16} className="text-red-500" />
                  )}
                  {item.status === "queued" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(item.id);
                      }}
                      className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    >
                      <XIcon width={14} height={14} />
                    </button>
                  )}
                  {item.status === "uploading" && (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-red-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <SearchIcon
            width={16}
            height={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="w-full rounded-lg border border-zinc-300 py-2 pl-9 pr-3 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={() => setShowBulkDelete(true)}
            className="flex items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <TrashIcon width={14} height={14} />
            Delete {selected.size} file{selected.size > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={files.length > 0 && selected.size === files.length}
                  onChange={toggleAll}
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Route
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Size
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Uploaded
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400">
                Status
              </th>
              <th className="w-12 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : files.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  No files found.
                </td>
              </tr>
            ) : (
              files.map((file) => (
                <tr key={file.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(file.id)}
                      onChange={() => toggleSelect(file.id)}
                      className="rounded border-zinc-300 dark:border-zinc-600"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {file.name}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">Serverside Upload</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                    {formatDate(file.uploadedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Uploaded
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownload(file.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                      >
                        <DownloadIcon width={14} height={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(file.id)}
                        className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-red-600 dark:hover:bg-zinc-800"
                      >
                        <TrashIcon width={14} height={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <span className="text-sm text-zinc-500">
            {selected.size} of ~{pagination.total} row(s) selected.
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">Rows per page</span>
            <select
              value={pagination.pageSize}
              onChange={(e) =>
                setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))
              }
              className="rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-zinc-500">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronsLeftIcon width={16} height={16} />
              </button>
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => goToPage(pagination.page - 1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronLeftIcon width={16} height={16} />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.page + 1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronRightIcon width={16} height={16} />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goToPage(pagination.totalPages)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-30 dark:hover:bg-zinc-800"
              >
                <ChevronsRightIcon width={16} height={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={deleteTarget !== null}
        title="Delete file"
        description="Are you sure you want to delete this file? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        open={showBulkDelete}
        title={`Delete ${selected.size} file${selected.size > 1 ? "s" : ""}`}
        description={`Are you sure you want to delete ${selected.size} selected file${selected.size > 1 ? "s" : ""}? This action cannot be undone.`}
        confirmLabel="Delete all"
        variant="danger"
        loading={bulkDeleting}
        onConfirm={confirmBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </div>
  );
}
