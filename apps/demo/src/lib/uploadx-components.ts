import { generateUploadButton, generateUploadDropzone } from "@uploadx/react";
import type { AppFileRouter } from "./uploadx";

export const UploadButton = generateUploadButton<AppFileRouter>();
export const UploadDropzone = generateUploadDropzone<AppFileRouter>();
