# PowerShell script to update imports after lib directory reorganization
# This script updates imports from old paths to new barrel export paths

$files = Get-ChildItem -Path . -Include *.ts,*.tsx -Recurse -Exclude node_modules,out,src-tauri,target,.next

$replacements = @{
    # Auth imports - use barrel exports
    "from '@/lib/auth\.ts'" = "from '@/lib/auth'"
    "from '@/lib/auth-client'" = "from '@/lib/auth'"
    "from '@/lib/auth-proxy'" = "from '@/lib/auth'"
    "from '@/lib/auth-edge'" = "from '@/lib/auth'"
    "from '@/lib/auth-debug'" = "from '@/lib/auth'"
    "from '\.\./lib/auth\.ts'" = "from '../lib/auth'"
    "from '\.\./lib/auth-client'" = "from '../lib/auth'"
    "from '\.\./lib/auth-proxy'" = "from '../lib/auth'"
    "from '\.\./lib/auth-edge'" = "from '../lib/auth'"
    "from '\./auth\.ts'" = "from './auth'"
    "from '\./auth-client'" = "from './auth'"
    "from '\./auth-proxy'" = "from './auth'"
    "from '\./auth-edge'" = "from './auth'"
    
    # API imports - use barrel exports
    "from '@/lib/api-config'" = "from '@/lib/api'"
    "from '@/lib/api-fetch'" = "from '@/lib/api'"
    "from '\.\./lib/api-config'" = "from '../lib/api'"
    "from '\.\./lib/api-fetch'" = "from '../lib/api'"
    "from '\./api-config'" = "from './api'"
    "from '\./api-fetch'" = "from './api'"
    
    # Role imports - use barrel exports
    "from '@/lib/permissions'" = "from '@/lib/roles'"
    "from '@/lib/role-mapping'" = "from '@/lib/roles'"
    "from '@/lib/role-utils'" = "from '@/lib/roles'"
    "from '@/lib/mofa-rbac-middleware'" = "from '@/lib/roles'"
    "from '\.\./lib/permissions'" = "from '../lib/roles'"
    "from '\.\./lib/role-mapping'" = "from '../lib/roles'"
    "from '\.\./lib/role-utils'" = "from '../lib/roles'"
    "from '\.\./lib/mofa-rbac-middleware'" = "from '../lib/roles'"
    "from '\./permissions'" = "from './roles'"
    "from '\./role-mapping'" = "from './roles'"
    "from '\./role-utils'" = "from './roles'"
    "from '\./mofa-rbac-middleware'" = "from './roles'"
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    foreach ($pattern in $replacements.Keys) {
        if ($content -match $pattern) {
            $content = $content -replace $pattern, $replacements[$pattern]
            $modified = $true
        }
    }
    
    if ($modified) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.FullName)"
    }
}

Write-Host "Import update complete!"

