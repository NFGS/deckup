# syntax=docker/dockerfile:1
# Build context: repository root.
#   docker build -f apps/api/Dockerfile -t deckup-api .

FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile

COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @deckup/shared build && pnpm --filter @deckup/api build
RUN pnpm --filter @deckup/api deploy --legacy --prod /opt/deckup

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /opt/deckup/node_modules ./node_modules
COPY --from=builder /opt/deckup/dist ./dist
COPY --from=builder /opt/deckup/prisma ./prisma
COPY --from=builder /opt/deckup/prisma7.config.ts ./prisma7.config.ts
COPY --from=builder /opt/deckup/package.json ./package.json

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
