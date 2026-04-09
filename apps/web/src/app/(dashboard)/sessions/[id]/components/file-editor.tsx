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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [MonacoEditor, setMonacoEditor] = useState<any>(null);
  const [localContent, setLocalContent] = useState<string | null>(content);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);

  useEffect(() => {
    import("@monaco-editor/react").then((mod) => {
      setMonacoEditor(() => mod.default);
    });
  }, []);

  // Update local content when remote content changes (only if not dirty and content actually changed)
  useEffect(() => {
    if (isDirty || content === null) return;
    // Don't update if content is the same — prevents cursor jumping
    if (content === localContent) return;
    setLocalContent(content);
  }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh open file periodically (only when not dirty, longer interval)
  useEffect(() => {
    if (!onContentRefresh) return;

    refreshTimerRef.current = setInterval(() => {
      if (!isDirty && !isSaving) {
        onContentRefresh();
      }
    }, 10000);

    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [onContentRefresh, isDirty, isSaving]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value === undefined) return;
      setLocalContent(value);
      setIsDirty(true);

      // Debounced auto-save (2s after last keystroke)
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        setIsSaving(true);
        onSave(value);
        // Small delay before clearing dirty to prevent immediate remote overwrite
        setTimeout(() => {
          setIsDirty(false);
          setIsSaving(false);
        }, 500);
      }, 2000);
    },
    [onSave],
  );

  // Ctrl+S manual save
  const handleEditorMount = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
