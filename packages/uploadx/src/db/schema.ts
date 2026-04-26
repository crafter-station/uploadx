import { bigint, integer, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkOrgId: varchar("clerk_org_id", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  bucketName: varchar("bucket_name", { length: 255 }).notNull().unique(),
  /** Storage limit in bytes. null = unlimited. */
  storageLimit: bigint("storage_limit", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  /** SHA-256 hash of the actual token. The raw token is only shown once at creation. */
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  /** First 8 chars of the token for display: "upx_live_abc12345..." */
  tokenPrefix: varchar("token_prefix", { length: 20 }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fileMetadata = pgTable("file_metadata", {
  id: uuid("id").primaryKey().defaultRandom(),
  appId: uuid("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  name: varchar("name", { length: 1024 }).notNull(),
  size: integer("size").notNull(),
  type: varchar("type", { length: 255 }).notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});
