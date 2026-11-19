import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const rootDirectory = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(rootDirectory, "dist");
const staticFiles = ["index.html", "styles.css", "speech-input.js", "app.js"];

function normalizeApiBaseUrl(value) {
  const normalized = value.trim().replace(/\/+$/, "");
  const url = new URL(normalized);

  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/') {
    throw new Error("API_BASE_URL must be an HTTP(S) origin without a path");
  }

  return url.origin;
}

const rawApiBaseUrl = process.env.API_BASE_URL;
if (!rawApiBaseUrl) {
  throw new Error("API_BASE_URL is required to build the frontend");
}

const apiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  staticFiles.map((fileName) =>
    copyFile(
      resolve(rootDirectory, fileName),
      resolve(outputDirectory, fileName),
    ),
  ),
);
await writeFile(
  resolve(outputDirectory, "config.js"),
  `window.APP_CONFIG = Object.freeze(${JSON.stringify({ API_BASE_URL: apiBaseUrl })});\n`,
  "utf8",
);

console.log(`Built frontend for API origin: ${apiBaseUrl}`);
