# Generate CRON_SECRET for GitHub Actions and Vercel
# Run this script: .\scripts\generate-cron-secret.ps1

Write-Host "Generating CRON_SECRET..." -ForegroundColor Green
$secret = [Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Minimum 0 -Maximum 256}))
Write-Host ""
Write-Host "Your CRON_SECRET:" -ForegroundColor Yellow
Write-Host $secret -ForegroundColor Cyan
Write-Host ""
Write-Host "Add this to:" -ForegroundColor Yellow
Write-Host "1. GitHub Secrets (Repository -> Settings -> Secrets -> Actions)" -ForegroundColor White
Write-Host "   - Name: CRON_SECRET" -ForegroundColor White
Write-Host "   - Value: $secret" -ForegroundColor White
Write-Host ""
Write-Host "2. Vercel Environment Variables" -ForegroundColor White
Write-Host "   - Name: CRON_SECRET" -ForegroundColor White
Write-Host "   - Value: $secret" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to copy the secret above" -ForegroundColor Gray

