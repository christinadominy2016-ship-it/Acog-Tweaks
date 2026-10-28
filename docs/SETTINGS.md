# Setting reference

All registry changes use HKCU, save exact original values and types, and offer restore. Paths and values are centralized in `app/core/catalog.cjs`. Only the active power scheme uses a command-line system tool.

| Change | Mechanism / expectation | Caveat |
| --- | --- | --- |
| Windows Game Mode | GameBar AutoGameModeEnabled DWORD 1 | Preference; validate against the Settings UI for each supported build |
| Background app capture | GameDVR AppCaptureEnabled DWORD 0 | Disables app capture, not every third-party recorder |
| Mouse acceleration | Control Panel Mouse MouseSpeed string 0 | Sign-out required; raw input unaffected |
| Transparency | Themes Personalize EnableTransparency DWORD 0 | Visual effect only |
| Advertising ID | AdvertisingInfo Enabled DWORD 0 | Does not disable required diagnostics |
| Suggested Settings content | ContentDeliveryManager SubscribedContent-338393Enabled DWORD 0 | Implementation detail; moderate risk, version-dependent |
| File extensions | Explorer Advanced HideFileExt DWORD 0 | Reopen Explorer |
| Taskbar animations | Explorer Advanced TaskbarAnimations DWORD 0 | Version-dependent; sign-out required |
| Menu delay | Control Panel Desktop MenuShowDelay string 200 | Milliseconds; sign-out required |
| High performance | powercfg /setactive built-in high-performance GUID | Unsupported on some Modern Standby devices; no plan is imported or created |

Registry preferences are not contractual Windows APIs. The v0.1 catalog is experimental until the manual Windows validation matrix is completed. No undocumented scheduler, timer, network, security, or anti-cheat settings are included. Tweaks are not substitutes for measurement.

References:

- [Powercfg command-line options](https://learn.microsoft.com/windows-hardware/design/device-experiences/powercfg-command-line-options)
- [SystemParametersInfo: Windows input and desktop parameters](https://learn.microsoft.com/windows/win32/api/winuser/nf-winuser-systemparametersinfow)
- [Windows privacy and advertising ID](https://support.microsoft.com/windows/general-privacy-settings-in-windows-7c7f6a09-cebd-5589-c376-7f505e5bf65a)
- [Windows system file checker](https://support.microsoft.com/windows/using-system-file-checker-in-windows-365e0031-36b1-6031-f804-8fd86e0ef4ca)
- [DISM repair a Windows image](https://learn.microsoft.com/windows-hardware/manufacture/desktop/repair-a-windows-image)
- [Win32_PerfFormattedData](https://learn.microsoft.com/windows/win32/cimwin32prov/win32-perfformatteddata)

Windows tools opened by ACOG are responsible for their own confirmation, elevation, execution and error reporting. Opening a tool does not mean the operation succeeded. Their changes are not included in ACOG undo.
