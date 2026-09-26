// ERKAK · визуальная проверка страниц. Запуск из корня репозитория:
//   python3 -m http.server 8811 &   (один раз)
//   node .claude/skills/erkak-design/scripts/qa.js [страница ...] [--out каталог]
// Для каждой страницы: ошибки JS, горизонтальный скролл на 360/390/768/1024/1440,
// полноэкранные скриншоты desktop (1440) и mobile (390) с прокруткой (срабатывает появление блоков).
const { execSync, execFileSync } = require('child_process');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const out = outIdx >= 0 ? args.splice(outIdx, 2)[1] : '.';
const pages = args.length ? args : ['index.html', 'catalog.html', 'product.html?sku=shilajit', 'checkout.html', 'account.html', 'delivery.html'];
const BASE = process.env.QA_BASE || 'http://localhost:8811/';

// Шрифты Google берём через curl: браузер в песочнице может не ходить через прокси.
const cache = {};
const fetchFont = u => cache[u] ||= execFileSync('curl', ['-sS', '-A', 'Mozilla/5.0 Chrome/140', u], { maxBuffer: 1 << 26 });
const withFonts = p => p.route(/fonts\.(googleapis|gstatic)\.com/, r => {
  const u = r.request().url();
  try { r.fulfill({ status: 200, body: fetchFont(u), contentType: /css/.test(u) ? 'text/css' : 'font/woff2', headers: { 'access-control-allow-origin': '*' } }); }
  catch { r.abort(); }
});

(async () => {
  const b = await chromium.launch();
  let problems = 0;
  for (const pg of pages) {
    const slug = pg.replace(/\.html.*$/, '').replace(/\W+/g, '-');
    for (const w of [360, 390, 768, 1024, 1440]) {
      const p = await b.newPage({ viewport: { width: w, height: 900 } });
      const errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await withFonts(p);
      await p.goto(BASE + pg, { waitUntil: 'networkidle' });
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      if (sw > w) { problems++; console.log(`✗ ${pg} @${w}: горизонтальный скролл ${sw}px`); }
      if (errs.length) { problems++; console.log(`✗ ${pg} @${w}: ошибки JS`, errs); }
      if (w === 390 || w === 1440) {
        const H = await p.evaluate(() => document.body.scrollHeight);
        for (let y = 0; y < H; y += 500) { await p.mouse.wheel(0, 500); await p.waitForTimeout(80); }
        await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1200);
        await p.screenshot({ path: `${out}/${slug}-${w === 390 ? 'mob' : 'desk'}.png`, fullPage: true });
      }
      await p.close();
    }
    console.log(`✓ ${pg}`);
  }
  await b.close();
  console.log(problems ? `Проблем: ${problems}` : 'Всё чисто');
  process.exit(problems ? 1 : 0);
})();
