import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const extensionUrl = new URL("../extension/", import.meta.url);

test("extension keeps its permissions narrow", async () => {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", extensionUrl), "utf8"),
  );
  assert.deepEqual(manifest.permissions, ["activeTab", "scripting", "storage"]);
  assert.equal(JSON.stringify(manifest).includes("<all_urls>"), false);
});

test("overlay mirrors the timer-only controls and cleans up", async () => {
  const source = await readFile(new URL("overlay.js", extensionUrl), "utf8");
  assert.match(source, /data-action="subtract-30"/);
  assert.match(source, /data-action="add-30"/);
  assert.doesNotMatch(source, /data-action="next"/);
  assert.match(source, /removeListener\(receiveStorageChange\)/);
  assert.match(source, /clearInterval\(intervalId\)/);
});
