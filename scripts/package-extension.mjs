import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PROJECT_DIR = fileURLToPath(new URL("../", import.meta.url));
const DEFAULT_SOURCE_DIR = resolve(PROJECT_DIR, "extension");
const DEFAULT_RELEASE_DIR = resolve(PROJECT_DIR, "release");

const RUNTIME_EXTENSIONS = new Set([
  ".css",
  ".gif",
  ".html",
  ".jpeg",
  ".jpg",
  ".js",
  ".json",
  ".mjs",
  ".png",
  ".svg",
  ".wasm",
  ".webp",
  ".woff",
  ".woff2",
]);
const IGNORED_FILENAMES = new Set([
  ".DS_Store",
  "desktop.ini",
  "README",
  "README.md",
  "Thumbs.db",
]);
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".github",
  ".idea",
  ".vscode",
  "__tests__",
  "coverage",
  "node_modules",
  "release",
]);
const REQUIRED_ICON_SIZES = [16, 32, 48, 128];

function comparePaths(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeRelativePath(path) {
  const normalized = path.replaceAll("\\", "/").replace(/^\.\//, "");
  invariant(
    normalized &&
      !normalized.startsWith("/") &&
      !normalized.split("/").includes(".."),
    `Unsafe extension path: ${path}`,
  );
  return normalized;
}

async function listRuntimeFiles(directory, root = directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        files.push(...(await listRuntimeFiles(resolve(directory, entry.name), root)));
      }
      continue;
    }
    invariant(
      entry.isFile(),
      `Unsupported filesystem entry in extension source: ${entry.name}`,
    );
    if (IGNORED_FILENAMES.has(entry.name)) continue;

    const path = normalizeRelativePath(relative(root, resolve(directory, entry.name)));
    const extension = extname(entry.name).toLowerCase();
    if (extension === ".md") continue;
    invariant(
      RUNTIME_EXTENSIONS.has(extension),
      `Unexpected non-runtime file in extension source: ${path}`,
    );
    invariant(
      !/\.(?:map|pem|crx|zip)$/i.test(entry.name) &&
        !/(?:^|\.)\b(?:test|spec)\b/i.test(entry.name),
      `Development artifact cannot be packaged: ${path}`,
    );
    files.push(path);
  }
  return files.sort(comparePaths);
}

function collectManifestReferences(manifest) {
  const references = new Set(["manifest.json"]);
  const add = (path) => {
    if (typeof path === "string" && path) {
      references.add(normalizeRelativePath(path));
    }
  };
  const addValues = (value) => {
    if (typeof value === "string") add(value);
    else if (Array.isArray(value)) value.forEach(addValues);
    else if (value && typeof value === "object") {
      Object.values(value).forEach(addValues);
    }
  };

  addValues(manifest.icons);
  add(manifest.background?.service_worker);
  addValues(manifest.action?.default_icon);
  add(manifest.action?.default_popup);
  add(manifest.options_page);
  add(manifest.options_ui?.page);
  add(manifest.devtools_page);
  add(manifest.side_panel?.default_path);
  addValues(manifest.chrome_url_overrides);
  addValues(manifest.sandbox?.pages);
  manifest.content_scripts?.forEach((script) => {
    addValues(script.js);
    addValues(script.css);
  });
  manifest.web_accessible_resources?.forEach((resource) =>
    addValues(resource.resources),
  );
  manifest.declarative_net_request?.rule_resources?.forEach((resource) =>
    add(resource.path),
  );

  return [...references].sort(comparePaths);
}

