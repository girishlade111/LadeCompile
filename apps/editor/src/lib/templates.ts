import type { EditorFile } from "./editorDefaults";

export type TemplateCategory = "Starters" | "Layouts" | "Components" | "Forms";

export type Template = {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  html: string;
  css: string;
  js: string;
};

export const TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Blank — Hello World",
    category: "Starters",
    description: "Clean starter with centered Hello World, the default boilerplate.",
    html: `<!doctype html>
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
</html>`,
    css: `body {
  font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  background: #fafafa;
  color: #18181b;
  padding: 24px;
}
.container {
  max-width: 560px;
  margin: 0 auto;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  padding: 24px;
  background: white;
}
.title { color: #6366f1; font-size: 28px; margin: 0 0 8px; }
button {
  background: #6366f1; color: white; border: 0; border-radius: 999px;
  padding: 8px 16px; cursor: pointer; font-weight: 600;
}
button:hover { background: #5456e5; }`,
    js: `const btn = document.getElementById("btn");
const output = document.getElementById("output");
let count = 0;
btn.addEventListener("click", () => {
  count += 1;
  output.textContent = \`Clicked \${count} time\${count === 1 ? "" : "s"}\`;
  console.log("Button clicked", count);
});
console.log("Hello, World! — from script.js");`,
  },
  {
    id: "landing",
    name: "Landing Page",
    category: "Layouts",
    description: "Hero with nav, feature grid and CTA — great for marketing pages.",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Landing</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header class="nav">
    <strong>Acme</strong>
    <nav><a href="#">Features</a><a href="#">Pricing</a><a href="#">Docs</a></nav>
  </header>
  <section class="hero">
    <h1>Build faster with Acme</h1>
    <p>The free HTML/CSS/JS playground for rapid prototyping — no login required.</p>
    <button id="cta">Get Started — Free</button>
  </section>
  <section class="features">
    <div class="feature"><h3>Live Preview</h3><p>Instant sandboxed render as you type.</p></div>
    <div class="feature"><h3>No Login</h3><p>Share via URL, no account needed.</p></div>
    <div class="feature"><h3>Export</h3><p>ZIP, copy, or screenshot in one click.</p></div>
  </section>
  <script src="script.js"></script>
</body>
</html>`,
    css: `*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif;color:#18181b;background:#fff}
.nav{display:flex;justify-content:space-between;align-items:center;padding:16px 24px;border-bottom:1px solid #e4e4e7}
.nav a{margin-left:16px;color:#52525b;text-decoration:none;font-size:14px}
.hero{text-align:center;padding:56px 24px;background:linear-gradient(180deg,#eef2ff,white)}
.hero h1{font-size:40px;margin:0 0 12px}
.hero p{color:#52525b;max-width:560px;margin:0 auto 20px}
#cta{background:#6366f1;color:white;border:0;padding:12px 20px;border-radius:999px;font-weight:600;cursor:pointer}
#cta:hover{background:#5456e5}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;padding:32px 24px;max-width:900px;margin:0 auto}
.feature{border:1px solid #e4e4e7;border-radius:12px;padding:16px}
.feature h3{margin:0 0 6px;font-size:16px}`,
    js: `document.getElementById("cta").addEventListener("click", () => {
  console.log("CTA clicked");
  alert("Welcome to Acme — this is a template CTA!");
});`,
  },
  {
    id: "contact-form",
    name: "Contact Form",
    category: "Forms",
    description: "Accessible form with inputs, validation UI and focus states.",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Contact</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <form class="card" id="form">
    <h1>Contact us</h1>
    <p class="muted">We'd love to hear from you — no account needed.</p>
    <label>Name<input id="name" placeholder="Ada Lovelace" required /></label>
    <label>Email<input id="email" type="email" placeholder="ada@example.com" required /></label>
    <label>Message<textarea id="msg" rows="4" placeholder="Your message..." required></textarea></label>
    <button type="submit">Send message</button>
    <p id="status"></p>
  </form>
  <script src="script.js"></script>
</body>
</html>`,
    css: `body{font-family:system-ui,sans-serif;background:#fafafa;color:#18181b;padding:24px}
.card{max-width:480px;margin:0 auto;background:white;border:1px solid #e4e4e7;border-radius:12px;padding:24px}
h1{margin:0 0 4px;font-size:22px}
.muted{color:#71717a;font-size:14px;margin:0 0 16px}
label{display:block;font-size:14px;margin:12px 0 4px}
input,textarea{width:100%;padding:10px 12px;border:1px solid #e4e4e7;border-radius:8px;font:inherit}
input:focus,textarea:focus{outline:2px solid #6366f1;outline-offset:1px;border-color:#6366f1}
button{margin-top:16px;width:100%;background:#6366f1;color:white;border:0;padding:10px;border-radius:999px;font-weight:600;cursor:pointer}
button:hover{background:#5456e5}
#status{margin-top:12px;font-size:14px;color:#16a34a}`,
    js: `const form = document.getElementById("form");
const status = document.getElementById("status");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  if (!name || !email) {
    status.textContent = "Please fill required fields.";
    status.style.color = "#dc2626";
    console.warn("Validation failed");
    return;
  }
  status.textContent = \`Thanks, \${name}! We'll reply at \${email}.\`;
  status.style.color = "#16a34a";
  console.log("Form submitted", { name, email });
});`,
  },
  {
    id: "flexbox",
    name: "Flexbox Gallery",
    category: "Layouts",
    description: "Responsive flexbox image card gallery demo.",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Flexbox</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <h1>Flexbox Gallery</h1>
  <div class="gallery">
    <div class="card">🌈 Gradient</div>
    <div class="card">🧩 Components</div>
    <div class="card">⚡ Fast</div>
    <div class="card">🎨 Themeable</div>
    <div class="card">📱 Responsive</div>
    <div class="card">🔒 Private</div>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    css: `body{font-family:system-ui,sans-serif;background:#fafafa;padding:24px;color:#18181b}
h1{text-align:center;margin:0 0 20px}
.gallery{display:flex;flex-wrap:wrap;gap:16px;justify-content:center;max-width:900px;margin:0 auto}
.card{flex:1 1 160px;max-width:220px;height:120px;display:grid;place-items:center;background:white;border:1px solid #e4e4e7;border-radius:12px;font-weight:600;transition:transform .15s}
.card:hover{transform:translateY(-2px);border-color:#6366f1}`,
    js: `console.log("Flexbox gallery ready — resize to see wrapping");
document.querySelectorAll(".card").forEach((c) => {
  c.addEventListener("click", () => console.log("Clicked", c.textContent.trim()));
});`,
  },
  {
    id: "grid",
    name: "CSS Grid Dashboard",
    category: "Layouts",
    description: "Grid-based dashboard with sidebar, stats and panels.",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Grid Dashboard</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="layout">
    <aside>☰<br><strong>Menu</strong><p>Dashboard<br>Analytics<br>Settings</p></aside>
    <main>
      <div class="stats">
        <div class="stat"><span>Users</span><strong>1,248</strong></div>
        <div class="stat"><span>Revenue</span><strong>$8,420</strong></div>
        <div class="stat"><span>Sessions</span><strong>3,902</strong></div>
      </div>
      <div class="panels">
        <div class="panel">Chart placeholder</div>
        <div class="panel">Activity feed</div>
      </div>
    </main>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    css: `body{margin:0;font-family:system-ui,sans-serif;background:#f4f4f5;color:#18181b}
.layout{display:grid;grid-template-columns:200px 1fr;min-height:100vh}
aside{background:#18181b;color:white;padding:16px}
aside p{color:#a1a1aa;font-size:14px;line-height:1.8}
main{padding:24px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.stat{background:white;border:1px solid #e4e4e7;border-radius:12px;padding:16px}
.stat span{color:#71717a;font-size:12px}
.stat strong{display:block;font-size:22px;margin-top:4px}
.panels{margin-top:16px;display:grid;grid-template-columns:2fr 1fr;gap:12px}
.panel{background:white;border:1px solid #e4e4e7;border-radius:12px;padding:24px;min-height:160px}
@media(max-width:640px){.layout{grid-template-columns:1fr}.stats{grid-template-columns:1fr}.panels{grid-template-columns:1fr}}`,
    js: `console.log("Grid dashboard — try resizing to see responsive breakpoints");`,
  },
  {
    id: "counter",
    name: "Interactive Counter",
    category: "Components",
    description: "Counter with increment, decrement, reset and keyboard support.",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Counter</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="app">
    <h1 id="value">0</h1>
    <div class="row">
      <button id="dec">−</button>
      <button id="inc">+</button>
    </div>
    <button id="reset" class="ghost">Reset</button>
    <p class="hint">Use buttons, or press + / - keys</p>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    css: `body{font-family:system-ui,sans-serif;background:#fafafa;display:grid;place-items:center;min-height:100vh;margin:0}
.app{background:white;border:1px solid #e4e4e7;border-radius:16px;padding:32px;text-align:center;min-width:280px}
#value{font-size:48px;margin:0 0 16px}
.row{display:flex;gap:12px;justify-content:center}
button{padding:10px 18px;border-radius:999px;border:0;background:#6366f1;color:white;font-weight:600;cursor:pointer;font-size:18px}
button:hover{background:#5456e5}
.ghost{background:white;color:#18181b;border:1px solid #e4e4e7;margin-top:12px;font-size:14px}
.hint{color:#71717a;font-size:12px;margin-top:12px}`,
    js: `const valueEl = document.getElementById("value");
let count = 0;
function render(){ valueEl.textContent = count; console.log("Count", count); }
document.getElementById("inc").onclick = () => { count++; render(); };
document.getElementById("dec").onclick = () => { count--; render(); };
document.getElementById("reset").onclick = () => { count = 0; render(); };
document.addEventListener("keydown", (e) => {
  if (e.key === "+") { count++; render(); }
  if (e.key === "-") { count--; render(); }
});
render();`,
  },
  {
    id: "navbar",
    name: "Responsive Navbar",
    category: "Components",
    description: "Sticky nav with brand, links and hamburger for mobile.",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Navbar</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <nav class="nav">
    <strong>LadeCompile</strong>
    <button id="toggle" aria-label="Toggle menu">☰</button>
    <div id="links" class="links">
      <a href="#">Docs</a><a href="#">Blog</a><a href="#">Pricing</a>
    </div>
  </nav>
  <main><h1>Responsive Navbar</h1><p>Resize to see hamburger at < 640px.</p></main>
  <script src="script.js"></script>
</body>
</html>`,
    css: `body{margin:0;font-family:system-ui,sans-serif;background:#fafafa;color:#18181b}
.nav{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:white;border-bottom:1px solid #e4e4e7;position:sticky;top:0}
.links{display:flex;gap:16px}
.links a{color:#52525b;text-decoration:none;font-size:14px}
#toggle{display:none;background:white;border:1px solid #e4e4e7;border-radius:8px;padding:6px 10px;cursor:pointer}
main{padding:24px;max-width:720px;margin:0 auto}
@media(max-width:640px){#toggle{display:block}.links{display:none;position:absolute;top:52px;left:0;right:0;flex-direction:column;background:white;border-bottom:1px solid #e4e4e7;padding:12px 16px}.links.open{display:flex}}`,
    js: `const btn = document.getElementById("toggle");
const links = document.getElementById("links");
btn.addEventListener("click", () => {
  links.classList.toggle("open");
  console.log("Navbar toggled", links.classList.contains("open") ? "open" : "closed");
});`,
  },
  {
    id: "cards",
    name: "Card Grid",
    category: "Components",
    description: "Elegant card grid with image placeholder, title and actions.",
    html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cards</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <h1>Card Grid</h1>
  <div class="grid">
    <article class="card"><div class="thumb"></div><h2>Sunset Villa</h2><p>3 beds · 2 baths · Coastal view</p><button>View</button></article>
    <article class="card"><div class="thumb" style="background:#e0e7ff"></div><h2>Urban Loft</h2><p>2 beds · City skyline</p><button>View</button></article>
    <article class="card"><div class="thumb" style="background:#fce7f3"></div><h2>Cabin Retreat</h2><p>Forest · 1 bed · Quiet</p><button>View</button></article>
  </div>
  <script src="script.js"></script>
</body>
</html>`,
    css: `body{font-family:system-ui,sans-serif;background:#fafafa;color:#18181b;padding:24px}
h1{text-align:center;margin:0 0 16px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;max-width:900px;margin:0 auto}
.card{background:white;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden}
.thumb{height:120px;background:#f4f4f5}
.card h2{margin:12px 16px 4px;font-size:16px}
.card p{margin:0 16px;color:#71717a;font-size:13px}
.card button{margin:12px 16px 16px;background:#6366f1;color:white;border:0;padding:8px 12px;border-radius:999px;font-weight:600;cursor:pointer}
.card button:hover{background:#5456e5}`,
    js: `document.querySelectorAll(".card button").forEach((b) => {
  b.addEventListener("click", () => console.log("View clicked", b.parentElement.querySelector("h2").textContent));
});`,
  },
];

export function getTemplateById(id: string) {
  return TEMPLATES.find((t) => t.id === id);
}
