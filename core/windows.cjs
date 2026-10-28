const { execFile } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { games } = require("./catalog.cjs");
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
function ps(script) {
  if (process.platform !== "win32")
    return Promise.reject(new Error("This action requires Windows 10 or 11."));
  return new Promise((resolve, reject) => {
    execFile(
      path.join(
        process.env.SystemRoot || "C:\\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      ),
      [
        "-NoLogo",
        "-NoProfile",
        "-NonInteractive",
        "-EncodedCommand",
        Buffer.from(
          "$ErrorActionPreference='Stop'; [Console]::OutputEncoding=[Text.UTF8Encoding]::new(); " +
            script,
          "utf16le",
        ).toString("base64"),
      ],
      { windowsHide: true, timeout: 25000, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) =>
        error
          ? reject(new Error((stderr || error.message).trim().slice(0, 1200)))
          : resolve(stdout.trim()),
    );
  });
}
async function json(script) {
  const raw = await ps(script);
  return raw ? JSON.parse(raw) : null;
}
const adapter = {
  async read(t) {
    if (t.type === "power") {
      const raw = await ps(
        'powercfg /getactivescheme; if($LASTEXITCODE -ne 0){throw "Cannot read power plan"}',
      );
      const value = raw.match(
        /[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/i,
      )?.[0];
      if (!value) throw new Error("Cannot identify active power plan");
      return { exists: true, value };
    }
    return json(
      `$p=${quote("HKCU:\\" + t.path)};$n=${quote(t.key)};$result=if((Test-Path $p) -and ((Get-Item $p).GetValueNames() -contains $n)){$k=Get-Item $p; @{exists=$true;value=$k.GetValue($n,$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames);kind=$k.GetValueKind($n).ToString()}}else{@{exists=$false}}; $result | ConvertTo-Json -Compress`,
    );
  },
  async write(t, v) {
    if (t.type === "power") {
      if (!/^[0-9a-f-]{36}$/i.test(v.value))
        throw new Error("Invalid power plan");
      await ps(
        `powercfg /setactive ${v.value}; if($LASTEXITCODE -ne 0){throw 'Power plan unavailable or access denied'}`,
      );
      return;
    }
    const p = quote("HKCU:\\" + t.path),
      n = quote(t.key);
    if (!v.exists) {
      await ps(
        `if((Test-Path ${p}) -and ((Get-Item ${p}).GetValueNames() -contains ${n})){Remove-ItemProperty -Path ${p} -Name ${n}}`,
      );
      return;
    }
    const kinds = [
      "String",
      "ExpandString",
      "DWord",
      "QWord",
      "MultiString",
      "Binary",
    ];
    if (!kinds.includes(v.kind))
      throw new Error("Unsupported registry value type");
    const encoded = Buffer.from(JSON.stringify(v.value)).toString("base64");
    await ps(
      `$v=ConvertFrom-Json ([Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encoded}'))); if(!(Test-Path ${p})){New-Item -Path ${p} -Force | Out-Null}; New-ItemProperty -Path ${p} -Name ${n} -Value $v -PropertyType ${v.kind} -Force | Out-Null`,
    );
  },
};
async function inventory() {
  return json(
    `$os=Get-CimInstance Win32_OperatingSystem;$cpu=Get-CimInstance Win32_Processor|Select-Object -First 1;$gpu=@(Get-CimInstance Win32_VideoController|Select-Object Name,DriverVersion);$disks=@();try{$disks=@(Get-PhysicalDisk|Select-Object FriendlyName,MediaType,HealthStatus,Size)}catch{};@{os=$os.Caption;build=$os.BuildNumber;cpu=$cpu.Name;cores=$cpu.NumberOfCores;threads=$cpu.NumberOfLogicalProcessors;gpu=$gpu;disks=$disks;memory=[math]::Round($os.TotalVisibleMemorySize/1MB,1)}|ConvertTo-Json -Depth 4 -Compress`,
  );
}
async function metrics() {
  return json(
    `$cpu=Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor -Filter "Name='_Total'";$os=Get-CimInstance Win32_OperatingSystem;$disk=Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'";$net=Get-CimInstance Win32_PerfFormattedData_Tcpip_NetworkInterface;$gpu=Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction SilentlyContinue|Where-Object Name -like '*engtype_3D'|Measure-Object UtilizationPercentage -Sum;@{cpu=[double]$cpu.PercentProcessorTime;ram=[math]::Round(100*(1-$os.FreePhysicalMemory/$os.TotalVisibleMemorySize),1);disk=[math]::Min(100,[double]$disk.PercentDiskTime);network=[double](($net|Measure-Object BytesTotalPersec -Sum).Sum);gpu=if($null -ne $gpu.Sum){[math]::Min(100,$gpu.Sum)}else{$null};at=(Get-Date).ToString('o')}|ConvertTo-Json -Compress`,
  );
}
async function detectGames() {
  const roots = [
    process.env.ProgramFiles,
    process.env["ProgramFiles(x86)"],
    "C:\\",
    process.env.LOCALAPPDATA,
  ].filter(Boolean);
  let extra = [];
  if (process.platform === "win32") {
    try {
      const epic = path.join(
        process.env.ProgramData || "C:\\ProgramData",
        "Epic",
        "EpicGamesLauncher",
        "Data",
        "Manifests",
      );
      for (const f of fs.readdirSync(epic).filter((f) => f.endsWith(".item"))) {
        const m = JSON.parse(fs.readFileSync(path.join(epic, f), "utf8"));
        if (m.InstallLocation) extra.push(m.InstallLocation);
      }
    } catch {}
    for (const root of roots) {
      try {
        const vdf = fs.readFileSync(
          path.join(root, "Steam", "steamapps", "libraryfolders.vdf"),
          "utf8",
        );
        for (const m of vdf.matchAll(/"path"\s+"([^"]+)"/g))
          extra.push(m[1].replaceAll("\\\\", "\\"));
      } catch {}
    }
  }
  return games.map((g) => ({
    ...g,
    installed:
      process.platform === "win32" &&
      (g.paths.some((p) => roots.some((r) => fs.existsSync(path.join(r, p)))) ||
        extra.some((r) =>
          g.paths.some(
            (p) =>
              fs.existsSync(path.join(r, p.replace(/^Steam\//, ""))) ||
              fs.existsSync(path.join(r, p.split("/").slice(2).join("/"))),
          ),
        ) ||
        (g.id === "minecraft" &&
          fs.existsSync(
            path.join(os.homedir(), "AppData", "Roaming", ".minecraft"),
          ))),
  }));
}
async function startup() {
  return json(
    "@(Get-CimInstance Win32_StartupCommand|Select-Object Name,Command,Location,User)|ConvertTo-Json -Compress",
  );
}
async function processes() {
  return json(
    '@(Get-Process|Sort-Object WorkingSet64 -Descending|Select-Object -First 30 ProcessName,Id,@{N="MemoryMB";E={[math]::Round($_.WorkingSet64/1MB)}})|ConvertTo-Json -Compress',
  );
}
async function services() {
  return json(
    "@(Get-Service|Where-Object Status -eq Running|Select-Object Name,DisplayName,Status)|ConvertTo-Json -Compress",
  );
}
module.exports = {
  adapter,
  inventory,
  metrics,
  detectGames,
  startup,
  processes,
  services,
  ps,
};
