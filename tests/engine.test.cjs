const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { Engine } = require("../app/core/engine.cjs");
function setup(t, adapter) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "acog-test-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return new Engine(dir, adapter);
}
test("persists the original before writing and restores exact value and kind", async (t) => {
  let actual = { exists: true, value: 42, kind: "DWord" };
  let e;
  const adapter = {
    read: async () => ({ ...actual }),
    write: async (_, v) => {
      assert.ok(JSON.parse(fs.readFileSync(e.file)).changes["game-mode"]);
      actual = v;
    },
  };
  e = setup(t, adapter);
  await e.apply("game-mode");
  assert.equal(actual.value, 1);
  await e.restore("game-mode");
  assert.deepEqual(actual, { exists: true, value: 42, kind: "DWord" });
  assert.equal(Object.keys(e.state.changes).length, 0);
});
test("absent values restore absence across a restart", async (t) => {
  let written;
  const adapter = {
    read: async () => ({ exists: false }),
    write: async (_, v) => {
      written = v;
    },
  };
  const e = setup(t, adapter);
  await e.apply("ads");
  const restarted = new Engine(e.directory, adapter);
  await restarted.restore("ads");
  assert.deepEqual(written, { exists: false });
});
test("failed writes retain recovery records and log errors", async (t) => {
  const e = setup(t, {
    read: async () => ({ exists: false }),
    write: async () => {
      throw Error("Access denied");
    },
  });
  await assert.rejects(e.apply("power"), /Access denied/);
  assert.equal(e.state.changes.power.status, "needs-review");
  await assert.rejects(e.restore("power"));
  assert.ok(e.state.changes.power);
  assert.equal(e.state.events.length, 2);
});
test("duplicate concurrent applies cannot overwrite original", async (t) => {
  let reads = 0;
  const e = setup(t, {
    read: async () => {
      reads++;
      return { exists: false };
    },
    write: async () => {},
  });
  const results = await Promise.allSettled([e.apply("ads"), e.apply("ads")]);
  assert.equal(results[0].status, "fulfilled");
  assert.equal(results[1].status, "rejected");
  assert.equal(reads, 1);
});
test("journal failure prevents mutation", async (t) => {
  let writes = 0;
  const e = setup(t, {
    read: async () => ({ exists: false }),
    write: async () => {
      writes++;
    },
  });
  e.save = () => {
    throw Error("Disk full");
  };
  await assert.rejects(e.apply("ads"), /Disk full/);
  assert.equal(writes, 0);
});
test("profile input cannot inject commands or arbitrary settings", (t) => {
  const e = setup(t, {});
  for (const data of [
    null,
    { format: "acog-profile", version: 1, tweaks: ["; calc"] },
    { format: "acog-profile", version: 1, tweaks: ["ads", "ads"] },
    { format: "acog-profile", version: 2, tweaks: [] },
  ])
    assert.throws(() => e.validateProfile(data));
  assert.deepEqual(
    e.validateProfile({ format: "acog-profile", version: 1, tweaks: ["ads"] }),
    ["ads"],
  );
});
test("restore all continues after a failure and retains only failed entries", async (t) => {
  let restoring = false;
  const e = setup(t, {
    read: async () => ({ exists: false }),
    write: async (t) => {
      if (restoring && t.id === "ads") throw Error("locked");
    },
  });
  await e.apply("ads");
  await e.apply("game-mode");
  restoring = true;
  await assert.rejects(e.restoreAll(), /locked/);
  assert.deepEqual(Object.keys(e.state.changes), ["ads"]);
});
test("invalid journal fails closed instead of discarding recovery data", (t) => {
  const e = setup(t, {});
  fs.writeFileSync(e.file, "broken");
  assert.throws(() => new Engine(e.directory, {}));
});
test("preview catalog matches native catalog", () => {
  assert.deepEqual(
    require("../app/ui/catalog.json").tweaks,
    require("../app/core/catalog.cjs").tweaks,
  );
});
test("unexpected registry types are rejected before mutation or journaling", async (t) => {
  let writes = 0;
  const e = setup(t, {
    read: async () => ({ exists: true, value: [1, 2], kind: "Binary" }),
    write: async () => writes++,
  });
  await assert.rejects(e.apply("ads"), /Unexpected registry type/);
  assert.equal(writes, 0);
  assert.deepEqual(e.state.changes, {});
});
test("structurally invalid journals cannot lose originals through array serialization", (t) => {
  const e = setup(t, {});
  for (const changes of [
    [],
    { ads: { status: "applied", at: new Date().toISOString() } },
    {
      unknown: {
        original: { exists: false },
        status: "pending",
        at: new Date().toISOString(),
      },
    },
  ]) {
    fs.writeFileSync(
      e.file,
      JSON.stringify({ version: 1, changes, events: [] }),
    );
    assert.throws(() => new Engine(e.directory, {}));
  }
});
