import { extname } from "node:path";

export const ARTIFACT_UPLOAD_ACCEPT = ".html,.htm,.zip,.md,.markdown";

export function fileExtension(name: string): string {
  return extname(name).toLowerCase();
}

export function isZipFilename(name: string): boolean {
  return fileExtension(name) === ".zip";
}

export function isMarkdownFilename(name: string): boolean {
  const ext = fileExtension(name);
  return ext === ".md" || ext === ".markdown";
}

export function isHtmlFilename(name: string): boolean {
  const ext = fileExtension(name);
  return ext === ".html" || ext === ".htm";
}

export function isSupportedArtifactUpload(name: string): boolean {
  return isZipFilename(name) || isHtmlFilename(name) || isMarkdownFilename(name);
}

export function titleFromFilename(name: string): string {
  return name.replace(/\.(html?|zip|md|markdown)$/i, "") || "Untitled artifact";
}
