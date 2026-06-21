import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname, normalize, relative } from "node:path";
import AdmZip from "adm-zip";
import { getConfig } from "../config.js";
import { isMarkdownFilename } from "./artifact-files.js";

export function artifactDir(slug: string): string {
  const dir = join(getConfig().storageDir, slug);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function saveHtmlFile(slug: string, filename: string, content: Buffer | string): string {
  const dir = artifactDir(slug);
  const safeName = sanitizeFilename(filename);
  const path = join(dir, safeName);
  writeFileSync(path, content);
  return safeName;
}

export function extractZip(slug: string, zipBuffer: Buffer): string {
  const dir = artifactDir(slug);
  const zip = new AdmZip(zipBuffer);
  zip.extractAllTo(dir, true);
  return findEntryFile(dir);
}

function findEntryFile(dir: string): string {
  const htmlCandidates = ["index.html", "Index.html", "report.html", "README.html"];
  for (const name of htmlCandidates) {
    if (existsSync(join(dir, name))) return name;
  }

  const htmlFiles = walk(dir).filter((f) => extname(f).toLowerCase() === ".html");
  if (htmlFiles.length > 0) return relative(dir, htmlFiles[0]!);

  const markdownCandidates = ["index.md", "README.md", "report.md"];
  for (const name of markdownCandidates) {
    if (existsSync(join(dir, name))) return name;
  }

  const markdownFiles = walk(dir).filter((f) => isMarkdownFilename(f));
  if (markdownFiles.length > 0) return relative(dir, markdownFiles[0]!);

  throw new Error("No HTML or Markdown file found in upload");
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

export function readArtifactFile(slug: string, filePath: string): Buffer | null {
  const dir = artifactDir(slug);
  const resolved = normalize(join(dir, filePath));
  if (!resolved.startsWith(normalize(dir))) return null;
  if (!existsSync(resolved)) return null;
  return readFileSync(resolved);
}

export function listArtifactFiles(slug: string): string[] {
  const dir = join(getConfig().storageDir, slug);
  if (!existsSync(dir)) return [];
  return walk(dir).map((f) => relative(dir, f));
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_") || "index.html";
}
