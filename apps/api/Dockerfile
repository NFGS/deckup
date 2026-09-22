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

FROM node:22-alpine AS runtime
RUN corepack enable
WORKDIR /repo

ENV NODE_ENV=production

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json /repo/pnpm-workspace.yaml /repo/pnpm-lock.yaml ./
COPY --from=builder /repo/packages/shared ./packages/shared
COPY --from=builder /repo/packages/config ./packages/config
COPY --from=builder /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /repo/apps/api/dist ./apps/api/dist
COPY --from=builder /repo/apps/api/prisma ./apps/api/prisma
COPY --from=builder /repo/apps/api/prisma7.config.ts /repo/apps/api/package.json ./apps/api/

USER node
EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
