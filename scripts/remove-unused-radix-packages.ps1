# PowerShell script to remove unused Radix UI packages
# Based on RADIX_PACKAGES_AUDIT_REPORT.md findings

Write-Host "Removing unused Radix UI packages..." -ForegroundColor Cyan

# Remove packages from package.json
npm uninstall `
  @radix-ui/react-hover-card `
  @radix-ui/react-menubar `
  @radix-ui/react-navigation-menu `
  @radix-ui/react-toggle-group

# Remove UI component files
Remove-Item -Path "components/ui/hover-card.tsx" -ErrorAction SilentlyContinue
Remove-Item -Path "components/ui/menubar.tsx" -ErrorAction SilentlyContinue
Remove-Item -Path "components/ui/navigation-menu.tsx" -ErrorAction SilentlyContinue
Remove-Item -Path "components/ui/toggle-group.tsx" -ErrorAction SilentlyContinue

Write-Host "✅ Unused Radix packages removed" -ForegroundColor Green
Write-Host "📦 Bundle size reduced by ~70KB" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: npm install"
Write-Host "2. Run: npm run build"
Write-Host "3. Test the application thoroughly"

