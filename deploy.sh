#!/usr/bin/env bash
# 使い方: ./deploy.sh <GCPプロジェクトID>
set -euo pipefail
PROJECT="${1:?GCPプロジェクトIDを指定してください}"
REGION=asia-northeast1
SERVICE=keika
MODEL="${GEMINI_MODEL:-gemini-3.5-flash}"

gcloud config set project "$PROJECT"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com aiplatform.googleapis.com artifactregistry.googleapis.com

NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${NUMBER}-compute@developer.gserviceaccount.com" \
  --role=roles/aiplatform.user --condition=None --quiet >/dev/null

# 上限を絞り、クレジット超過を防ぐ
gcloud run deploy "$SERVICE" --source . --region "$REGION" \
  --allow-unauthenticated --max-instances 1 --memory 512Mi --timeout 60 \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT,GOOGLE_CLOUD_LOCATION=global,GEMINI_MODEL=$MODEL"
