# Agent Research Brief

A sample Markdown artifact for testing Relay's `.md` publish flow.

## Summary

Agents increasingly output **Markdown** — reports, plans, research briefs, and post-mortems. Relay renders `.md` files as styled HTML at share links.

## Highlights

- Upload `.md` from the web dashboard, CLI, or MCP
- Server-side rendering with GitHub-flavored Markdown
- Same permissions and analytics as HTML artifacts

## Code example

```ts
await publishArtifact({
  filePath: "./report.md",
  title: "Q2 Research Brief",
  visibility: "restricted",
});
```

## Next steps

1. Publish this file via MCP
2. Share the `/a/:slug` link
3. Invite viewers with `invite_artifact_viewers`
