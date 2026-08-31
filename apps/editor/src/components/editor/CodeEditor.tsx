"use client";

import Editor from "@monaco-editor/react";

type Props = {
  language: string;
  path: string;
  value: string;
  theme: "light" | "dark";
  onChange: (value: string | undefined) => void;
};

export default function CodeEditor({ language, path, value, theme, onChange }: Props) {
  return (
    <Editor
      path={path}
      language={language}
      value={value}
      theme={theme === "dark" ? "vs-dark" : "vs"}
      onChange={onChange}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        wordWrap: "on",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        lineNumbers: "on",
        tabSize: 2,
        padding: { top: 8, bottom: 8 },
      }}
      loading={<div className="flex h-full items-center justify-center text-xs text-muted-foreground">Loading Monaco...</div>}
    />
  );
}
