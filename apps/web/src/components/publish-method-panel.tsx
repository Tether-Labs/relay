import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, SignUpButton } from "@clerk/clerk-react";
import { Copy, Plugs, Sparkle, Terminal, UploadSimple, Globe } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CURSOR_MCP_CONFIG, RELAY_MCP_PACKAGE } from "@/lib/mcp-tools";
import { ARTIFACT_UPLOAD_ACCEPT } from "@/lib/artifact-files";
import { McpToolsReference } from "@/components/mcp-tools-reference";

type TabId = "web" | "cli" | "mcp" | "skills";

const TABS: { id: TabId; label: string; icon: typeof Globe }[] = [
  { id: "web", label: "Web", icon: Globe },
  { id: "cli", label: "CLI", icon: Terminal },
  { id: "mcp", label: "MCP", icon: Plugs },
  { id: "skills", label: "Skills", icon: Sparkle },
];

const CLI_COMMAND = "relay publish report.html";
const SKILLS_COMMAND = "npx skills@latest add relay/skills";

const MCP_PLATFORMS = [
  { id: "cursor", label: "Cursor" },
  { id: "claude", label: "Claude" },
  { id: "claude-code", label: "Claude Code" },
  { id: "windsurf", label: "Windsurf" },
  { id: "vscode", label: "VS Code" },
  { id: "warp", label: "Warp" },
] as const;

type McpPlatform = (typeof MCP_PLATFORMS)[number]["id"];

function copyText(text: string, message = "Copied to clipboard") {
  navigator.clipboard.writeText(text);
  toast.success(message);
}

function PanelBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("min-w-0 p-3", className)}>{children}</div>;
}

function CommandBlock({ command, prompt = "$" }: { command: string; prompt?: string | null }) {
  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-md border border-border/80 bg-muted/40 px-3 py-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <code className="block whitespace-pre font-mono text-[13px] leading-relaxed text-foreground">
        {prompt ? (
          <>
            <span className="select-none text-primary">{prompt} </span>
            {command}
          </>
        ) : (
          command
        )}
      </code>
    </div>
  );
}

function CliCommandPanel() {
  return (
    <PanelBody>
      <CommandBlock command={CLI_COMMAND} />
    </PanelBody>
  );
}

function SkillsCommandPanel() {
  return (
    <PanelBody>
      <CommandBlock command={SKILLS_COMMAND} prompt={null} />
    </PanelBody>
  );
}

function McpCommandPanel({
  platform,
  onPlatformChange,
}: {
  platform: McpPlatform;
  onPlatformChange: (platform: McpPlatform) => void;
}) {
  return (
    <PanelBody className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Install <code className="font-mono text-foreground">{RELAY_MCP_PACKAGE}</code>, create a token in{" "}
        <span className="text-foreground">Account → MCP & tokens</span>, then add this config for{" "}
        {MCP_PLATFORMS.find((item) => item.id === platform)?.label ?? "your client"}:
      </p>
      <CommandBlock command={CURSOR_MCP_CONFIG} prompt={null} />
      <div className="flex min-w-0 flex-wrap gap-1.5">
        {MCP_PLATFORMS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onPlatformChange(id)}
            className={cn(
              "rounded-full border px-2.5 py-0.5 font-mono text-[11px] transition-colors",
              platform === id
                ? "border-primary/40 bg-primary/8 text-primary"
                : "border-border text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="rounded-md border border-border/70 bg-muted/20 p-3">
        <p className="mb-2 text-xs font-medium text-foreground">Available tools</p>
        <McpToolsReference compact />
      </div>
    </PanelBody>
  );
}

function WebDropZone() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function goPublish(file: File) {
    navigate("/publish", { state: { file } });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) goPublish(f);
  }

  return (
    <PanelBody>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed px-4 py-6 text-center transition-colors",
          dragOver
            ? "border-primary/50 bg-primary/5"
            : "border-border bg-muted/25 hover:border-primary/30 hover:bg-muted/40",
        )}
      >
        <UploadSimple className="mb-2 size-5 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drop file or click to browse</p>
        <p className="mt-1 text-xs text-muted-foreground">.html, .htm, .md, .zip</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ARTIFACT_UPLOAD_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) goPublish(f);
          }}
        />
      </div>
    </PanelBody>
  );
}

function WebSignedOut() {
  return (
    <PanelBody>
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/25 px-4 py-6 text-center">
        <UploadSimple className="mb-2 size-5 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Sign in to upload</p>
        <p className="mt-1 text-xs text-muted-foreground">Drag and drop works once you have an account</p>
        <SignUpButton mode="modal">
          <Button size="sm" className="mt-4">
            Get started
          </Button>
        </SignUpButton>
      </div>
    </PanelBody>
  );
}

export function PublishMethodPanel({ className }: { className?: string }) {
  const [activeTab, setActiveTab] = useState<TabId>("web");
  const [mcpPlatform, setMcpPlatform] = useState<McpPlatform>("cursor");
  const activeIcon = TABS.find((t) => t.id === activeTab)!.icon;
  const ActiveIcon = activeIcon;

  const activeCopyText =
    activeTab === "cli"
      ? CLI_COMMAND
      : activeTab === "skills"
        ? SKILLS_COMMAND
        : activeTab === "mcp"
          ? CURSOR_MCP_CONFIG
          : null;

  return (
    <div className={cn("mt-6 w-full min-w-0", className)}>
      <div className="mb-3">
        <p className="text-sm font-medium text-foreground">Publish an artifact</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Upload in the browser, or install Relay in your agent stack.
        </p>
      </div>

      <div className="paper-sheet w-full min-w-0 overflow-hidden">
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border/80 bg-muted/35 px-3">
          <ActiveIcon className="size-4 shrink-0 text-muted-foreground" weight="duotone" />
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 font-mono text-xs transition-colors",
                  activeTab === id
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/80"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => activeCopyText && copyText(activeCopyText)}
            disabled={!activeCopyText}
            className={cn(
              "size-7 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none",
              !activeCopyText && "invisible",
            )}
            aria-label="Copy command"
          >
            <Copy className="size-4" />
          </button>
        </div>

        {activeTab === "web" ? (
          <>
            <SignedIn>
              <WebDropZone />
            </SignedIn>
            <SignedOut>
              <WebSignedOut />
            </SignedOut>
          </>
        ) : activeTab === "cli" ? (
          <CliCommandPanel />
        ) : activeTab === "skills" ? (
          <SkillsCommandPanel />
        ) : (
          <McpCommandPanel platform={mcpPlatform} onPlatformChange={setMcpPlatform} />
        )}
      </div>
    </div>
  );
}
