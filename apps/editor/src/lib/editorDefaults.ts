export type EditorFile = "index.html" | "styles.css" | "script.js";

export const DEFAULT_FILES: Record<EditorFile, string> = {
  "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello, World!</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="container">
      <h1 class="title">Hello, World!</h1>
      <p>Edit the code on the left and see the preview update.</p>
      <button id="btn">Click me</button>
      <p id="output"></p>
    </main>
    <script src="script.js"></script>
  </body>
</html>
`,
  "styles.css": `body {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  padding: 24px;
  background: #fafafa;
  color: #18181b;
}

.container {
  max-width: 560px;
  margin: 0 auto;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  padding: 24px;
  background: white;
}

.title {
  color: #6366f1;
  font-size: 28px;
  margin: 0 0 8px;
}

button {
  background: #6366f1;
  color: white;
  border: 0;
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: 600;
}

button:hover {
  background: #5456e5;
}
`,
  "script.js": `const btn = document.getElementById("btn");
const output = document.getElementById("output");

let count = 0;
btn.addEventListener("click", () => {
  count += 1;
  output.textContent = \`Clicked \${count} time\${count === 1 ? "" : "s"}\`;
  console.log("Button clicked", count);
});

console.log("Hello, World! — from script.js");
`,
};

export const STORAGE_KEY = "ladecompile:editor:files:v1";
