import { createDb } from "uploadx/db";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://uploadx:uploadx@localhost:5432/uploadx";

export const db = createDb(DATABASE_URL);
