# syntax=docker/dockerfile:1.7

FROM oven/bun:1.2 AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json bun.lock turbo.json tsconfig.base.json biome.jsonc ./
COPY apps/dashboard/package.json ./apps/dashboard/
COPY packages/uploadx/package.json ./packages/uploadx/
COPY packages/react/package.json ./packages/react/
RUN bun install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/bun.lock ./bun.lock
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/dashboard ./apps/dashboard

WORKDIR /app/apps/dashboard
EXPOSE 3000
CMD ["bun", "run", "start"]
