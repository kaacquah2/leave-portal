; NSIS Installer Script for IT-Managed Deployment
; Ministry of Foreign Affairs (MoFA), Ghana - HR Leave Portal
;
; This script provides:
; - Silent installation support (for SCCM/Intune)
; - Per-user installation (no admin rights required at runtime)
; - Deterministic install paths
; - Auto-update compatibility
; - Configuration for enterprise deployment
;
; Usage:
;   Silent install: setup.exe /S
;   Silent uninstall: uninstall.exe /S
;   Custom install path: setup.exe /S /D=C:\CustomPath

!include "MUI2.nsh"

; Installer Information
Name "HR Leave Portal"
OutFile "HR Leave Portal Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\HR Leave Portal"
RequestExecutionLevel user ; Per-user installation (no admin required)

; Silent installation support
SilentInstall silent
SilentUninstall silent

; Compression
SetCompressor /SOLID lzma
SetCompressorDictSize 32

; Version Information
VIProductVersion "${VERSION}"
VIAddVersionKey "ProductName" "HR Leave Portal"
VIAddVersionKey "CompanyName" "Ministry of Foreign Affairs, Ghana"
VIAddVersionKey "FileDescription" "HR Leave Portal Desktop Application"
VIAddVersionKey "FileVersion" "${VERSION}"
VIAddVersionKey "ProductVersion" "${VERSION}"
VIAddVersionKey "LegalCopyright" "Copyright © 2024 Ministry of Foreign Affairs, Ghana"

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "public/mofa.ico"
!define MUI_UNICON "public/mofa.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer Sections
Section "Install" SecInstall
    SetOutPath "$INSTDIR"
    
    ; Install application files
    File /r "${BUILD_RESOURCES_DIR}\*.*"
    
    ; Create shortcuts (only if not silent)
    IfSilent +2 0
    CreateShortcut "$DESKTOP\HR Leave Portal.lnk" "$INSTDIR\HR Leave Portal.exe"
    CreateShortcut "$SMPROGRAMS\HR Leave Portal.lnk" "$INSTDIR\HR Leave Portal.exe"
    
    ; Write registry entries for uninstaller
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal" "DisplayName" "HR Leave Portal"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal" "UninstallString" "$INSTDIR\Uninstall HR Leave Portal.exe"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal" "Publisher" "Ministry of Foreign Affairs, Ghana"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal" "DisplayVersion" "${VERSION}"
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal" "InstallLocation" "$INSTDIR"
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal" "NoModify" 1
    WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal" "NoRepair" 1
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\Uninstall HR Leave Portal.exe"
SectionEnd

; Uninstaller Section
Section "Uninstall"
    ; Remove application files
    RMDir /r "$INSTDIR"
    
    ; Remove shortcuts (only if not silent)
    IfSilent +2 0
    Delete "$DESKTOP\HR Leave Portal.lnk"
    Delete "$SMPROGRAMS\HR Leave Portal.lnk"
    
    ; Remove registry entries
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal"
SectionEnd

; Functions
Function .onInit
    ; Check if already installed
    ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\HR Leave Portal" "UninstallString"
    StrCmp $R0 "" done
    
    ; If silent, uninstall old version first
    IfSilent 0 +3
    ExecWait '"$R0" /S _?=$INSTDIR'
    Goto done
    
    ; If not silent, ask user
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
        "HR Leave Portal is already installed. $\n$\nClick 'OK' to remove the previous version or 'Cancel' to cancel this upgrade." \
        IDOK uninst
    Abort
    
    uninst:
        ClearErrors
        ExecWait '$R0 _?=$INSTDIR'
        
        IfErrors no_remove_uninstaller done
        no_remove_uninstaller:
    
    done:
FunctionEnd

Function .onInstSuccess
    ; Log installation success (for IT monitoring)
    ; In production, this could write to a log file or registry
FunctionEnd

Function un.onUninstSuccess
    ; Log uninstallation success
FunctionEnd

