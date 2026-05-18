# syntax=docker/dockerfile:1.7
#
# Phase 1b — backend (NestJS) container image.
# multi-stage: deps → build → runtime. ECS Fargate task 가 ECR 에서 pull 후 실행.
#
# 빌드 (로컬, repo root 에서):
#   docker build -t cp-backend:local -f apps/backend/Dockerfile .
#
# 로컬 검증:
#   docker run --rm -p 3001:3001 \
#     -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=... -e SUPABASE_SERVICE_ROLE_KEY=... \
#     -e OPENAI_API_KEY=... -e IMAGE_GEN_MODE=stub -e FRONTEND_URL=http://localhost:3000 \
#     cp-backend:local
#   curl http://localhost:3001/api/health

ARG NODE_VERSION=22

# -----------------------------------------------------------------------------
# Stage 1: deps — pnpm 으로 backend filter install (전체 monorepo lockfile 사용)
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS deps
RUN npm install -g pnpm@10
WORKDIR /repo
# pnpm 이 lockfile / workspace 가 모두 필요 — root + backend 의 package.json 복사
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json ./apps/backend/
# backend 와 그 transitive 의존만 install
RUN pnpm install --frozen-lockfile --filter backend...

# -----------------------------------------------------------------------------
# Stage 2: build — backend 소스 복사 후 nest build → dist/main.js 산출
# -----------------------------------------------------------------------------
FROM deps AS build
COPY apps/backend ./apps/backend
RUN pnpm --filter backend build

# -----------------------------------------------------------------------------
# Stage 3: runtime — production deps + dist 만 옮긴 최소 이미지
# -----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-slim AS runtime
RUN npm install -g pnpm@10
WORKDIR /app
# package.json / lockfile / workspace 다시 복사 (prod install 용)
COPY --from=build /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/package.json ./
COPY --from=build /repo/apps/backend/package.json ./apps/backend/
# 빌드 산출물
COPY --from=build /repo/apps/backend/dist ./apps/backend/dist
# prod deps 만 install (devDependencies 제외)
RUN pnpm install --frozen-lockfile --filter backend... --prod \
    && pnpm store prune

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001
WORKDIR /app/apps/backend
CMD ["node", "dist/main.js"]
