; NSIS Installer Script for IT-Managed Deployment
; Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
;
; This script is included via package.json "nsis.include" option.
; electron-builder handles ALL installation logic automatically based on package.json config.
;
; This file is kept for future extensibility. Currently, all features are configured in package.json:
; - Silent installation: setup.exe /S (built-in)
; - Per-user installation: perMachine: false (in package.json)
; - Custom install path: setup.exe /S /D=C:\CustomPath (built-in)
; - Shortcuts: createDesktopShortcut, createStartMenuShortcut (in package.json)
; - Icons: installerIcon, uninstallerIcon (in package.json)
;
; ============================================================================
; IMPORTANT: When using "include" (not "script") with electron-builder:
; - electron-builder handles: Name, OutFile, InstallDir, compression, 
;   file installation, shortcuts, registry entries, uninstaller, pages, languages
; - RequestExecutionLevel is set from package.json "win.requestedExecutionLevel"
; - MUI icons are set from package.json "nsis.installerIcon" and "nsis.uninstallerIcon"
; - This file is included BEFORE electron-builder's generated code
; - We can only add custom code that doesn't conflict
; ============================================================================

; Note: All installation features are configured in package.json.
; This file is intentionally minimal to avoid conflicts.
; Add custom logic here only if needed, and test thoroughly.

; Example: Custom installation logging (uncomment if needed)
; Function .onInstSuccess
;     ; Custom installation success logic
;     ; WriteRegStr HKCU "Software\HR Leave Portal" "InstallDate" "some date"
; FunctionEnd

