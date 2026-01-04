# PowerShell script to set Visual Studio environment variables for node-gyp
# This helps node-gyp detect Visual Studio Build Tools 2024 (version 18) or 2026 (version 19)

Write-Host "Configuring Visual Studio environment for node-gyp..." -ForegroundColor Cyan

# Check for Visual Studio installations (in order of preference)
$possiblePaths = @(
    "C:\Program Files\Microsoft Visual Studio\19\BuildTools",
    "C:\Program Files (x86)\Microsoft Visual Studio\19\BuildTools",
    "C:\Program Files\Microsoft Visual Studio\19\Community",
    "C:\Program Files (x86)\Microsoft Visual Studio\19\Community",
    "C:\Program Files\Microsoft Visual Studio\18\BuildTools",
    "C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools",
    "C:\Program Files\Microsoft Visual Studio\18\Community",
    "C:\Program Files (x86)\Microsoft Visual Studio\18\Community",
    "C:\Program Files\Microsoft Visual Studio\2022\BuildTools",
    "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools"
)

$vsPath = $null
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $msBuildPath = Join-Path $path "MSBuild\Current\Bin\MSBuild.exe"
        if (Test-Path $msBuildPath) {
            $vsPath = $path
            break
        }
    }
}

if ($vsPath) {
    Write-Host "Found Visual Studio Build Tools at: $vsPath" -ForegroundColor Green
    
    # Check if this is VS 18/19 (which needs special handling)
    $isVS18Or19 = $vsPath -match "\\(18|19)\\"
    
    # Set environment variables for current session
    $env:msvs_version = "2022"
    $env:GYP_MSVS_VERSION = "2022"
    
    # For VS 18/19, we need to set VCINSTALLDIR/VSINSTALLDIR as a workaround
    # for node-gyp's version detection bug. For VS 2022, set them normally.
    if ($isVS18Or19) {
        # Workaround: Set paths to force VS 2022 toolchain usage
        $env:VCINSTALLDIR = $vsPath
        $env:VSINSTALLDIR = $vsPath
        $env:GYP_MSVS_OVERRIDE_PATH = $vsPath
        $vsVersion = if ($vsPath -match "\\18\\") { "18 (2024)" } else { "19 (2026)" }
        Write-Host "Detected VS $vsVersion - using VS 2022 toolchain workaround" -ForegroundColor Yellow
    } elseif ($vsPath -match "\\2022\\") {
        $env:VCINSTALLDIR = $vsPath
        $env:VSINSTALLDIR = $vsPath
    }
    
    # Note: npm config is not needed - we use .npmrc file and environment variables
    # The .npmrc file already has msvs_version=2022 and python configured
    
    Write-Host "Environment variables set:" -ForegroundColor Green
    Write-Host "  msvs_version = $env:msvs_version"
    Write-Host "  GYP_MSVS_VERSION = $env:GYP_MSVS_VERSION"
    if ($env:VCINSTALLDIR) {
        Write-Host "  VCINSTALLDIR = $env:VCINSTALLDIR"
        Write-Host "  VSINSTALLDIR = $env:VSINSTALLDIR"
        if ($env:GYP_MSVS_OVERRIDE_PATH) {
            Write-Host "  GYP_MSVS_OVERRIDE_PATH = $env:GYP_MSVS_OVERRIDE_PATH"
        }
    }
    Write-Host ""
    Write-Host "You can now run: npm run electron:build:win" -ForegroundColor Yellow
} else {
    Write-Host "Visual Studio Build Tools not found at any expected location" -ForegroundColor Red
    Write-Host "Please install Visual Studio Build Tools with 'Desktop development with C++' workload" -ForegroundColor Yellow
    exit 1
}

