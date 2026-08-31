"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

export default function MonacoTest() {
  const [code, setCode] = useState(`<!doctype html>
<html>
  <head><title>Hello</title></head>
  <body>
    <h1>Hello, LadeCompile</h1>
    <p>No login. Just code.</p>
  </body>
</html>`);

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">index.html — Monaco test (client-only, ssr: false)</span>
        <span className="text-xs text-muted-foreground">{code.length} chars</span>
      </div>
      <div className="h-[280px]">
        <Editor
          height="280px"
          defaultLanguage="html"
          value={code}
          onChange={(v) => setCode(v ?? "")}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
