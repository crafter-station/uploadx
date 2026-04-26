import { getApi } from "@/lib/uploadx";
import { NextResponse } from "next/server";

export async function GET() {
  const api = await getApi();
  const files = await api.listFiles();
  return NextResponse.json(files);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { action: string; key: string };

  if (body.action === "download") {
    const api = await getApi();
    const url = await api.generateSignedURL(body.key);
    return NextResponse.json({ url });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { keys: string[] };
  const api = await getApi();
  await api.deleteFiles(body.keys);
  return NextResponse.json({ ok: true });
}
