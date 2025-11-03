#!/bin/bash
# Script to create google-services.json from EAS secret during build

if [ -n "$GOOGLE_SERVICES_JSON" ]; then
  echo "Creating google-services.json from EAS secret..."
  echo "$GOOGLE_SERVICES_JSON" | base64 -d > google-services.json
  echo "✅ google-services.json created successfully"
else
  echo "⚠️ Warning: GOOGLE_SERVICES_JSON environment variable not set"
  echo "google-services.json will not be created"
fi


