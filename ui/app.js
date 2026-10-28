const icons = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7z",
  game: "M7 7h10c3 0 5 11 3 12-2 1-4-3-5-3H9c-1 0-3 4-5 3C2 18 4 7 7 7Z M7 10v5 M4.5 12.5h5 M16 11h.01 M18 14h.01",
  monitor: "M3 4h18v13H3z M8 21h8 M12 17v4",
  sliders:
    "M4 3v6m0 4v8M12 3v10m0 4v4M20 3v2m0 4v12M1 9h6v4H1z M9 13h6v4H9z M17 5h6v4h-6z",
  shield: "M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z m-5 10 3 3 7-7",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z",
  cpu: "M6 6h12v12H6z M9 9h6v6H9z M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4",
  ram: "M3 6h18v11H3z M6 9v5m4-5v5m4-5v5m4-5v5M6 17v3m4-3v3m4-3v3m4-3v3",
  disk: "M5 3h14l3 14H2z M2 17v4h20v-4 M16 18v1m3-1v1",
  arrow: "M5 12h14m-5-5 5 5-5 5",
  refresh:
    "M20 7v5h-5 M4 17v-5h5 M5 8a8 8 0 0 1 13-3l2 3 M4 16l2 3a8 8 0 0 0 13-3",
  plus: "M12 5v14 M5 12h14",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  folder: "M3 5h7l2 3h9v12H3z",
  download: "M12 3v12m-5-5 5 5 5-5 M4 16v5h16v-5",
  upload: "M12 16V4m-5 5 5-5 5 5 M4 16v5h16v-5",
  network: "M12 3v9 M4 17v-5h16v5 M9 3h6v5H9z M1 17h6v5H1z M17 17h6v5h-6z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
  info: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 11v6 M12 7v1",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 m5 12 6 6",
};
const icon = (n) =>
  `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[n] || icons.sliders}"/></svg>`;
