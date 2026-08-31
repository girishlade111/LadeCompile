/**
 * Combine three editor files into a single HTML document for sandboxed iframe `srcDoc`.
 * - CSS is inlined as <style> inside <head>
 * - JS is inlined as <script> before </body>
 * - Existing <link href="styles.css"> and <script src="script.js"> references are stripped
 *   and replaced with inlined content (no file server needed).
 * - Missing <head>/<body> are handled gracefully — malformed HTML still renders via browser parser.
 */
export function combineFiles(html: string, css: string, js: string): string {
  // Strip OneCompiler-style external references to avoid 404s in srcDoc
  let processedHtml = html
    // <link rel="stylesheet" href="styles.css"> variants
    .replace(/<link[^>]*href\s*=\s*["']\s*styles\.css\s*["'][^>]*>\s*/gi, "")
    // <script src="script.js"></script> variants
    .replace(/<script[^>]*src\s*=\s*["']\s*script\.js\s*["'][^>]*>\s*<\/script>\s*/gi, "");

  const styleTag = `<style>\n${css}\n</style>`;
  const scriptTag = `<script>\n${js}\n<\/script>`;

  // Inject CSS
  if (/<\/head>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<\/head>/i, `${styleTag}\n</head>`);
  } else if (/<head[^>]*>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<head[^>]*>/i, (m) => `${m}\n${styleTag}`);
  } else if (/<html[^>]*>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<html[^>]*>/i, (m) => `${m}\n<head>\n${styleTag}\n</head>`);
  } else {
    processedHtml = `${styleTag}\n${processedHtml}`;
  }

  // Inject JS — before </body> for correct DOM-ready semantics, fallback otherwise
  if (/<\/body>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<\/body>/i, `${scriptTag}\n</body>`);
  } else if (/<\/html>/i.test(processedHtml)) {
    processedHtml = processedHtml.replace(/<\/html>/i, `${scriptTag}\n</html>`);
  } else {
    processedHtml = `${processedHtml}\n${scriptTag}`;
  }

  return processedHtml;
}
