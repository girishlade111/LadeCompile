async function main() {
  const url = 'https://ladecompile-editor.coderlade.workers.dev/zh/editor';
  const res = await fetch(url);
  console.log(`Status: ${res.status}`);
  console.log('Headers:');
  console.log('  x-ladecompile-locale:', res.headers.get('x-ladecompile-locale'));
  console.log('  x-opennext:', res.headers.get('x-opennext'));
  console.log('  content-type:', res.headers.get('content-type'));

  const html = await res.text();
  console.log('\n--- lang tags ---');
  console.log(html.match(/lang="[^"]*"/g));

  console.log('\n--- hreflang tags ---');
  console.log(html.match(/hreflang="[^"]*"/g));

  console.log('\n--- _next/static asset paths ---');
  const staticMatches = html.match(/\/editor\/_next\/static[^"'\s]+/g) || html.match(/\/_next\/static[^"'\s]+/g) || [];
  console.log(staticMatches.slice(0, 5));

  // Test other locales
  for (const locale of ['ja', 'ko', 'pt-br', 'ru', 'tr', 'en']) {
    const locRes = await fetch(`https://ladecompile-editor.coderlade.workers.dev/${locale}/editor`);
    console.log(`\nLocale /${locale}/editor status:`, locRes.status, 'x-ladecompile-locale:', locRes.headers.get('x-ladecompile-locale'));
  }

  // Test default /editor
  const defRes = await fetch('https://ladecompile-editor.coderlade.workers.dev/editor');
  console.log(`\n/editor status:`, defRes.status, 'x-ladecompile-locale:', defRes.headers.get('x-ladecompile-locale'));
}

main().catch(console.error);
