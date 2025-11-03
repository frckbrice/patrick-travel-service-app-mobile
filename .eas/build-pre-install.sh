#!/bin/bash
# EAS Build Hook: Runs before npm install
# This script creates google-services.json from EAS secret

if [ -n "$GOOGLE_SERVICES_JSON" ]; then
  echo "Creating google-services.json from EAS secret..."
  echo "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json
  echo "✅ google-services.json created successfully"
  ls -la google-services.json
else
  echo "⚠️ Warning: GOOGLE_SERVICES_JSON environment variable not set"
  echo "google-services.json will not be created - build may fail"
  exit 1
fi

