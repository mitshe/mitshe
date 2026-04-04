"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Loader2, Save } from "lucide-react";

function getLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    json: "json",
    md: "markdown",
    mdx: "markdown",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    less: "less",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "cpp",
    cs: "csharp",
    php: "php",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    yaml: "yaml",
    yml: "yaml",
    toml: "ini",
    ini: "ini",
    xml: "xml",
    svg: "xml",
    graphql: "graphql",
    gql: "graphql",
    dockerfile: "dockerfile",
    prisma: "graphql",
    env: "ini",
    gitignore: "plaintext",
    txt: "plaintext",
    log: "plaintext",
    lock: "json",
  };

  const filename = filePath.split("/").pop()?.toLowerCase() || "";
  if (filename === "dockerfile") return "dockerfile";
  if (filename === "makefile") return "plaintext";
  if (filename === "justfile") return "shell";
  if (filename.startsWith(".env")) return "ini";

  return map[ext] || "plaintext";
}

export function FileEditor({
  filePath,
  content,
  isLoading,
  onSave,
  onContentRefresh,
}: {
  filePath: string;
  content: string | null;
  isLoading: boolean;
  onSave: (content: string) => void;
  onContentRefresh?: () => void;
}) {
  const [MonacoEditor, setMonacoEditor] = useState<any>(null);
  const [localContent, setLocalContent] = useState<string | null>(content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);

  useEffect(() => {
    import("@monaco-editor/react").then((mod) => {
      setMonacoEditor(() => mod.default);
    });
  }, []);

  // Update local content when remote content changes (and not dirty)
  useEffect(() => {
    if (!isDirty && content !== null) {
      setLocalContent(content);
    }
  }, [content, isDirty]);

  // Auto-refresh open file periodically (when not dirty)
  useEffect(() => {
    if (!onContentRefresh) return;

    refreshTimerRef.current = setInterval(() => {
      if (!isDirty) {
        onContentRefresh();
      }
    }, 5000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [onContentRefresh, isDirty]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      setLocalContent(value);
      setIsDirty(true);

      // Debounced auto-save (1.5s after last keystroke)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setIsSaving(true);
        onSave(value);
        setIsDirty(false);
        setIsSaving(false);
      }, 1500);
    },
    [onSave],
  );

  // Ctrl+S manual save
  const handleEditorMount = useCallback(
    (editor: any) => {
      editorRef.current = editor;
      editor.addCommand(
        // Monaco KeyMod.CtrlCmd | Monaco KeyCode.KeyS
        2048 | 49,
        () => {
          const value = editor.getValue();
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          setIsSaving(true);
          onSave(value);
          setIsDirty(false);
          setIsSaving(false);
        },
      );
    },
    [onSave],
  );

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (isLoading || !MonacoEditor) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (localContent === null) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-muted-foreground">
        <p className="text-sm">Failed to load file</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#252526] text-xs text-[#969696] shrink-0">
        <span>{filePath}</span>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="flex items-center gap-1">
              <Save className="w-3 h-3" /> Saving...
            </span>
          )}
          {isDirty && !isSaving && (
            <span className="text-yellow-500">Modified</span>
          )}
          <span>{getLanguage(filePath)}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <MonacoEditor
          height="100%"
          language={getLanguage(filePath)}
          value={localContent}
          theme="vs-dark"
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: true },
            fontSize: 13,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            wordWrap: "off",
            automaticLayout: true,
            padding: { top: 8 },
            tabSize: 2,
          }}
        />
      </div>
    </div>
  );
}
