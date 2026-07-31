; ====================================================
; LanChat NSIS Installer Script
; Creates a setup wizard that allows choosing install path
; ====================================================

!include "MUI2.nsh"

; ------ Basic Info ------
Name "LanChat"
OutFile "d:\study\vibe Coding\LanChat\release-final\LanChat-Setup-1.0.0.exe"
InstallDir "$LOCALAPPDATA\LanChat"
RequestExecutionLevel user
SetCompressor lzma

; ------ Defines ------
!define APP_NAME "LanChat"
!define APP_EXE "LanChat.exe"
!define VERSION "1.0.0"
!define PUBLISHER "LanChat"
!define ICON_FILE "d:\study\vibe Coding\LanChat\build\icon.ico"
!define SOURCE_DIR "d:\study\vibe Coding\LanChat\release-final\LanChat-win32-x64"

; ------ Modern UI Settings ------
!define MUI_ABORTWARNING
!define MUI_ICON "${ICON_FILE}"
!define MUI_UNICON "${ICON_FILE}"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${APP_EXE}"
!define MUI_FINISHPAGE_RUN_TEXT "Launch ${APP_NAME}"
!define MUI_FINISHPAGE_SHOWREADME ""
!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED
!define MUI_FINISHPAGE_LINK "LanChat LAN Chat Tool"
!define MUI_FINISHPAGE_LINK_LOCATION "https://github.com"

; ------ License File ------
LicenseData "d:\study\vibe Coding\LanChat\LICENSE"

; ------ Install Pages ------
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "d:\study\vibe Coding\LanChat\LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; ------ Uninstall Pages ------
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; ------ Language ------
!insertmacro MUI_LANGUAGE "SimpChinese"

; ------ Install Section ------
Section "Install"
  SetOutPath "$INSTDIR"

  ; Copy all files
  File /r "${SOURCE_DIR}\*.*"

  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\${APP_EXE}" 0

  ; Write uninstall registry
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayName" "${APP_NAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayIcon" "$INSTDIR\${APP_EXE}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "Publisher" "${PUBLISHER}"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}" "NoRepair" 1

  ; Write uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; ------ Uninstall Section ------
Section "Uninstall"
  ; Remove program files
  RMDir /r "$INSTDIR"

  ; Remove shortcuts
  Delete "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk"
  RMDir "$SMPROGRAMS\${APP_NAME}"
  Delete "$DESKTOP\${APP_NAME}.lnk"

  ; Remove registry
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME}"
SectionEnd
