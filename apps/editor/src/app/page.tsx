export default function Page() {
  return (
    <main
      style={{
        maxWidth: 640,
        width: "100%",
        border: "1px solid #27272a",
        borderRadius: 16,
        padding: "2.5rem",
        background: "#111113",
        textAlign: "center" as const,
      }}
    >
      <div
        style={{
          display: "inline-block",
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          border: "1px solid #27272a",
          borderRadius: 999,
          padding: "0.3rem 0.7rem",
          color: "#a1a1aa",
          marginBottom: "1rem",
        }}
      >
        apps/editor · Next.js + Cloudflare Workers
      </div>
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: 800,
          letterSpacing: "-0.03em",
        }}
      >
        LadeCompile <span style={{ color: "#6366f1" }}>editor</span>
      </h1>
      <p style={{ color: "#a1a1aa", marginTop: "0.75rem", lineHeight: 1.6 }}>
        Next.js worker is running. This is the default welcome page.
        <br />
        Three-file Monaco editor + live preview will be built in a later prompt.
      </p>
      <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#a1a1aa" }}>
        Route: <code style={{ background: "#1e1e22", padding: "0.15rem 0.4rem", borderRadius: 6, fontSize: "0.85em" }}>/editor/*</code> → this
        worker
      </p>
      <a
        href="/"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          background: "#6366f1",
          color: "white",
          textDecoration: "none",
          padding: "0.7rem 1.25rem",
          borderRadius: 999,
          fontWeight: 600,
          fontSize: "0.9rem",
        }}
      >
        ← Back to Home
      </a>
    </main>
  );
}
