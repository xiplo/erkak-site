/* ERKAK shop · общая логика: каталог, корзина, валюта, доставка, API на VPS */
'use strict';

// Название бренда — константа, не литерал (CLAUDE.md, п. 8).
const BRAND = 'ERKAK';

// ── Конфигурация ───────────────────────────────────────────────
const CONFIG = {
  api: '/api',
  usdRate: CATALOG.usdRate, freeShippingUZS: CATALOG.freeShippingUZS, subscriptionDiscount: CATALOG.subscriptionDiscount,
  telegram: 'https://t.me/erkak_bot',
  supportEmail: 'care@erkak.com',
};

// ── Каталог (assets/catalog.js) ───────────────────────────────
const PRODUCTS = CATALOG.products;
const bySku = s => PRODUCTS.find(p => p.sku === s);
const ZONES = CATALOG.zones;
const zoneFor = country => ZONES.find(z => z.countries.includes(country)) || ZONES[3];

// ── Валюта ─────────────────────────────────────────────────────
const cur = { get(){ try{ return localStorage.getItem('erkak.cur') || 'UZS'; }catch{ return 'UZS'; } }, set(v){ try{ localStorage.setItem('erkak.cur', v); }catch{} } };
function money(uzs, usd){
  if (cur.get() === 'USD') { const v = usd ?? Math.round(uzs / CONFIG.usdRate); return '$' + v.toLocaleString('en-US'); }
  return uzs.toLocaleString('ru-RU').replace(/ /g, ' ') + ' сум';
}
function renderCurToggle(){
  document.querySelectorAll('.cur button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.cur === cur.get()));
    b.onclick = () => { cur.set(b.dataset.cur); document.dispatchEvent(new Event('erkak:cur')); renderCurToggle(); };
  });
}

// ── Корзина ────────────────────────────────────────────────────
const cart = {
  read(){ try{ return JSON.parse(localStorage.getItem('erkak.cart') || '[]'); }catch{ return []; } },
  write(items){ try{ localStorage.setItem('erkak.cart', JSON.stringify(items)); }catch{} document.dispatchEvent(new Event('erkak:cart')); },
  add(sku, qty = 1, sub = false){
    const items = this.read(); const key = sku + (sub ? ':sub' : '');
    const line = items.find(i => i.key === key);
    if (line) line.qty += qty; else items.push({ key, sku, qty, sub });
    this.write(items); toast(sub ? 'Добавлено с подпиской' : 'Добавлено в корзину');
  },
  setQty(key, qty){ let items = this.read(); items = items.map(i => i.key === key ? { ...i, qty } : i).filter(i => i.qty > 0); this.write(items); },
  clear(){ this.write([]); },
  count(){ return this.read().reduce((a, i) => a + i.qty, 0); },
  lines(){ return this.read().map(i => { const p = bySku(i.sku); const k = i.sub ? 1 - CONFIG.subscriptionDiscount : 1;
    return { ...i, p, uzs: Math.round(p.priceUZS * k / 1000) * 1000, usd: Math.round(p.priceUSD * k) }; }); },
  subtotal(){ return this.lines().reduce((a, l) => ({ uzs: a.uzs + l.uzs * l.qty, usd: a.usd + l.usd * l.qty }), { uzs:0, usd:0 }); },
};
function renderCartCount(){ document.querySelectorAll('.cart-btn .count').forEach(el => el.textContent = cart.count() || ''); }

// ── Карточка товара ────────────────────────────────────────────
function productCard(p){
  const old = p.oldUZS ? `<s>${money(p.oldUZS, p.oldUSD)}</s>` : '';
  return `<article class="card">
    <div class="pic"><img src="${p.img}" alt="${BRAND} ${p.name}, ${p.ru}" loading="lazy" width="1000" height="1333">
      ${p.tag ? `<span class="badge ${p.bundle ? 'amber' : ''}">${p.tag}</span>` : ''}<a href="product.html?sku=${p.sku}" aria-label="${p.name}"></a></div>
    <div class="body">
      <h3><a href="product.html?sku=${p.sku}">${BRAND} ${p.name}</a></h3>
      <p class="sub">${p.ru}. ${p.form}</p>
      <span class="metric">Показатель: ${p.metric}</span>
      <div class="row"><span class="price">${old}${money(p.priceUZS, p.priceUSD)}</span><button class="add" data-add="${p.sku}">В корзину</button></div>
    </div></article>`;
}
function bindAddButtons(root = document){
  root.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { cart.add(b.dataset.add, 1, b.dataset.sub === '1'); b.classList.add('added'); b.textContent = 'В корзине'; setTimeout(() => { b.classList.remove('added'); b.textContent = 'В корзину'; }, 1600); });
}

// ── Тост ───────────────────────────────────────────────────────
let toastTimer;
function toast(msg){ let t = document.querySelector('.toast'); if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800); }

