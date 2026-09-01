"use client";

import { useState, Component, type ErrorInfo, type ReactNode } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  language: string;
  path: string;
  value: string;
  theme: "light" | "dark";
  minimap?: boolean;
  fontSize?: number;
  onMount?: OnMount;
  onChange: (value: string | undefined) => void;
};

function EditorSkeleton() {
  return (
    <div className="flex h-full w-full select-none flex-col bg-background p-3 font-mono text-xs animate-pulse">
      <div className="flex flex-col gap-2.5">
        {[
          "w-3/5",
          "w-2/5",
          "w-4/5",
          "w-1/2",
          "w-3/4",
          "w-2/3",
          "w-1/3",
          "w-4/6",
          "w-3/5",
          "w-1/4",
          "w-2/3",
          "w-1/2",
        ].map((w, idx) => (
          <div key={idx} className="flex items-center gap-4">
            <span className="w-6 text-right text-[11px] font-medium text-muted-foreground/30">
              {idx + 1}
            </span>
            <div className={`h-3 rounded bg-muted/60 dark:bg-muted/40 ${w}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

class MonacoErrorBoundary extends Component<
  { children: ReactNode; onRetry: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; onRetry: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[LadeCompile] Monaco Error Boundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Editor failed to load</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              We encountered an issue loading Monaco editor. Please check your connection and retry.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 text-xs"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              this.props.onRetry();
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Editor
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function CodeEditor({
  language,
  path,
  value,
  theme,
  minimap = false,
  fontSize = 13,
  onMount,
  onChange,
}: Props) {
  const [retryKey, setRetryKey] = useState(0);

  return (
    <MonacoErrorBoundary key={retryKey} onRetry={() => setRetryKey((k) => k + 1)}>
      <Editor
        key={`${path}-${retryKey}`}
        path={path}
        language={language}
        value={value}
        theme={theme === "dark" ? "vs-dark" : "vs"}
        onChange={onChange}
        onMount={onMount}
        options={{
          minimap: { enabled: minimap },
          fontSize: fontSize,
          wordWrap: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbers: "on",
          tabSize: 2,
          padding: { top: 8, bottom: 8 },
        }}
        loading={<EditorSkeleton />}
      />
    </MonacoErrorBoundary>
  );
}
