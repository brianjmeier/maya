import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  packageExtension,
  verifyExtensionSource,
} from "../scripts/package-extension.mjs";

const extensionDir = new URL("../extension/", import.meta.url);

async function temporaryDirectory(t) {
  const directory = await mkdtemp(resolve(tmpdir(), "maya-extension-package-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

async function copiedExtensionSource(t) {
  const sourceDir = resolve(await temporaryDirectory(t), "extension");
  await cp(extensionDir, sourceDir, { recursive: true });
  return sourceDir;
}

async function appendToFile(path, text) {
  await writeFile(path, `${await readFile(path, "utf8")}\n${text}\n`);
}

function storedZipFileList(buffer) {
  const files = [];
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const filenameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const filenameStart = offset + 30;
    files.push(
      buffer
        .subarray(filenameStart, filenameStart + filenameLength)
        .toString("utf8"),
    );
    offset = filenameStart + filenameLength + extraLength + compressedSize;
  }
  assert.equal(buffer.readUInt32LE(offset), 0x02014b50);
  return files;
}

test("production extension source passes release validation", async () => {
  const { files, manifest } = await verifyExtensionSource(
    extensionDir.pathname,
  );
  assert.equal(manifest.manifest_version, 3);
  assert.deepEqual(files, [...files].sort((a, b) => a.localeCompare(b)));
  assert.equal(files.includes("manifest.json"), true);
  assert.equal(files.some((file) => file.endsWith(".md")), false);
});

test("release ZIP has a deterministic, clean root file list", async (t) => {
  const releaseDir = await temporaryDirectory(t);
  const first = await packageExtension({
    sourceDir: extensionDir.pathname,
    releaseDir,
  });
  const firstBytes = await readFile(first.zipPath);
  const second = await packageExtension({
    sourceDir: extensionDir.pathname,
    releaseDir,
  });
  const secondBytes = await readFile(second.zipPath);

  assert.equal(first.sha256, second.sha256);
  assert.deepEqual(firstBytes, secondBytes);
  assert.deepEqual(storedZipFileList(firstBytes), first.files);
  assert.equal(first.files.includes("manifest.json"), true);
  assert.equal(first.files.some((file) => /README|node_modules|\.map$/i.test(file)), false);
});

test("release validation rejects development origins", async (t) => {
  const sourceDir = await copiedExtensionSource(t);
  await appendToFile(
    resolve(sourceDir, "service-worker.js"),
    "// http://localhost:4173",
  );

  await assert.rejects(
    verifyExtensionSource(sourceDir),
    /development-only hostname/,
  );
});

test("release validation rejects remotely hosted executable code", async (t) => {
  const sourceDir = await copiedExtensionSource(t);
  await appendToFile(
    resolve(sourceDir, "overlay.js"),
    'import("https://example.com/remote.js");',
  );

  await assert.rejects(
    verifyExtensionSource(sourceDir),
    /remote dynamic import/,
  );
});

test("release validation rejects missing runtime imports", async (t) => {
  const sourceDir = await copiedExtensionSource(t);
  await rm(resolve(sourceDir, "timer-state.js"));

  await assert.rejects(
    verifyExtensionSource(sourceDir),
    /Missing runtime file: timer-state\.js/,
  );
});
