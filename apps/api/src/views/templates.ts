const STYLES = `
:root { color-scheme: dark; --bg:#0a0a0f; --card:#12121a; --border:#27272a; --text:#fafafa; --muted:#a1a1aa; --accent:#818cf8; }
* { box-sizing: border-box; }
body { margin:0; font:15px/1.6 system-ui,sans-serif; background:var(--bg); color:var(--text); }
a { color:var(--accent); }
.wrap { max-width:880px; margin:0 auto; padding:32px 20px 64px; }
header { display:flex; justify-content:space-between; align-items:center; margin-bottom:32px; }
.logo { font-weight:700; font-size:20px; letter-spacing:-0.02em; }
.card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:24px; margin-bottom:20px; }
h1 { font-size:28px; margin:0 0 8px; letter-spacing:-0.03em; }
h2 { font-size:18px; margin:0 0 16px; }
p { color:var(--muted); margin:0 0 16px; }
label { display:block; font-size:13px; color:var(--muted); margin-bottom:6px; }
input, select, button, textarea { font:inherit; }
input[type=email], input[type=text], select { width:100%; padding:10px 12px; border-radius:8px; border:1px solid var(--border); background:#0f0f14; color:var(--text); }
button, .btn { display:inline-block; padding:10px 16px; border-radius:8px; border:none; background:var(--accent); color:#fff; font-weight:600; cursor:pointer; text-decoration:none; }
button.secondary, .btn.secondary { background:transparent; border:1px solid var(--border); color:var(--text); }
.row { display:flex; gap:12px; flex-wrap:wrap; align-items:end; }
.stat { display:inline-block; min-width:100px; }
.stat strong { display:block; font-size:22px; color:var(--text); }
.artifact-item { border-top:1px solid var(--border); padding:16px 0; }
.artifact-item:first-child { border-top:none; padding-top:0; }
.meta { font-size:13px; color:var(--muted); }
.badge { display:inline-block; font-size:11px; padding:2px 8px; border-radius:999px; background:#1e1e2e; color:var(--muted); text-transform:uppercase; letter-spacing:0.04em; }
.copy-row { display:flex; gap:8px; margin-top:8px; }
.copy-row input { flex:1; font-size:13px; }
.flash { padding:12px 16px; border-radius:8px; background:#1e1b4b; color:#c7d2fe; margin-bottom:16px; }
`;

export function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} — Relay</title>
  <style>${STYLES}</style>
</head>
<body>
  <div class="wrap">
    <header>
      <a href="/" class="logo">Relay</a>
      <nav><a href="/">Open Relay</a></nav>
    </header>
    ${body}
  </div>
</body>
</html>`;
}

export function dashboardPage(
  email: string,
  owned: Array<{ slug: string; title: string; visibility: string; url: string; stats?: { totalViews: number; uniqueViewers: number } }>,
): string {
  const list =
    owned.length === 0
      ? `<p>No experiences yet. Publish your first HTML report below.</p>`
      : owned
          .map(
            (a) => `
      <div class="artifact-item">
        <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;">
          <div>
            <strong>${escapeHtml(a.title)}</strong>
            <span class="badge" style="margin-left:8px">${a.visibility}</span>
            <div class="meta">${a.stats ? `${a.stats.totalViews} views · ${a.stats.uniqueViewers} unique` : ""}</div>
          </div>
          <div><a href="/a/${a.slug}" target="_blank">View</a></div>
        </div>
        <div class="copy-row">
          <input readonly value="${escapeHtml(a.url)}" onclick="this.select()"/>
          <button type="button" onclick="navigator.clipboard.writeText('${escapeHtml(a.url)}')">Copy</button>
        </div>
      </div>`,
          )
          .join("");

  return layout(
    "Dashboard",
    `
    <p>Signed in as <strong>${escapeHtml(email)}</strong> · <form style="display:inline" method="post" action="/auth/logout"><button type="submit" class="secondary" style="padding:4px 10px;font-size:13px">Sign out</button></form></p>

    <div class="card">
      <h2>Publish experience</h2>
      <form method="post" action="/dashboard/publish" enctype="multipart/form-data">
        <label>Title</label>
        <input name="title" placeholder="Q2 AI Research Report" required style="margin-bottom:12px"/>
        <label>HTML file or zip bundle</label>
        <input type="file" name="file" accept=".html,.htm,.zip" required style="margin-bottom:12px"/>
        <label>Visibility</label>
        <select name="visibility" style="margin-bottom:16px">
          <option value="public">Public — anyone with link</option>
          <option value="private">Private — only you</option>
          <option value="restricted">Restricted — invited emails only</option>
        </select>
        <button type="submit">Publish</button>
      </form>
    </div>

    <div class="card">
      <h2>My artifacts</h2>
      ${list}
    </div>
  `,
  );
}

export function loginPage(next?: string, email?: string, message?: string): string {
  return layout(
    "Sign in",
    `
    <div class="card" style="max-width:420px;margin:40px auto">
      <h1>Sign in</h1>
      <p>Enter your email. We'll send a magic link — no password.</p>
      ${message ? `<div class="flash">${escapeHtml(message)}</div>` : ""}
      <form id="login-form">
        <label>Email</label>
        <input type="email" name="email" required value="${email ? escapeHtml(email) : ""}" style="margin-bottom:16px"/>
        <input type="hidden" name="next" value="${escapeHtml(next ?? "/dashboard")}"/>
        <button type="submit">Send magic link</button>
      </form>
      <p id="status" class="meta" style="margin-top:12px"></p>
    </div>
    <script>
      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const res = await fetch('/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: fd.get('email') })
        });
        const data = await res.json();
        document.getElementById('status').textContent = data.message || data.error || 'Check server console for dev link.';
      });
    </script>
  `,
  );
}

export function landingPage(baseUrl: string): string {
  return layout(
    "Share AI experiences securely",
    `
    <div style="text-align:center;padding:40px 0 24px">
      <p class="badge">Weekend prototype · Tether Labs</p>
      <h1 style="font-size:40px;margin:16px 0">Google Docs for AI experiences</h1>
      <p style="max-width:520px;margin:0 auto 24px">Publish HTML reports, dashboards, and agent outputs. Share with a link. Control who sees it. Track views.</p>
      <div class="row" style="justify-content:center">
        <a class="btn" href="/login">Get started</a>
        <a class="btn secondary" href="/a/demo" target="_blank">View demo experience</a>
      </div>
    </div>
    <div class="card">
      <h2>Weekend V1</h2>
      <div class="row">
        <div class="stat"><strong>Magic link</strong><span class="meta">No passwords</span></div>
        <div class="stat"><strong>Upload</strong><span class="meta">HTML or zip</span></div>
        <div class="stat"><strong>Permissions</strong><span class="meta">Public / private / restricted</span></div>
        <div class="stat"><strong>Analytics</strong><span class="meta">Views + uniques</span></div>
      </div>
    </div>
    <div class="card">
      <h2>CLI</h2>
      <pre style="background:#0f0f14;padding:16px;border-radius:8px;overflow:auto;font-size:13px;color:#c7d2fe">npm run publish -- demo/ai-research-report.html</pre>
    </div>
  `,
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
