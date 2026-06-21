import { describe, expect, it } from "vitest";
import {
  isMarkdownFilename,
  isSupportedArtifactUpload,
  titleFromFilename,
} from "../src/lib/artifact-files.js";
import { renderMarkdownDocument } from "../src/lib/markdown.js";

describe("artifact-files", () => {
  it("accepts markdown uploads", () => {
    expect(isSupportedArtifactUpload("report.md")).toBe(true);
    expect(isSupportedArtifactUpload("notes.markdown")).toBe(true);
    expect(isSupportedArtifactUpload("report.pdf")).toBe(false);
  });

  it("detects markdown filenames", () => {
    expect(isMarkdownFilename("README.md")).toBe(true);
    expect(isMarkdownFilename("index.html")).toBe(false);
  });

  it("derives titles from markdown filenames", () => {
    expect(titleFromFilename("agent-research-brief.md")).toBe("agent-research-brief");
  });
});

describe("renderMarkdownDocument", () => {
  it("renders headings and code blocks", () => {
    const html = renderMarkdownDocument("Test", "# Hello\n\n```ts\nconst x = 1;\n```");
    expect(html).toContain("<h1");
    expect(html).toContain("Hello");
    expect(html).toContain("<code");
    expect(html).toContain("relay-markdown");
  });
});
