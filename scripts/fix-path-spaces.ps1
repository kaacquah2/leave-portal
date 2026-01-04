# Fix for node-gyp path with spaces issue
# This script creates a junction to a path without spaces and rebuilds the native module

param(
    [switch]$CreateJunction,
    [switch]$Rebuild
)

$ErrorActionPreference = "Stop"

$currentPath = Get-Location
$projectPath = $currentPath.Path

Write-Host "Current project path: $projectPath" -ForegroundColor Cyan

if ($projectPath -match '\s') {
    Write-Host "`n⚠️  WARNING: Project path contains spaces!" -ForegroundColor Yellow
    Write-Host "   This causes node-gyp to fail when building native modules." -ForegroundColor Yellow
    Write-Host ""
    
    if ($CreateJunction) {
        # Create a junction to a path without spaces
        $junctionPath = "C:\hr-leave-portal"
        
        if (Test-Path $junctionPath) {
            Write-Host "Junction already exists at: $junctionPath" -ForegroundColor Green
        } else {
            Write-Host "Creating junction from: $junctionPath" -ForegroundColor Yellow
            Write-Host "                      to: $projectPath" -ForegroundColor Yellow
            
            # Create junction (requires admin)
            try {
                New-Item -ItemType Junction -Path $junctionPath -Target $projectPath -Force | Out-Null
                Write-Host "✅ Junction created successfully!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Next steps:" -ForegroundColor Cyan
                Write-Host "1. Navigate to: $junctionPath" -ForegroundColor White
                Write-Host "2. Run: npm run electron:rebuild" -ForegroundColor White
                Write-Host ""
            } catch {
                Write-Host "❌ Failed to create junction. You may need to run PowerShell as Administrator." -ForegroundColor Red
                Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host ""
                Write-Host "Alternative: Move the project to a path without spaces." -ForegroundColor Yellow
                exit 1
            }
        }
        
        if ($Rebuild) {
            Write-Host "Switching to junction path and rebuilding..." -ForegroundColor Cyan
            Set-Location $junctionPath
            npm run electron:rebuild
        }
    } else {
        Write-Host "Solutions:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Option 1: Create a junction (recommended - quick fix)" -ForegroundColor Green
        Write-Host "  Run: .\scripts\fix-path-spaces.ps1 -CreateJunction -Rebuild" -ForegroundColor White
        Write-Host ""
        Write-Host "Option 2: Move project to path without spaces (best long-term)" -ForegroundColor Green
        Write-Host "  Move to: C:\Projects\hr-leave-portal (or similar)" -ForegroundColor White
        Write-Host ""
        Write-Host "Option 3: Use prebuilt binaries (if available)" -ForegroundColor Green
        Write-Host "  Note: Using sql.js (pure JavaScript) - no native compilation needed" -ForegroundColor White
    }
} else {
    Write-Host "✅ Project path has no spaces - you can rebuild normally!" -ForegroundColor Green
    if ($Rebuild) {
        npm run electron:rebuild
    }
}