const mark =
  '<svg class="brand-mark" viewBox="0 0 40 40" fill="none" aria-hidden="true"><path d="M20 3 37 34H27L20 21l-7 13H3L20 3Z" fill="currentColor"/><path d="m17 29 3-5 3 5-3 6-3-6Z" fill="currentColor"/></svg>';
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const state = {
  page: "dashboard",
  boot: null,
  hardware: null,
  metrics: null,
  histories: { cpu: [], gpu: [], ram: [], disk: [] },
  category: "All",
  query: "",
  selected: new Set(),
  states: {},
  snapshots: [],
  busy: false,
  table: null,
  metricError: null,
};
const previewGames = [
  ["fortnite", "Fortnite", "Epic Games", "F", "#a48cf5"],
  ["valorant", "VALORANT", "Riot Games", "V", "#f77787"],
  ["cs2", "Counter-Strike 2", "Valve", "CS", "#e3b46c"],
  ["apex", "Apex Legends", "Respawn", "A", "#e18c76"],
  ["minecraft", "Minecraft", "Mojang", "M", "#91ba80"],
].map(([id, name, studio, initial, color]) => ({
  id,
  name,
  studio,
  initial,
  color,
  installed: false,
  advice: [
    "Open the Windows application to detect installed games and read game-specific recommendations.",
  ],
}));
const nav = [
  ["dashboard", "grid", "Dashboard"],
  ["optimizations", "bolt", "Optimizations"],
  ["games", "game", "Game library"],
  ["system", "monitor", "System tools"],
  ["advanced", "sliders", "Advanced tweaks"],
  ["recovery", "shield", "Backup & restore"],
  ["settings", "settings", "Settings"],
];
const native = !!window.acog;
const supported = () => state.boot?.platform === "win32";
async function call(action, payload) {
  if (!native)
    throw new Error(
      "Available in the Windows desktop app. This browser preview does not access your system.",
    );
  const result = await window.acog.call(action, payload);
  if (!result.ok) throw new Error(result.error);
  return result.data;
}
let toastTimer;
function toast(message) {
  const t = document.getElementById("toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 8000);
}
function btn(text, action, i = "", cls = "", payload = "") {
  return `<button class="btn ${cls}" data-action="${action}" ${payload ? `data-value="${escape(payload)}"` : ""}>${i ? icon(i) : ""}${text}</button>`;
}
function notice() {
  return supported()
    ? ""
    : `<div class="notice">${icon("info")}<span><b>${native ? "Windows features unavailable" : "Browser preview"}</b> · System metrics and changes require the Windows desktop app. No simulated readings are shown.</span></div>`;
}
function heading(title, subtitle, action = "") {
  return `<div class="heading"><div><p class="eyebrow">Your performance workspace</p><h1>${title}</h1><p class="subtext">${subtitle}</p></div>${action}</div>`;
}
function render() {
  const label = nav.find((n) => n[0] === state.page)?.[2];
  document.getElementById("app").innerHTML =
    `<div class="layout"><aside class="sidebar"><div class="brand">${mark}<div><strong>ACOG</strong><small>TWEAKS</small></div></div><p class="nav-label">WORKSPACE</p><nav class="nav" aria-label="Main navigation">${nav.map(([id, i, name], index) => `${index === 5 ? '<div class="nav-sep"></div><p class="nav-label">PREFERENCES</p>' : ""}<button data-page="${id}" class="${state.page === id ? "active" : ""}" ${state.page === id ? 'aria-current="page"' : ""} title="${name}">${icon(i)}<span>${name}</span></button>`).join("")}</nav><div class="side-bottom"><div class="local-card"><b><span class="dot"></span>Your PC. Your control.</b><p>Local by design. Free by default.<br>No accounts. No compromises.</p></div><div class="version"><span>ACOG v${escape(state.boot?.version || "0.1.0")}</span><span>LOCAL EDITION</span></div></div></aside><main class="main"><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <span style="color:var(--text)">${label}</span></div><div class="top-actions"><span class="tag">${icon("shield")} OFFLINE READY</span><button class="icon-button" data-action="theme" aria-label="Toggle light or dark theme">${icon("sun")}</button><button class="icon-button" data-action="navigate" data-value="settings" aria-label="Application settings">${icon("settings")}</button></div></header><div id="content">${pages[state.page]()}</div><footer class="footer"><span><span class="dot"></span>${supported() ? "Connected to your PC" : "Windows desktop companion"}</span><span>Thoughtful tweaks. Measurable results. &nbsp; ACOG Tweaks</span></footer></main></div>`;
  updateMetricElements();
}
function metricCard(key, name, i, detail) {
  return `<div class="card metric"><div class="metric-head"><span>${icon(i)}${name}</span><span data-live-label>—</span></div><div class="metric-value" data-metric="${key}">—<small>%</small></div><div class="metric-note">${detail}</div><svg class="spark" data-chart="${key}" viewBox="0 0 240 40" preserveAspectRatio="none" aria-label="${name} recent usage"><path d="M0 34H240" stroke="#454052" stroke-dasharray="3 5" fill="none"/></svg></div>`;
}
function systemRows() {
  const h = state.hardware;
  return [
    ["Processor", h?.cpu || "Not detected"],
    ["Graphics", h?.gpu?.map((g) => g.Name).join(", ") || "Not detected"],
    ["Memory", h ? `${h.memory} GB installed` : "Not detected"],
    [
      "Operating system",
      h ? `${h.os} · ${h.build}` : "Windows 10 / 11 required",
    ],
  ]
    .map(
      ([a, b]) =>
        `<div class="system-row"><span>${a}</span><span>${escape(b)}</span></div>`,
    )
    .join("");
}
function gameMini(g) {
  return `<button class="game-mini" data-action="game" data-value="${g.id}" style="--game-color:${g.color}"><span class="game-logo">${g.initial}</span><span><strong>${g.name}</strong><small>${g.installed ? "Detected" : "Setup guide"}</small></span></button>`;
}
function dashboard() {
  const applied = Object.keys(state.boot?.journal.changes || {}).length;
  return `${heading("A little tuning. A lot of possibility.", "Get to know your system. Make it work better for you.", btn("Take a snapshot", "snapshot", "plus"))}${notice()}<section class="hero"><div class="hero-copy"><p class="eyebrow">LESS FRICTION. MORE GAME.</p><h2>Your next session starts here.</h2><p>A focused set of Windows tweaks, tailored to your control.<br>Choose what changes. Keep a way back.</p>${btn("Explore optimizations", "navigate", "bolt", "primary", "optimizations")} <span style="font-size:10px;color:#968ba8;margin-left:15px">${applied} changes recorded</span></div><div class="hero-art"><div class="orbit"></div><div class="orbit two"></div>${mark}<span class="hero-pill">BUILT FOR YOUR PERSONAL BEST</span></div></section><div class="section-heading"><h2>System at a glance</h2><small id="metrics-status">${supported() ? "Connecting to Windows…" : "Live readings available on Windows"}</small></div><section class="metrics">${metricCard("cpu", "CPU usage", "cpu", "Processor utilization")}${metricCard("gpu", "GPU usage", "monitor", "3D engine utilization · if supported")}${metricCard("ram", "Memory", "ram", "Physical memory in use")}${metricCard("disk", "Disk activity", "disk", "Total physical disk activity")}</section><div class="dashboard-bottom"><section><div class="section-heading"><h2>Make it yours</h2><small>YOU’RE IN CONTROL</small></div><div class="card"><div class="quick-list">${[
    [
      "bolt",
      "A smoother Windows experience",
      "Explore individual tweaks with clear trade-offs.",
      "optimizations",
    ],
    [
      "game",
      "Get your game ready",
      "Find recommendations for your next session.",
      "games",
    ],
    [
      "shield",
      "Every change has a way back",
      "Review saved originals and restore your settings.",
      "recovery",
    ],
  ]
    .map(
      ([i, t, d, p]) =>
        `<div class="quick-row"><div class="quick-icon">${icon(i)}</div><div class="quick-copy"><h3>${t}</h3><p>${d}</p></div><button class="arrow" data-page="${p}" aria-label="${t}">${icon("arrow")}</button></div>`,
    )
    .join(
      "",
    )}</div></div></section><section><div class="section-heading"><h2>Your hardware</h2><button class="arrow" data-page="system" aria-label="View system information">${icon("arrow")}</button></div><div class="card system-body">${systemRows()}<div class="system-footer">${icon("shield")} &nbsp; System information stays on this device.</div></div></section></div><div class="section-heading"><h2>Built around the games you play</h2><button class="btn ghost small" data-page="games">View library ${icon("arrow")}</button></div><div class="game-strip">${state.boot.games.map(gameMini).join("")}</div>`;
}
function tweakCard(t) {
  const entry = state.boot.journal.changes[t.id],
    current = state.states[t.id];
  const currentLabel = entry
    ? entry.status === "applied"
      ? "Applied · original saved"
      : "Recovery needed"
    : current?.error
      ? "Read unavailable"
      : current?.exists
        ? `Current: ${current.value}`
        : current
          ? "Windows default"
          : "Not checked";
  return `<article class="card tweak"><div class="tweak-top"><span class="quick-icon">${icon(t.category === "Gaming" ? "game" : t.category === "Privacy" ? "shield" : t.category === "Input" ? "sliders" : "bolt")}</span><span class="risk ${t.risk.toLowerCase()}">${t.risk} risk</span></div><h3>${escape(t.name)}</h3><p>${escape(t.description)}</p><p class="note">${escape(t.note)}</p><label class="select-label"><input type="checkbox" data-select="${t.id}" ${state.selected.has(t.id) ? "checked" : ""} ${entry ? "disabled" : ""}>Include in selected profile</label><div class="tweak-foot"><span title="${escape(current?.error || currentLabel)}">${escape(currentLabel)}</span><button class="toggle ${entry ? "on" : ""}" role="switch" aria-checked="${!!entry}" aria-label="${entry ? "Restore" : "Apply"} ${escape(t.name)}" data-action="${entry ? "restore" : "apply"}" data-value="${t.id}" ${!supported() ? "disabled" : ""}></button></div></article>`;
}
function optimizations() {
  const ts = state.boot.tweaks.filter(
    (t) =>
      (state.category === "All" || t.category === state.category) &&
      `${t.name} ${t.description}`
        .toLowerCase()
        .includes(state.query.toLowerCase()),
  );
  return `${heading("Small changes. Your choice.", "Understand every adjustment before you make it.", btn(`Apply selected (${state.selected.size})`, "profile", "check", "primary"))}${notice()}<div class="toolbar"><input type="search" id="tweak-search" placeholder="Search optimizations…" aria-label="Search optimizations" value="${escape(state.query)}">${btn("Read current settings", "states", "refresh")}${btn("Import profile", "import", "upload")}</div><div class="chips">${["All", "Gaming", "Performance", "Windows", "Privacy", "Input"].map((c) => `<button class="chip ${state.category === c ? "active" : ""}" data-category="${c}">${c}</button>`).join("")}</div><div class="tweak-grid">${ts.map(tweakCard).join("")}</div>${!ts.length ? '<div class="empty">No tweaks match your search.</div>' : ""}`;
}
function games() {
  return `${heading("Your games. In focus.", "Local detection and practical guidance for your next session.", btn("Scan library", "scan", "refresh"))}${notice()}<div class="notice">${icon("info")}Game configuration edits, FPS benchmarking, temporary process priority and affinity controls are not implemented in v0.1. Guides are available below; no anti-cheat processes are modified.</div><div class="games-grid">${state.boot.games.map((g) => `<article class="card game-card" style="--game-color:${g.color}"><div class="game-cover"><strong>${g.initial}</strong></div><div class="game-details"><div class="eyebrow">${g.studio}</div><h3>${g.name}</h3><p><span class="dot" style="background:${g.installed ? "var(--green)" : "#697285"}"></span>${g.installed ? "Detected on this PC" : "Not detected in known install locations"}</p>${btn("Open optimization guide", "game", "arrow", "", g.id)}</div></article>`).join("")}</div>`;
}
const toolItems = [
  [
    "startup",
    "Startup applications",
    "Review startup entries and choose what runs when you sign in.",
    "View entries",
    "startup",
  ],
  [
    "monitor",
    "Background processes",
    "See memory use by process. Open Task Manager to manage applications.",
    "View processes",
    "processes",
  ],
  [
    "sliders",
    "Windows services",
    "Inspect running services. Use Windows Services for manual management.",
    "View services",
    "services",
  ],
  [
    "disk",
    "Storage & cleanup",
    "Review temporary files in Windows Storage before deleting anything.",
    "Open Storage",
    "shortcut:storage",
  ],
  [
    "folder",
    "Installed applications",
    "Individually select and uninstall unwanted apps in Windows Settings.",
    "Review installed apps",
    "shortcut:apps",
  ],
  [
    "shield",
    "System integrity",
    "Launch an elevated SFC verification console. Results stay in that console.",
    "Verify system files",
    "repair:scan",
  ],
  [
    "refresh",
    "Windows image repair",
    "Launch DISM RestoreHealth with Windows administrator approval.",
    "Open repair console",
    "repair:repair",
  ],
  [
    "network",
    "Network diagnostics",
    "Inspect adapters and connection status using Windows network settings.",
    "Open network settings",
    "shortcut:network",
  ],
  [
    "disk",
    "Disk Cleanup",
    "Use the Windows cleanup utility to review cache categories, including DirectX shaders when offered.",
    "Open Disk Cleanup",
    "systemTool:cleanup",
  ],
];
function system() {
  return `${heading("A clearer view of your PC.", "Useful diagnostics, trusted Windows tools, and no guesswork.", btn("Refresh hardware", "hardware", "refresh"))}${notice()}<div class="card system-body">${systemRows()}${state.hardware?.disks?.map((d) => `<div class="system-row"><span>${escape(d.FriendlyName)}</span><span>${escape(d.HealthStatus)} · ${Math.round(d.Size / 1e9)} GB</span></div>`).join("") || ""}</div><div class="section-heading"><h2>Maintenance & diagnostics</h2><small>Windows tools open in a separate window</small></div><div class="tools-grid">${toolItems.map(([i, t, d, b, a]) => `<article class="card tool">${icon(i)}<h3>${t}</h3><p>${d}</p>${btn(b, "tool", "arrow", "", a)}</article>`).join("")}</div><div id="data-panel">${renderTable()}</div><div class="section-heading"><h2>Official graphics drivers</h2><small>Internet required for vendor websites</small></div><div class="toolbar">${["nvidia", "amd", "intel"].map((v) => btn(v.toUpperCase() + " driver support", "link", "arrow", "", v)).join("")}</div>${state.hardware?.gpu?.map((g) => `<p class="subtext">${escape(g.Name)} · Driver ${escape(g.DriverVersion)}</p>`).join("") || ""}`;
}
function renderTable() {
  if (!state.table) return "";
  const { title, rows } = state.table;
  if (!rows.length)
    return '<div class="empty">No entries returned by Windows.</div>';
  const keys = Object.keys(rows[0]);
  return `<div class="section-heading"><h2>${escape(title)}</h2></div><div class="toolbar">${btn("Task Manager", "tool", "monitor", "", "systemTool:taskmanager")}${btn("Startup settings", "tool", "arrow", "", "shortcut:startup")}${btn("Services console", "tool", "sliders", "", "systemTool:services")}</div><div class="card table-wrap"><table class="data-table"><thead><tr>${keys.map((k) => `<th>${escape(k)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${keys.map((k) => `<td>${escape(r[k])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
function advanced() {
  return `${heading("More control. More context.", "Choose documented settings and keep the trade-offs visible.")}${notice()}<div class="notice">${icon("info")}No blanket service disabling, security changes, timer hacks, or undocumented TCP presets. Advanced automatic tuning is not implemented.</div><div class="tools-grid">${[
    [
      "network",
      "Network adapter settings",
      "Use the Windows adapter properties for vendor-supported settings. TCP autotuning and offloads should normally stay at their defaults.",
      "network",
    ],
    [
      "monitor",
      "Graphics preferences",
      "Choose Windows per-app GPU preferences. Use your vendor control panel for supported low-latency options.",
      "display",
    ],
    [
      "bolt",
      "Power & sleep",
      "High performance can increase heat and battery use. Modern Standby systems may only expose Balanced.",
      "power",
    ],
    [
      "game",
      "Gaming Mode",
      "Windows Game Mode manages gaming workloads. It does not guarantee a particular FPS improvement.",
      "gaming",
    ],
    [
      "sliders",
      "Mouse & input",
      "Adjust pointer settings using Windows. Raw-input games may ignore desktop pointer preferences.",
      "mouse",
    ],
    [
      "shield",
      "Privacy controls",
      "Review Windows diagnostic data and app permissions. Security protections remain enabled.",
      "privacy",
    ],
  ]
    .map(
      ([i, t, d, a]) =>
        `<article class="card tool">${icon(i)}<h3>${t}</h3><p>${d}</p>${btn("Open Windows settings", "tool", "arrow", "", `shortcut:${a}`)}</article>`,
    )
    .join(
      "",
    )}</div><div class="section-heading"><h2>Not available in this release</h2></div><div class="card"><div class="settings-row"><div><h3>Scheduler, CPU affinity & temporary game sessions</h3><p>Requires Windows validation and reliable process-lifecycle recovery before release.</p></div><span class="badge-muted">Not implemented</span></div><div class="settings-row"><div><h3>Network latency & frame-time benchmarking</h3><p>Use repeatable measurements. ACOG does not estimate FPS gains.</p></div><span class="badge-muted">Not implemented</span></div></div>`;
}
function recovery() {
  const entries = Object.entries(state.boot.journal.changes),
    events = state.boot.journal.events;
  return `${heading("Try a change. Keep a way back.", "Original values are saved locally before ACOG applies a tweak.", btn("Restore all changes", "restoreAll", "refresh"))}${notice()}<div class="split"><div class="card tool">${icon("shield")}<h3>Your recovery journal</h3><p>${entries.length} saved original values. Pending or failed changes keep their recovery records until a restore succeeds.</p>${btn("Export applied profile", "export", "download")}</div><div class="card tool">${icon("clock")}<h3>Windows System Protection</h3><p>Open Windows to configure protection and create a restore point where supported. ACOG does not create one automatically.</p>${btn("Open System Protection", "tool", "arrow", "", "systemTool:restorepoint")}</div></div><div class="section-heading"><h2>Recorded changes</h2><small>Restore uses the value saved before your first change</small></div><div class="card">${entries.length ? entries.map(([id, e]) => `<div class="settings-row"><div><h3>${escape(state.boot.tweaks.find((t) => t.id === id)?.name || id)}</h3><p>${escape(e.status)} · ${escape(new Date(e.at).toLocaleString())}</p></div>${btn("Restore", "restore", "refresh", "", id)}</div>`).join("") : `<div class="empty">${icon("shield")}<h3>A clean starting point.</h3>No settings changed by ACOG yet. Your original values will appear here.</div>`}</div><div class="section-heading"><h2>System snapshots</h2>${btn("Take a snapshot", "snapshot", "plus", "small")}</div><p class="subtext">Point-in-time readings, not a benchmark. Compare under the same workload. Up to 20 snapshots are kept.</p><div class="card table-wrap">${state.snapshots.length ? `<table class="data-table"><thead><tr><th>Captured</th><th>CPU</th><th>RAM</th><th>Disk</th><th>Recorded changes</th></tr></thead><tbody>${state.snapshots.map((s) => `<tr><td>${escape(new Date(s.at).toLocaleString())}</td><td>${s.metrics.cpu}%</td><td>${s.metrics.ram}%</td><td>${s.metrics.disk}%</td><td>${Object.keys(s.changes).length}</td></tr>`).join("")}</tbody></table>` : '<div class="empty">No snapshots yet. Capture a baseline before making changes.</div>'}</div><div class="section-heading"><h2>Activity log</h2></div><div class="card">${
    events.length
      ? events
          .slice(-30)
          .reverse()
          .map(
            (e) =>
              `<div class="settings-row"><div><h3>${escape(e.id)} · ${escape(e.action)}</h3><p>${escape(e.message)}</p></div><span class="badge-muted">${escape(new Date(e.at).toLocaleString())}</span></div>`,
          )
          .join("")
      : '<div class="empty">Your change history will appear here.</div>'
  }</div>`;
}
function settings() {
  return `${heading("Made to stay out of your way.", "A local, account-free toolkit for Windows 10 and Windows 11.")}<div class="card"><div class="settings-row"><div><h3>Appearance</h3><p>Choose a theme that feels right for your setup.</p></div>${btn("Toggle theme", "theme", "sun")}</div><div class="settings-row"><div><h3>Local by design</h3><p>No analytics, accounts, subscriptions, or cloud sync.</p></div><span class="tag">ALWAYS ON</span></div><div class="settings-row"><div><h3>Version 0.1.0 · Foundation release</h3><p>Windows x64. System changes are available only in the desktop app.</p></div><span class="badge-muted">${supported() ? "Windows" : "Preview"}</span></div><div class="settings-row"><div><h3>Recovery storage</h3><p>Saved in your Windows user profile under %APPDATA%/acog-tweaks. Keep this folder to retain originals.</p></div>${icon("shield")}</div><div class="settings-row"><div><h3>Validation status</h3><p>Automated safety tests cover the recovery engine. Windows hardware and OS build validation is still required.</p></div><span class="badge-muted">Early release</span></div></div>`;
}
const pages = {
  dashboard,
  optimizations,
  games,
  system,
  advanced,
  recovery,
  settings,
};
function updateMetricElements() {
  for (const key of Object.keys(state.histories)) {
    const el = document.querySelector(`[data-metric="${key}"]`);
    const val = state.metrics?.[key];
    if (el)
      el.innerHTML = `${val == null ? "—" : Math.round(val)}<small>%</small>`;
    const chart = document.querySelector(`[data-chart="${key}"]`),
      history = state.histories[key];
    if (chart && history.length > 1) {
      const points = history
        .map(
          (n, i) =>
            `${(i * 240) / (history.length - 1)},${38 - Math.min(100, Math.max(0, n)) * 0.32}`,
        )
        .join(" ");
      chart.innerHTML = `<polygon points="0,40 ${points} 240,40" fill="#b4a0fb0d"/><polyline points="${points}" fill="none" stroke="#a797da" stroke-width="1.5"/>`;
    }
  }
  document
    .querySelectorAll("[data-live-label]")
    .forEach((el) => (el.textContent = state.metrics ? "LIVE" : "—"));
  const label = document.getElementById("metrics-status");
  if (label)
    label.textContent = state.metricError
      ? "Readings unavailable · " + state.metricError
      : state.metrics
        ? `Updated ${new Date().toLocaleTimeString()} · Network ${(state.metrics.network / 1024).toFixed(0)} KB/s`
        : supported()
          ? "Connecting to Windows…"
          : "Live readings available on Windows";
}
async function refreshMetrics() {
  if (!supported()) return;
  try {
    state.metrics = await call("metrics");
    state.metricError = null;
    for (const key of Object.keys(state.histories)) {
      if (state.metrics[key] != null) {
        state.histories[key].push(state.metrics[key]);
        if (state.histories[key].length > 30) state.histories[key].shift();
      }
    }
  } catch (e) {
    state.metrics = null;
    state.metricError = e.message.slice(0, 90);
  }
  updateMetricElements();
  setTimeout(refreshMetrics, 5000);
}
function navigate(page) {
  if (!pages[page]) return;
  state.page = page;
  render();
  window.scrollTo(0, 0);
}
async function action(name, value) {
  if (name === "navigate") return navigate(value);
  if (name === "theme") {
    document.body.classList.toggle("light");
    localStorage.setItem(
      "acog-theme",
      document.body.classList.contains("light") ? "light" : "dark",
    );
    return;
  }
  if (name === "game") {
    const g = state.boot.games.find((g) => g.id === value);
    const d = document.getElementById("game-dialog");
    d.innerHTML = `<button class="icon-button close" data-action="close-dialog" aria-label="Close guide">${icon("close")}</button><p class="eyebrow">GAME GUIDE · ${escape(g.studio)}</p><h2>${escape(g.name)}</h2><p>${g.installed ? "Detected in a known install location." : "Not detected. Custom install locations may not be found."}</p><ul>${g.advice.map((a) => `<li>${escape(a)}</li>`).join("")}</ul><div class="notice">Configuration editing and automated game sessions are not implemented. These recommendations are applied manually in the game.</div>${btn("View Windows gaming tweaks", "game-tweaks", "arrow", "primary")}`;
    return d.showModal();
  }
  if (name === "close-dialog") {
    document.getElementById("game-dialog").close();
    return;
  }
  if (name === "game-tweaks") {
    document.getElementById("game-dialog").close();
    state.category = "Gaming";
    return navigate("optimizations");
  }
  if (state.busy) return toast("Please wait for the current action to finish.");
  state.busy = true;
  document.body.classList.add("loading");
  try {
    let result;
    if (["apply", "restore", "restoreAll"].includes(name)) {
      result = await call(name, value);
      if (result) {
        state.boot.journal = result;
        state.selected.delete(value);
        toast(
          name === "apply"
            ? "Setting applied. Original value saved."
            : "Original settings restored.",
        );
      }
    } else if (name === "states") {
      state.states = await call("states");
      toast("Current settings read from Windows.");
    } else if (name === "profile") {
      result = await call("profile", [...state.selected]);
      if (result) {
        state.boot.journal = result.journal;
        state.selected.clear();
        toast(
          result.failures.length
            ? "Some changes failed: " + result.failures.join("; ")
            : "Selected profile applied. Originals saved.",
        );
      }
    } else if (name === "import") {
      result = await call("import");
      if (result) {
        state.selected = new Set(result);
        state.page = "optimizations";
        state.category = "All";
        state.query = "";
        toast("Profile loaded for review. Select Apply when ready.");
      }
    } else if (name === "export") {
      if (await call("export")) toast("Profile exported.");
    } else if (name === "snapshot") {
      state.snapshots = await call("snapshot");
      toast("Snapshot saved. Compare it in Backup & restore.");
    } else if (name === "scan") {
      state.boot = await call("boot");
      toast("Known game locations scanned. Custom paths may not be detected.");
    } else if (name === "hardware") {
      state.hardware = await call("inventory");
      toast("Hardware information updated.");
    } else if (name === "link") {
      await call("link", value);
    } else if (name === "tool") {
      const [kind, param] = value.split(":");
      result = await call(kind, param);
      if (["startup", "processes", "services"].includes(kind)) {
        state.table = {
          title:
            kind === "startup"
              ? "Startup entries · impact available in Task Manager"
              : kind === "processes"
                ? "Top processes by memory"
                : "Running services",
          rows: result ? (Array.isArray(result) ? result : [result]) : [],
        };
      } else if (result)
        toast("Windows tool opened. Complete the action in its window.");
    }
    render();
    if (state.table && name === "tool")
      document
        .getElementById("data-panel")
        ?.scrollIntoView({ behavior: "smooth" });
  } catch (e) {
    toast(e.message);
    if (native) {
      try {
        state.boot.journal = await call("journal");
        render();
      } catch {}
    }
  } finally {
    state.busy = false;
    document.body.classList.remove("loading");
  }
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("button");
  if (!el) return;
  if (el.dataset.page) navigate(el.dataset.page);
  else if (el.dataset.category) {
    state.category = el.dataset.category;
    render();
  } else if (el.dataset.action) action(el.dataset.action, el.dataset.value);
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.select) {
    e.target.checked
      ? state.selected.add(e.target.dataset.select)
      : state.selected.delete(e.target.dataset.select);
    const btn = document.querySelector('[data-action="profile"]');
    if (btn)
      btn.innerHTML = icon("check") + `Apply selected (${state.selected.size})`;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "tweak-search") {
    state.query = e.target.value;
    const start = e.target.selectionStart;
    render();
    const input = document.getElementById("tweak-search");
    input.focus();
    input.setSelectionRange(start, start);
  }
});
async function init() {
  if (localStorage.getItem("acog-theme") === "light")
    document.body.classList.add("light");
  try {
    if (native) {
      state.boot = await call("boot");
      state.snapshots = await call("snapshots");
    } else {
      const data = await fetch("catalog.json").then((r) => r.json());
      state.boot = {
        platform: "browser",
        version: "0.1.0",
        tweaks: data.tweaks,
        games: previewGames,
        journal: { changes: {}, events: [] },
      };
    }
    render();
    if (supported()) {
      refreshMetrics();
      try {
        state.hardware = await call("inventory");
        render();
      } catch (e) {
        toast("Hardware information unavailable: " + e.message);
      }
    }
  } catch (e) {
    document.getElementById("app").innerHTML =
      `<div class="empty"><h1>ACOG could not start</h1><p>${escape(e.message)}</p><p>Close and reopen the application. Preserve your recovery journal.</p></div>`;
  }
}
init();
