#!/usr/bin/env bash
# 로컬 발행 라운드트립 검증용 n8n 컨테이너를 띄운다 (idempotent).
# Docker 가 없거나 데몬이 꺼져 있으면 경고만 하고 통과 — 백엔드 dev 기동을 막지 않는다.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT/docker-compose.dev.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "⚠️  docker 가 없어 n8n 을 건너뜁니다. (발행 라운드트립 검증 시에만 필요)"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  echo "⚠️  Docker 데몬이 꺼져 있어 n8n 을 건너뜁니다. (검증하려면 Docker Desktop 을 켜세요)"
  exit 0
fi

echo "🐳 n8n 기동 (docker compose up -d)..."
docker compose -f "$COMPOSE_FILE" up -d
echo "✅ n8n → http://localhost:5678  (워크플로우는 cp-n8n-data 볼륨에 영속)"
