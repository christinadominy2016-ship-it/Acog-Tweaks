# ACOG Tweaks

A free, offline Windows tuning workspace with an original dark interface, individual choices, and recovery records. **v0.1.0 is a foundation release, not yet a feature-complete alternative to Hone or Risxn.** No performance gains are promised.

## Run on Windows

Supported target: Windows 10 22H2 or Windows 11, x64. Windows 10 itself requires applicable Microsoft servicing coverage. Download the generated `ACOG Tweaks Setup 0.1.0.exe`, open it, and install for the current user. Alternatively extract the complete Windows ZIP and open `ACOG Tweaks.exe`. Keep all extracted files together. Electron, Chromium and Node are bundled: no developer tools, accounts, keys, or network connection are needed for core features. Uses the Windows-included PowerShell 5.1 and Windows system utilities.

The build is **unsigned** and Windows may display a publisher warning. Signing is a release-owner task. Windows launch, UAC, installer, registry effects, and hardware counter behavior have **not been validated in the Linux development sandbox**. See [Windows validation](docs/WINDOWS-VALIDATION.md) before production use.

## Implemented

- Ten individually selectable changes: Game Mode, app capture, mouse acceleration preference, transparency, advertising ID, suggested Settings content, file extensions, taskbar animations, menu delay, and high-performance power plan.
- Durable write-before-change journal, individual undo, restore all, failure records, strict allowlisted profile import/export. No imported commands or registry paths are accepted.
- CPU, GPU 3D engine (when exposed), RAM, disk and network readings from Windows CIM counters; hardware, physical storage health, graphics driver versions.
- Known-location detection and manual guidance for Fortnite, VALORANT, CS2, Apex Legends, Minecraft. Custom installations may not be detected.
- Startup entry, running service, and process memory inspection. Windows Settings, Services and Task Manager perform management actions.
- Links to official GPU driver sources, Windows Storage, per-app uninstall, Disk Cleanup, graphics, network, privacy and power settings.
- Visible administrator-approved SFC verification and DISM repair consoles. Completion is reported by the console, not inferred by ACOG.
- System Protection shortcut, local snapshots with comparison table, activity history, searchable/filterable tweak cards, light/dark themes.

## Not implemented yet

Automatic game config editing, measured FPS/frame-time diagnostics, game process priority/affinity controls, automatic gameplay background-app management and temporary restoration, automated selective debloating, application-specific cache removal, direct adapter/TCP edits, startup impact measurement and vendor-specific GPU tuning. The UI explicitly identifies unavailable controls or hands off to Windows. It never displays simulated hardware numbers.

## Safety and recovery

Settings are current-user preferences except the active power scheme. ACOG does not disable security, updates, anti-cheat or essential services. It does not delete user files. Windows cleanup and uninstall tools require users to select their own operations. ACOG cannot undo changes performed in external Windows tools; their interfaces govern those operations.

Before mutation, `%APPDATA%/acog-tweaks/recovery.json` is atomically replaced after flushing the new journal. Existing values include their registry types; missing values are restored by removing only the introduced property. Pending/failed writes retain originals. Repeat applies cannot replace the saved original. Keep the user-data folder until changes are restored. Restore overwrites changes made to the same setting by another app in the meantime. If the journal cannot be parsed, startup fails closed. Restore points and snapshots are distinct: snapshots contain readings and metadata, not an OS backup.

Some preferences require sign-out. Availability and effects vary by Windows build, hardware, policy and firmware. Restricted Windows environments may block PowerShell; errors remain visible and recovery records are retained. GPU values aggregate exposed 3D engines and are capped at 100%; they are activity indicators, not a precise per-adapter benchmark.

## Develop and package

Developer prerequisites only: Node 24 and npm. No prerequisites are required for end users.

```sh
npm ci
npm run check
npm test
npm start
npm run dist:win
```

`dist/` contains an NSIS installer and complete Windows ZIP. GitHub Actions builds on `windows-latest` and uploads both artifacts. Linux cross-packaging additionally requires Wine for NSIS, even with executable resource editing disabled; the packaged app currently uses Electron's default executable icon. `npm run preview` serves the interface on port 5173 with explicit unavailable states for native features. The browser is a preview, not a system optimizer. `npm run dist:linux` exists for developer desktop smoke checks; Windows is the product target.

Source boundaries: `app/core/` contains the fixed catalog, Windows adapter and journal engine; `app/main.cjs` owns all IPC and native dialogs; `app/preload.cjs` exposes a single request boundary; `app/ui/` is sandboxed with no Node access. External links and system actions are allowlisted. There is no runtime remote content or analytics. The preview catalog is generated from the native catalog and parity-tested.

```sh
node -e "require('fs').writeFileSync('app/ui/catalog.json', JSON.stringify({tweaks:require('./app/core/catalog.cjs').tweaks},null,2))"
```

## Setting references and limits

Windows UI settings are preferred entry points. Some per-user preference registry locations are Windows implementation details rather than stable APIs; ACOG labels their effects and limits and does not claim Microsoft performance endorsement. See [setting reference](docs/SETTINGS.md). Hone.gg and Risxn Tweaks were requested as functional quality benchmarks; no code, branding, screenshots or assets were copied.
