import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdownDocument(title: string, markdown: string): string {
  const body = marked.parse(markdown, { async: false }) as string;
  const safeTitle = escapeHtml(title);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f3eb;
      --paper: #fffdf8;
      --text: #1c1917;
      --muted: #78716c;
      --border: #e7e0d4;
      --accent: #b45309;
      --code-bg: #f5efe6;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 16px/1.65 "IBM Plex Sans", system-ui, sans-serif;
    }
    main {
      max-width: 760px;
      margin: 0 auto;
      padding: 48px 24px 96px;
    }
    article {
      background: var(--paper);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 40px 36px;
      box-shadow: 0 1px 2px rgba(28, 25, 23, 0.04);
    }
    h1, h2, h3, h4 {
      font-family: Outfit, "IBM Plex Sans", system-ui, sans-serif;
      line-height: 1.25;
      margin: 1.6em 0 0.6em;
      letter-spacing: -0.02em;
    }
    h1:first-child { margin-top: 0; }
    p, ul, ol, blockquote, pre, table { margin: 0 0 1em; }
    a { color: var(--accent); }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.92em;
      background: var(--code-bg);
      padding: 0.15em 0.35em;
      border-radius: 4px;
    }
    pre {
      overflow-x: auto;
      background: var(--code-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px 16px;
    }
    pre code { background: none; padding: 0; }
    blockquote {
      border-left: 3px solid var(--border);
      margin-left: 0;
      padding-left: 1em;
      color: var(--muted);
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      border: 1px solid var(--border);
      padding: 8px 10px;
      text-align: left;
    }
    hr { border: none; border-top: 1px solid var(--border); margin: 2em 0; }
  </style>
</head>
<body>
  <main>
    <article class="relay-markdown">${body}</article>
  </main>
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
