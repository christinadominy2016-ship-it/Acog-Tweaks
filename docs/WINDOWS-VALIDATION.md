# Windows release gate

Status: **not executed**. This repository was developed on Linux. A successful cross-build does not validate Windows behavior.

Run on disposable Windows 10 22H2 and currently serviced Windows 11 x64 installations as a standard user. Include Intel, AMD and NVIDIA hardware, a Modern Standby laptop, and a restricted PowerShell policy environment. Record OS build, hardware, artifact SHA256, actions and observed outcomes; do not treat this checklist as evidence of passing.

1. Install the NSIS package without developer runtimes. Launch offline. Verify no administrator prompt at launch. Test uninstall and user-data retention. Extract ZIP to a separate location and launch with all bundled files.
2. Compare inventory and each metric with Task Manager. Confirm missing GPU counters appear unavailable, not zero. Verify localized Windows output, multiple adapters, storage health limitations and query failure states.
3. For **each catalog entry**, capture original existence/value/type with Registry Editor (or `powercfg /getactivescheme`). Apply once, check the journal preexists mutation, inspect actual value, and confirm the corresponding Windows UI behavior after sign-out where indicated. Undo and compare exact originals. Repeat for an initially missing value.
4. Verify unavailable power plan produces a visible error and retained recovery entry. Test access denial, full disk, externally changed registry values, process termination after journal save, restart and restore. Confirm unrelated registry properties survive.
5. Restore all after mixed successful/failed changes. Confirm failed entries remain and other entries restore. Never delete the journal to make a test pass.
6. Export/import a profile; reject malformed/unknown IDs, duplicate entries, oversized files and injected commands. Cancel native dialogs and confirm no mutation.
7. Check game detection across standard Steam/Epic/Riot layouts and custom secondary Steam libraries. Confirm missing games stay available as manual guides. No priority/affinity or anti-cheat action should occur.
8. Inspect startup/services/processes, compare to Windows tools, and verify safe handoff. Confirm uninstall/cleanup never happen automatically. Verify SFC and DISM request elevation only when selected, handle UAC cancellation, and leave results visible in their consoles.
9. Save baseline/after snapshots and compare under a controlled workload. Do not infer FPS gains from CPU usage. Verify snapshot failure produces a visible error.
10. Keyboard navigation, all native confirmations, light/dark themes, 100/150/200% DPI, minimum window size, unavailable states, and screen-reader labels.

Release blockers: unexecuted matrix; unsigned binary; advanced/game automation features explicitly unavailable. No claim of testing every optimization on supported Windows versions is made.