function globMatches(pattern, candidate) {
  const expression = pattern
    .split("*")
    .map((part) => part.replace(/[|\\{}()[\]^$+?.]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${expression}$`).test(candidate);
}

function validateManifest(manifest, files) {
  invariant(manifest.manifest_version === 3, "manifest_version must be 3");
  invariant(
    typeof manifest.name === "string" &&
      manifest.name.length > 0 &&
      manifest.name.length <= 75,
    "manifest name must contain 1–75 characters",
  );
  invariant(
    typeof manifest.description === "string" &&
      manifest.description.length > 0 &&
      manifest.description.length <= 132,
    "manifest description must contain 1–132 characters",
  );
  invariant(
    typeof manifest.version === "string" &&
      /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,3}$/.test(manifest.version),
    "manifest version must contain 1–4 dot-separated integers",
  );
  for (const part of manifest.version.split(".")) {
    invariant(Number(part) <= 65535, "manifest version parts must be <= 65535");
  }

  invariant(
    manifest.icons && typeof manifest.icons === "object",
    "manifest icons are required for a Web Store release",
  );
  for (const size of REQUIRED_ICON_SIZES) {
    invariant(
      typeof manifest.icons[String(size)] === "string",
      `manifest icons must include a ${size}px icon`,
    );
  }

  const manifestText = JSON.stringify(manifest);
  invariant(
    !/<all_urls>/i.test(manifestText),
    "Broad <all_urls> access is not allowed in the production package",
  );
  invariant(
    !/\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|terminal\.local)\b/i.test(
      manifestText,
    ),
    "Development-only origin found in production manifest",
  );
  const extensionCsp = manifest.content_security_policy?.extension_pages;
  if (extensionCsp) {
    invariant(
      /script-src\s+[^;]*'self'/.test(extensionCsp) &&
        !/script-src\s+[^;]*https?:/i.test(extensionCsp),
      "Extension CSP must execute packaged scripts only",
    );
  }

  const fileSet = new Set(files);
  for (const reference of collectManifestReferences(manifest)) {
    if (reference.includes("*")) {
      invariant(
        files.some((file) => globMatches(reference, file)),
        `Manifest pattern does not match a packaged file: ${reference}`,
      );
    } else {
      invariant(fileSet.has(reference), `Missing manifest file: ${reference}`);
    }
  }
}

function validatePngIcon(buffer, expectedSize, path) {
  const signature = "89504e470d0a1a0a";
  invariant(
    buffer.length >= 24 && buffer.subarray(0, 8).toString("hex") === signature,
    `Manifest icon is not a valid PNG: ${path}`,
  );
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  invariant(
    width === expectedSize && height === expectedSize,
    `Manifest icon ${path} must be ${expectedSize}x${expectedSize}, got ${width}x${height}`,
  );
}

const FORBIDDEN_SOURCE_PATTERNS = [
  {
    expression: /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0|terminal\.local)\b/i,
    reason: "development-only hostname",
  },
  {
    expression: /<script\b[^>]*\bsrc\s*=\s*["'](?:https?:)?\/\//i,
    reason: "remote script tag",
  },
  {
    expression: /\b(?:import|export)\s+[\s\S]{0,160}?\bfrom\s*["']https?:\/\//i,
    reason: "remote module import",
  },
  {
    expression: /\bimport\s*\(\s*["']https?:\/\//i,
    reason: "remote dynamic import",
  },
  {
    expression: /\bimportScripts\s*\([^)]*https?:\/\//i,
    reason: "remote worker import",
  },
  {
    expression: /\bnew\s+(?:Shared)?Worker\s*\(\s*["']https?:\/\//i,
    reason: "remote worker source",
  },
  {
    expression: /\b(?:eval|Function)\s*\(/,
    reason: "string-based code execution",
  },
  {
    expression: /\.src\s*=\s*["']https?:\/\//i,
    reason: "remote executable source assignment",
  },
];

function validateSourceText(text, path) {
  for (const { expression, reason } of FORBIDDEN_SOURCE_PATTERNS) {
    invariant(!expression.test(text), `${reason} found in ${path}`);
  }
}

function resolveSourceRelativePath(sourcePath, reference) {
  return normalizeRelativePath(
    relative("/", resolve("/", dirname(sourcePath), reference)),
  );
}

function collectLocalRuntimeReferences(text, sourcePath) {
  const references = [];
  for (const block of text.matchAll(/\bfiles\s*:\s*\[([\s\S]*?)\]/g)) {
    for (const match of block[1].matchAll(/["']([^"']+)["']/g)) {
      references.push(normalizeRelativePath(match[1]));
    }
  }
  for (const match of text.matchAll(
    /\bchrome\.runtime\.getURL\(\s*["']([^"']+)["']\s*\)/g,
  )) {
    references.push(normalizeRelativePath(match[1]));
  }
  const sourceRelativePatterns = [
    /\bimport\s*["'](\.[^"']+)["']/g,
    /\b(?:import|export)\s+[^;]*?\bfrom\s*["'](\.[^"']+)["']/g,
    /\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/g,
    /<(?:script|link|img)\b[^>]*(?:src|href)\s*=\s*["'](?![a-z]+:|\/|#|\$|\{)([^"']+)["']/gi,
  ];
  for (const pattern of sourceRelativePatterns) {
    for (const match of text.matchAll(pattern)) {
      references.push(resolveSourceRelativePath(sourcePath, match[1]));
    }
  }
  return references;
}

async function validatePackageSource(sourceDir, files, manifest) {
  const fileSet = new Set(files);
  for (const file of files) {
    const buffer = await readFile(resolve(sourceDir, file));
    if (
      [".css", ".html", ".js", ".json", ".mjs", ".svg"].includes(
        extname(file).toLowerCase(),
      )
    ) {
      const source = buffer.toString("utf8");
      validateSourceText(source, file);
      for (const reference of collectLocalRuntimeReferences(source, file)) {
        invariant(fileSet.has(reference), `Missing runtime file: ${reference}`);
      }
    }
  }

  for (const size of REQUIRED_ICON_SIZES) {
    const path = normalizeRelativePath(manifest.icons[String(size)]);
    invariant(
      path.toLowerCase().endsWith(".png"),
      `Manifest icon must be PNG: ${path}`,
    );
    validatePngIcon(await readFile(resolve(sourceDir, path)), size, path);
  }

  if (manifest.action?.default_icon) {
    for (const [sizeText, iconPath] of Object.entries(
      manifest.action.default_icon,
    )) {
      const size = Number(sizeText);
      const path = normalizeRelativePath(iconPath);
      invariant(
        Number.isInteger(size) && size > 0,
        `Invalid action icon size: ${sizeText}`,
      );
      invariant(
        path.toLowerCase().endsWith(".png"),
        `Action icon must be PNG: ${path}`,
      );
      validatePngIcon(await readFile(resolve(sourceDir, path)), size, path);
    }
  }
}

let crcTable;
function crc32(buffer) {
  crcTable ??= Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    return value >>> 0;
  });
  let checksum = 0xffffffff;
  for (const byte of buffer) checksum = crcTable[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
  return (checksum ^ 0xffffffff) >>> 0;
}

function createDeterministicZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const filename = Buffer.from(entry.path, "utf8");
    const checksum = crc32(entry.contents);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0x21, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(entry.contents.length, 18);
    local.writeUInt32LE(entry.contents.length, 22);
    local.writeUInt16LE(filename.length, 26);
    localParts.push(local, filename, entry.contents);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(0x0314, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(0, 12);
    central.writeUInt16LE(0x21, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(entry.contents.length, 20);
    central.writeUInt32LE(entry.contents.length, 24);
    central.writeUInt16LE(filename.length, 28);
    central.writeUInt32LE(0x81a40000, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, filename);
    offset += local.length + filename.length + entry.contents.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

export async function verifyExtensionSource(sourceDir = DEFAULT_SOURCE_DIR) {
  const manifestPath = resolve(sourceDir, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const files = await listRuntimeFiles(sourceDir);
  invariant(files.length > 0, "Extension package is empty");
  invariant(files.includes("manifest.json"), "manifest.json must be at the ZIP root");
  validateManifest(manifest, files);
  await validatePackageSource(sourceDir, files, manifest);
  return { files, manifest };
}

export async function packageExtension({
  sourceDir = DEFAULT_SOURCE_DIR,
  releaseDir = DEFAULT_RELEASE_DIR,
} = {}) {
  const { files, manifest } = await verifyExtensionSource(sourceDir);
  const basename = `standup-timer-extension-${manifest.version}`;
  const unpackedDir = resolve(releaseDir, "standup-timer-extension");
  const zipPath = resolve(releaseDir, `${basename}.zip`);
  const reportPath = resolve(releaseDir, `${basename}.report.json`);
  await mkdir(releaseDir, { recursive: true });
  await rm(unpackedDir, { recursive: true, force: true });
  await mkdir(unpackedDir, { recursive: true });

  const entries = [];
  for (const path of files) {
    const contents = await readFile(resolve(sourceDir, path));
    entries.push({ path, contents });
    const destination = resolve(unpackedDir, path);
    await mkdir(dirname(destination), { recursive: true });
    await cp(resolve(sourceDir, path), destination);
  }

  const zip = createDeterministicZip(entries);
  await writeFile(zipPath, zip);
  const sha256 = createHash("sha256").update(zip).digest("hex");
  const report = {
    extension: manifest.name,
    version: manifest.version,
    manifestVersion: manifest.manifest_version,
    fileCount: files.length,
    files,
    zipBytes: zip.length,
    sha256,
  };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  return { ...report, reportPath, unpackedDir, zipPath };
}

async function main() {
  if (process.argv.includes("--verify-only")) {
    const { files, manifest } = await verifyExtensionSource();
    console.log(
      `Extension source verified: ${manifest.name} v${manifest.version} (${files.length} files)`,
    );
    return;
  }
  const result = await packageExtension();
  console.log(`Extension package ready: ${result.zipPath}`);
  console.log(`Unpacked release ready: ${result.unpackedDir}`);
  console.log(`SHA-256: ${result.sha256}`);
  console.log(`Files (${result.fileCount}): ${result.files.join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