// ── API ────────────────────────────────────────────────────────
const session = { get(){ try{ return localStorage.getItem('erkak.session') || ''; }catch{ return ''; } }, set(v){ try{ v ? localStorage.setItem('erkak.session', v) : localStorage.removeItem('erkak.session'); }catch{} } };
async function api(path, body, method){
  const res = await fetch(CONFIG.api + path, { method: method || (body ? 'POST' : 'GET'), headers: { 'content-type':'application/json', ...(session.get() ? { authorization:'Bearer ' + session.get() } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

// ── Общая шапка/подвал ─────────────────────────────────────────
const ICONS = {
  cart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6h15l-1.5 8.5H7.5L6 6z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
  globe:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  undo:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h11a5 5 0 010 10H9"/><path d="M8 6l-4 4 4 4"/></svg>',
};
const LOGO = (tag = true) => `<a class="logo" href="index.html" aria-label="${BRAND}"><img class="mark" src="img/logo.svg" alt="" width="40" height="40"><span><span class="word">${BRAND}</span>${tag ? '<span class="tag">Показатели под контролем</span>' : ''}</span></a>`;

function shell(active){
  const nav = [['index.html','Главная'],['catalog.html','Каталог'],['product.html?sku=stack90','Протокол 90 дней'],['delivery.html','Доставка по миру'],['index.html#quality','Качество']];
  const head = document.querySelector('head');
  if (!head.querySelector('link[rel="icon"]')) head.insertAdjacentHTML('beforeend', '<link rel="icon" type="image/svg+xml" href="favicon.svg">');
  const header = document.querySelector('header.top');
  if (!document.querySelector('.topbar')) header.insertAdjacentHTML('beforebegin', `<div class="topbar"><div class="wrap">
    <span class="long">Бесплатная доставка по Узбекистану от <b class="num">500 000 сум</b> · по миру от <b>$10</b> · нейтральная упаковка</span><span class="short">Доставка по миру из Узбекистана · нейтральная упаковка</span>
    <span class="links"><a href="delivery.html">Доставка и возврат</a><a href="${CONFIG.telegram}" rel="noopener">Telegram</a><a href="mailto:${CONFIG.supportEmail}">${CONFIG.supportEmail}</a></span></div></div>`);
  document.querySelectorAll('.topbar').forEach((t, i) => { if (i > 0) t.remove(); });
  header.querySelector('.wrap').innerHTML = `
    ${LOGO()}
    <nav aria-label="Разделы">${nav.map(([h,t]) => `<a href="${h}" ${active === h.split('?')[0] && !h.includes('#') && !h.includes('?') ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    <div class="top-actions">
      <div class="cur" role="group" aria-label="Валюта"><button type="button" data-cur="UZS">сум</button><button type="button" data-cur="USD">USD</button></div>
      <a class="icon-btn" href="account.html" aria-label="Кабинет">${ICONS.user}<span class="lbl">Кабинет</span></a>
      <a class="icon-btn cart cart-btn" href="checkout.html" aria-label="Корзина">${ICONS.cart}<span class="lbl">Корзина</span><span class="count"></span></a>
      <button class="icon-btn burger" type="button" aria-label="Меню" aria-expanded="false">${ICONS.menu}</button>
    </div>`;
  header.insertAdjacentHTML('beforeend', `<div class="mobile-nav" id="mnav"><div class="wrap">${nav.map(([h,t]) => `<a href="${h}" ${active === h ? 'aria-current="page"' : ''}>${t}</a>`).join('')}<a href="account.html">Кабинет</a><a href="checkout.html">Корзина</a><div class="cur" role="group" aria-label="Валюта"><button type="button" data-cur="UZS">сум</button><button type="button" data-cur="USD">USD</button></div></div></div>`);
  const burger = header.querySelector('.burger'), mnav = header.querySelector('#mnav');
  burger.onclick = () => { const open = mnav.classList.toggle('open'); burger.setAttribute('aria-expanded', String(open)); burger.innerHTML = open ? ICONS.close : ICONS.menu; };
  addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 8), { passive:true });
  document.querySelector('footer .wrap').innerHTML = `
    <div style="display:grid;gap:var(--s5)">
      ${LOGO()}
      <p class="disclaimer">Биологически активные добавки не являются лекарственным средством. Сервис не ставит диагнозы, не назначает и не подбирает лекарственные препараты и не заменяет очную консультацию врача. Перед приёмом проконсультируйтесь со специалистом. Результат подтверждается только контрольным анализом.</p>
      <span class="copy-line">© <span class="num">${new Date().getFullYear()}</span> ${BRAND} · Ташкент, Узбекистан · производство на площадке с сертификатом GMP</span>
    </div>
    <ul><li><b>Магазин</b></li><li><a href="catalog.html">Каталог</a></li><li><a href="product.html?sku=stack90">Протокол 90 дней</a></li><li><a href="product.html?sku=shilajit">Shilajit</a></li><li><a href="checkout.html">Корзина</a></li></ul>
    <ul><li><b>Сервис</b></li><li><a href="account.html">Кабинет и заказы</a></li><li><a href="delivery.html">Доставка и возврат</a></li><li><a href="${CONFIG.telegram}" rel="noopener">Telegram</a></li><li><a href="mailto:${CONFIG.supportEmail}">${CONFIG.supportEmail}</a></li></ul>
    <ul><li><b>Документы</b></li><li><a href="offer.html">Публичная оферта</a></li><li><a href="privacy.html">Обработка данных</a></li><li><a href="index.html#quality">Сертификаты партий</a></li><li><a href="https://erkak.com/#test">Опросник и анализы</a></li></ul>`;
  renderCurToggle(); renderCartCount();
  document.addEventListener('erkak:cart', renderCartCount);
}
