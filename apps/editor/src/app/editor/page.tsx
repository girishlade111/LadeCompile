export default function EditorRoute() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-xl font-bold">app/editor route</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        This file exists to satisfy Wrangler path <code className="rounded bg-muted px-1">/editor/*</code> → this Worker. The scaffold test lives at{" "}
        <code className="rounded bg-muted px-1">/</code> (external <code className="rounded bg-muted px-1">/editor</code> via basePath). Visit{" "}
        <a className="underline" href="/editor">
          /editor
        </a>
        .
      </p>
    </main>
  );
}
