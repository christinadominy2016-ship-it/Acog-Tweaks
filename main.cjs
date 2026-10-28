const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { execFile } = require("node:child_process");
const { Engine } = require("./core/engine.cjs");
const windows = require("./core/windows.cjs");
const { tweaks } = require("./core/catalog.cjs");
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
} else {
  app.on("second-instance", () => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}
let win, engine;
const isWindows = process.platform === "win32";
const shortcuts = {
  startup: "ms-settings:startupapps",
  apps: "ms-settings:appsfeatures",
  storage: "ms-settings:storagesense",
  privacy: "ms-settings:privacy",
  network: "ms-settings:network-status",
  gaming: "ms-settings:gaming-gamemode",
  display: "ms-settings:display-advancedgraphics",
  mouse: "ms-settings:mousetouchpad",
  update: "ms-settings:windowsupdate",
  power: "ms-settings:powersleep",
};
const links = {
  nvidia: "https://www.nvidia.com/Download/index.aspx",
  amd: "https://www.amd.com/en/support",
  intel: "https://www.intel.com/content/www/us/en/download-center/home.html",
  docs: "https://support.microsoft.com/windows",
};
function requireWindows() {
  if (!isWindows)
    throw new Error("Available in the Windows desktop application.");
}
async function confirm(message, detail) {
  return (
    (
      await dialog.showMessageBox(win, {
        type: "question",
        buttons: ["Cancel", "Continue"],
        defaultId: 0,
        cancelId: 0,
        message,
        detail,
      })
    ).response === 1
  );
}
async function act(action, payload) {
  switch (action) {
    case "boot":
      return {
        platform: process.platform,
        version: app.getVersion(),
        tweaks,
        games: await windows.detectGames(),
        journal: engine.state,
      };
    case "metrics":
      requireWindows();
      return windows.metrics();
    case "inventory":
      requireWindows();
      return windows.inventory();
    case "states": {
      requireWindows();
      const result = {};
      for (const t of tweaks) {
        try {
          result[t.id] = await windows.adapter.read(t);
        } catch (e) {
          result[t.id] = { error: e.message };
        }
      }
      return result;
    }
    case "apply": {
      requireWindows();
      const t = engine.get(payload);
      if (
        !(await confirm(
          `Apply ${t.name}?`,
          `${t.description}\n\n${t.note}\n\nThe original value will be saved before changing it.`,
        ))
      )
        return null;
      return engine.apply(payload);
    }
    case "restore": {
      requireWindows();
      engine.get(payload);
      if (
        !(await confirm(
          "Restore original setting?",
          "This replaces the current setting with the value saved before ACOG changed it.",
        ))
      )
        return null;
      return engine.restore(payload);
    }
    case "restoreAll":
      requireWindows();
      if (
        !(await confirm(
          "Restore all ACOG changes?",
          "This restores all saved values, including pending changes. Settings changed by other apps since then will also be replaced.",
        ))
      )
        return null;
      return engine.restoreAll();
    case "journal":
      return engine.state;
    case "startup":
    case "processes":
    case "services":
      requireWindows();
      return windows[action]();
    case "shortcut": {
      requireWindows();
      if (!Object.hasOwn(shortcuts, payload))
        throw new Error("Unknown shortcut");
      await shell.openExternal(shortcuts[payload]);
      return true;
    }
    case "link":
      if (!Object.hasOwn(links, payload)) throw new Error("Unknown link");
      await shell.openExternal(links[payload]);
      return true;
    case "systemTool": {
      requireWindows();
      const names = {
        services: "services.msc",
        taskmanager: "Taskmgr.exe",
        restorepoint: "SystemPropertiesProtection.exe",
        cleanup: "cleanmgr.exe",
      };
      if (!Object.hasOwn(names, payload))
        throw new Error("Unknown system tool");
      const executable = path.join(
        process.env.SystemRoot || "C:\\Windows",
        "System32",
        payload === "services" ? "mmc.exe" : names[payload],
      );
      execFile(
        executable,
        payload === "services"
          ? [
              path.join(
                process.env.SystemRoot || "C:\\Windows",
                "System32",
                "services.msc",
              ),
            ]
          : [],
        { windowsHide: false },
        (error) => {
          if (error) dialog.showErrorBox("Windows tool failed", error.message);
        },
      );
      return true;
    }
    case "repair": {
      requireWindows();
      if (!["scan", "repair"].includes(payload))
        throw new Error("Unknown repair action");
      if (
        !(await confirm(
          "Open Windows integrity check?",
          payload === "scan"
            ? "Windows will request administrator approval to run SFC verification in a visible console. No repairs are requested."
            : "Windows will request administrator approval to run DISM RestoreHealth in a visible console. This may require internet access.",
        ))
      )
        return null;
      await windows.ps(
        `Start-Process -FilePath "$env:SystemRoot\\System32\\cmd.exe" -Verb RunAs -ArgumentList '/k ${payload === "scan" ? "sfc /verifyonly" : "DISM /Online /Cleanup-Image /RestoreHealth"}'`,
      );
      engine.event(
        "system",
        "launch",
        payload + " console opened; read results in that console",
      );
      return true;
    }
    case "export": {
      const result = await dialog.showSaveDialog(win, {
        defaultPath: "acog-profile.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled) return null;
      fs.writeFileSync(
        result.filePath,
        JSON.stringify(engine.exportProfile(), null, 2),
      );
      return true;
    }
    case "import": {
      const result = await dialog.showOpenDialog(win, {
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (result.canceled) return null;
      const file = result.filePaths[0];
      if (fs.statSync(file).size > 65536)
        throw new Error("Configuration is too large");
      return engine.validateProfile(JSON.parse(fs.readFileSync(file, "utf8")));
    }
    case "profile": {
      requireWindows();
      const ids = engine.validateProfile({
        format: "acog-profile",
        version: 1,
        tweaks: payload,
      });
      if (!ids.length) throw new Error("Select at least one tweak");
      if (
        !(await confirm(
          `Apply ${ids.length} selected tweaks?`,
          ids
            .map((id) => {
              const t = engine.get(id);
              return `${t.name} (${t.risk}): ${t.note}`;
            })
            .join("\n\n"),
        ))
      )
        return null;
      const failures = [];
      for (const id of ids) {
        if (engine.state.changes[id]) continue;
        try {
          await engine.apply(id);
        } catch (e) {
          failures.push(id + ": " + e.message);
        }
      }
      return { journal: engine.state, failures };
    }
    case "snapshot": {
      requireWindows();
      const snapshot = {
        at: new Date().toISOString(),
        hardware: await windows.inventory(),
        metrics: await windows.metrics(),
        changes: JSON.parse(JSON.stringify(engine.state.changes)),
      };
      const file = path.join(app.getPath("userData"), "snapshots.json");
      const snapshots = fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8"))
        : [];
      snapshots.push(snapshot);
      fs.writeFileSync(
        file + ".tmp",
        JSON.stringify(snapshots.slice(-20), null, 2),
      );
      fs.renameSync(file + ".tmp", file);
      return snapshots.slice(-20);
    }
    case "snapshots": {
      const file = path.join(app.getPath("userData"), "snapshots.json");
      return fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, "utf8"))
        : [];
    }
    default:
      throw new Error("Unknown action");
  }
}
app.whenReady().then(() => {
  try {
    engine = new Engine(app.getPath("userData"), windows.adapter);
  } catch (e) {
    dialog.showErrorBox("Recovery journal cannot be loaded", e.message);
    app.quit();
    return;
  }
  win = new BrowserWindow({
    icon: path.join(__dirname, "assets", "icon.png"),
    width: 1440,
    height: 940,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: "#0d0f14",
    title: "ACOG Tweaks",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  const entry = pathToFileURL(path.join(__dirname, "ui", "index.html")).href;
  ipcMain.handle("acog", async (event, action, payload) => {
    if (
      event.sender !== win.webContents ||
      event.senderFrame !== win.webContents.mainFrame ||
      event.senderFrame.url !== entry
    )
      throw new Error("Untrusted caller");
    try {
      return { ok: true, data: await act(action, payload) };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-navigate", (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, "ui", "index.html"));
});
app.on("window-all-closed", () => app.quit());
