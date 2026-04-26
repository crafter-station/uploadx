import { createUploadx, UploadxAPI } from "@uploadx-sdk/core/server";
import type { FileRouter } from "@uploadx-sdk/core/server";

const f = createUploadx();

export const fileRouter = {
  fileUploader: f({ blob: { maxFileSize: "16MB", maxFileCount: 5 } }).onUploadComplete(
    ({ file }) => {
      console.log("Upload complete:", file.name, file.size);
      return { uploadedBy: "demo" };
    },
  ),
} satisfies FileRouter;

export type AppFileRouter = typeof fileRouter;

// Lazy singleton for hosted mode (async init)
let apiInstance: UploadxAPI | null = null;

export async function getApi(): Promise<UploadxAPI> {
  if (!apiInstance) {
    apiInstance = await UploadxAPI.create();
  }
  return apiInstance;
}
