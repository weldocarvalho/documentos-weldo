#!/usr/bin/env bash
set -euo pipefail

export PATH="$HOME/google-cloud-sdk/bin:$PATH"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR/landing"

PROJECT="belter-oracle-aplications"
REGION="${REGION:-us-east1}"
SERVICE="wccorridas-belter-oracle"
REGISTRY_HOST="${REGION}-docker.pkg.dev"
IMAGE="${REGISTRY_HOST}/${PROJECT}/cloud-run-source-deploy/wc-corridas:amd64"
DOMAIN="wc-corridas.belter-oracle.com.br"

echo "==> 1/3 Build da imagem (linux/amd64)..."
docker build --platform linux/amd64 -t "$IMAGE" .

echo "==> 2/3 Push para Artifact Registry..."
gcloud auth configure-docker "$REGISTRY_HOST" --quiet >/dev/null 2>&1
for attempt in 1 2 3 4; do
  docker push "$IMAGE" && break
  sleep 3
done

echo "==> 3/3 Deploy no Cloud Run..."
gcloud run deploy "$SERVICE" \
  --project="$PROJECT" \
  --region="$REGION" \
  --image="$IMAGE" \
  --allow-unauthenticated \
  --port=8080 \
  --memory=256Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=30 \
  --concurrency=200 \
  --cpu-boost \
  --quiet

echo "Deploy concluído."
echo "URL: https://${DOMAIN}"
