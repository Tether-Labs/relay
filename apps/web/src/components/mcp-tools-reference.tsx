import { MCP_TOOLS, RELAY_MCP_NPM_URL, RELAY_MCP_README_URL } from "@/lib/mcp-tools";

type McpToolsReferenceProps = {
  compact?: boolean;
};

export function McpToolsReference({ compact = false }: McpToolsReferenceProps) {
  if (compact) {
    return (
      <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground">
        {MCP_TOOLS.map((tool) => (
          <li key={tool.name}>
            <code className="font-mono text-[11px] text-foreground">{tool.name}</code>
            <span className="text-muted-foreground"> — {tool.summary}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border border-border/80">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-border/80 bg-muted/35 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Tool</th>
              <th className="px-3 py-2 font-medium">What it does</th>
              <th className="px-3 py-2 font-medium">Example prompt</th>
            </tr>
          </thead>
          <tbody>
            {MCP_TOOLS.map((tool) => (
              <tr key={tool.name} className="border-b border-border/60 last:border-0">
                <td className="px-3 py-2 align-top font-mono text-xs text-foreground">{tool.name}</td>
                <td className="px-3 py-2 align-top text-muted-foreground">
                  {tool.summary}
                  {tool.params ? (
                    <span className="mt-1 block font-mono text-[11px] text-foreground/70">{tool.params}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 align-top text-xs italic text-foreground/80">
                  &ldquo;{tool.examplePrompt}&rdquo;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Full reference:{" "}
        <a href={RELAY_MCP_README_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          GitHub README
        </a>
        {" · "}
        <a href={RELAY_MCP_NPM_URL} target="_blank" rel="noreferrer" className="text-primary hover:underline">
          npm package
        </a>
      </p>
    </div>
  );
}
