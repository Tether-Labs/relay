export function markdownPreviewDocument(title: string, markdown: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    body { margin: 0; background: #fff; color: #1c1917; font: 15px/1.6 system-ui, sans-serif; padding: 24px; }
    main { max-width: 720px; margin: 0 auto; }
    pre { overflow-x: auto; background: #f5f5f4; padding: 12px; border-radius: 8px; }
    code { background: #f5f5f4; padding: 0.1em 0.3em; border-radius: 4px; }
  </style>
</head>
<body>
  <main id="content"></main>
  <script>
    document.getElementById("content").innerHTML = marked.parse(${JSON.stringify(markdown)});
  </script>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const ARTIFACT_UPLOAD_ACCEPT = ".html,.htm,.zip,.md,.markdown";

export function titleFromFilename(name: string): string {
  return name.replace(/\.(html?|zip|md|markdown)$/i, "").replace(/[-_]/g, " ");
}
