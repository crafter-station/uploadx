import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, parse } from "node:path";

export const LINK_FILE = ".uploadx.json";

export interface LinkFile {
  profile?: string;
  appId: string;
}

/**
 * Find the nearest `.uploadx.json`, walking up from a directory.
 *
 * Mirrors how package managers find a project root, so a command run in a
 * subdirectory still targets the repository's app.
 */
export async function findLink(
  from: string = process.cwd(),
): Promise<{ path: string; link: LinkFile } | null> {
  let dir = from;
  const { root } = parse(dir);

  while (true) {
    const path = join(dir, LINK_FILE);
    try {
      const link = JSON.parse(await readFile(path, "utf8")) as LinkFile;
      if (link.appId) return { path, link };
    } catch {
      // Keep walking upwards.
    }
    if (dir === root) return null;
    dir = dirname(dir);
  }
}

export async function writeLink(dir: string, link: LinkFile): Promise<string> {
  const path = join(dir, LINK_FILE);
  await writeFile(path, `${JSON.stringify(link, null, 2)}\n`);
  return path;
}
