import type { FileSize } from "./types";

const SIZE_UNITS: Record<string, number> = {
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
};

/** Parse a human-readable file size string into bytes. `"4MB"` → `4194304` */
export function parseFileSize(size: FileSize): number {
  const match = size.match(/^(\d+(?:\.\d+)?)(KB|MB|GB)$/);
  if (!match) throw new Error(`Invalid file size: ${size}`);
  const value = Number(match[1]);
  const unit = match[2] as string;
  const multiplier = SIZE_UNITS[unit] as number;
  return value * multiplier;
}

/** Check if a MIME type matches a filter key like `"image"`, `"video"`, or `"image/png"`. */
export function matchesMimeFilter(mimeType: string, filterKey: string): boolean {
  // Exact match: "image/png" matches "image/png"
  if (filterKey.includes("/")) return mimeType === filterKey;
  // Category match: "image" matches "image/*"
  if (filterKey === "blob") return true;
  return mimeType.startsWith(`${filterKey}/`);
}

/** Generate a unique object key: `"<uuid>/<sanitized-filename>"` */
export function generateObjectKey(fileName: string): string {
  const id = crypto.randomUUID();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${id}/${sanitized}`;
}
