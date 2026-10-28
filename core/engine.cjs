const fs = require("node:fs");
const path = require("node:path");
const { tweaks } = require("./catalog.cjs");
class Engine {
  constructor(directory, adapter) {
    this.directory = directory;
    this.adapter = adapter;
    fs.mkdirSync(directory, { recursive: true });
    this.file = path.join(directory, "recovery.json");
    this.state = { version: 1, changes: {}, events: [] };
    if (fs.existsSync(this.file)) {
      this.state = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (
        this.state.version !== 1 ||
        !this.state.changes ||
        typeof this.state.changes !== "object" ||
        Array.isArray(this.state.changes) ||
        !Array.isArray(this.state.events)
      )
        throw new Error(
          "Recovery journal is invalid. Preserve the file and contact support.",
        );
    }
    for (const [id, entry] of Object.entries(this.state.changes)) {
      const tweak = this.get(id);
      const original = entry?.original;
      const validValue =
        !original?.exists ||
        (tweak.type === "power"
          ? typeof original.value === "string" &&
            /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
              original.value,
            )
          : original.kind === (tweak.kind || "DWord") &&
            (tweak.kind === "String"
              ? typeof original.value === "string"
              : Number.isInteger(original.value) &&
                original.value >= -2147483648 &&
                original.value <= 4294967295));
      if (
        !original ||
        typeof original.exists !== "boolean" ||
        !validValue ||
        !["pending", "applied", "needs-review"].includes(entry.status) ||
        typeof entry.at !== "string" ||
        Number.isNaN(Date.parse(entry.at))
      ) {
        throw new Error(
          "Recovery journal contains an invalid entry. Preserve it before continuing.",
        );
      }
    }
    this.queue = Promise.resolve();
  }
  save() {
    const tmp = this.file + ".tmp";
    const fd = fs.openSync(tmp, "w", 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(this.state, null, 2));
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmp, this.file);
  }
  event(id, action, message) {
    this.state.events.push({
      at: new Date().toISOString(),
      id,
      action,
      message,
    });
    this.state.events = this.state.events.slice(-1000);
    this.save();
  }
  run(fn) {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => {});
    return next;
  }
  get(id) {
    const t = tweaks.find((t) => t.id === id);
    if (!t) throw new Error("Unknown tweak");
    return t;
  }
  apply(id) {
    return this.run(async () => {
      const t = this.get(id);
      if (this.state.changes[id])
        throw new Error(
          "A recovery record already exists. Restore before applying again.",
        );
      const original = await this.adapter.read(t);
      if (
        t.type !== "power" &&
        original.exists &&
        original.kind !== (t.kind || "DWord")
      )
        throw new Error("Unexpected registry type; no change was made.");
      this.state.changes[id] = {
        original,
        status: "pending",
        at: new Date().toISOString(),
      };
      this.save();
      try {
        await this.adapter.write(t, {
          exists: true,
          value: t.value,
          kind: t.kind || "DWord",
        });
        this.state.changes[id].status = "applied";
        this.event(id, "apply", "Applied successfully");
      } catch (e) {
        this.state.changes[id].status = "needs-review";
        this.event(id, "error", e.message);
        throw e;
      }
      return this.state;
    });
  }
  restore(id) {
    return this.run(async () => {
      const t = this.get(id),
        entry = this.state.changes[id];
      if (!entry) throw new Error("No saved original value");
      try {
        await this.adapter.write(t, entry.original);
        delete this.state.changes[id];
        this.event(id, "restore", "Original value restored");
      } catch (e) {
        this.event(id, "error", e.message);
        throw e;
      }
      return this.state;
    });
  }
  async restoreAll() {
    const failures = [];
    for (const id of Object.keys(this.state.changes).reverse()) {
      try {
        await this.restore(id);
      } catch (e) {
        failures.push(`${id}: ${e.message}`);
      }
    }
    if (failures.length) throw new Error(failures.join("\n"));
    return this.state;
  }
  exportProfile() {
    return {
      format: "acog-profile",
      version: 1,
      tweaks: Object.keys(this.state.changes).filter(
        (id) => this.state.changes[id].status === "applied",
      ),
    };
  }
  validateProfile(data) {
    if (
      data?.format !== "acog-profile" ||
      data.version !== 1 ||
      !Array.isArray(data.tweaks) ||
      data.tweaks.length > tweaks.length ||
      new Set(data.tweaks).size !== data.tweaks.length
    )
      throw new Error("Invalid configuration format");
    data.tweaks.forEach((id) => this.get(id));
    return data.tweaks;
  }
}
module.exports = { Engine };
