#!/bin/bash
# Generate CRON_SECRET for GitHub Actions and Vercel
# Run this script: chmod +x scripts/generate-cron-secret.sh && ./scripts/generate-cron-secret.sh

echo "Generating CRON_SECRET..."
SECRET=$(openssl rand -base64 32)

echo ""
echo "Your CRON_SECRET:"
echo "$SECRET"
echo ""
echo "Add this to:"
echo "1. GitHub Secrets (Repository -> Settings -> Secrets -> Actions)"
echo "   - Name: CRON_SECRET"
echo "   - Value: $SECRET"
echo ""
echo "2. Vercel Environment Variables"
echo "   - Name: CRON_SECRET"
echo "   - Value: $SECRET"
echo ""

