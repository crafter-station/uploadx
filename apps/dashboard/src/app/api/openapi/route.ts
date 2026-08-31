import { openApiDocument } from "@/lib/openapi";
import { NextResponse } from "next/server";

/** Serves the OpenAPI document rendered by Scalar at /docs/api. */
export function GET() {
  return NextResponse.json(openApiDocument);
}
