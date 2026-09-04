/* ERKAK shop · общая логика: каталог, корзина, валюта, доставка, Supabase */
'use strict';

// Название бренда — константа, не литерал (CLAUDE.md, п. 8).
const BRAND = 'ERKAK';

// ── Конфигурация ───────────────────────────────────────────────
const CONFIG = {
  supabaseUrl: 'https://lefeztravjsusefhjozd.supabase.co',
  supabaseKey: 'sb_publishable_At6FjlAkuZZkgECJi8TWgg_b9idFy43',
  usdRate: 12500,                 // сум за 1 USD, обновлять раз в неделю
  freeShippingUZS: 500000,        // бесплатная доставка по Узбекистану от
  subscriptionDiscount: 0.15,     // скидка на подписку
  telegram: 'https://t.me/erkak_bot',
  supportEmail: 'care@erkak.com',
  // Платёжные реквизиты. Пустые → заказ сохраняется, оплата по инструкции.
  pay: {
    paymeMerchant: '',            // ID мерчанта Payme
    clickService: '', clickMerchant: '',
    stripeLink: ''                // Stripe Payment Link для карт вне Узбекистана
  }
};

// ── Каталог ────────────────────────────────────────────────────
// Каждая позиция привязана к измеримому показателю (правило supplement-catalog.json).
const PRODUCTS = [
  { sku:'shilajit', name:'Shilajit', ru:'Мумиё очищенное', tag:'Флагман',
    sub:'Смола горного мумиё Тянь-Шаня, стандартизирована по фульвовым кислотам',
    form:'60 капсул × 500 мг', dose:'1 капсула утром, курс 60 дней', priceUZS:390000, priceUSD:32,
    metric:'ферритин, гемоглобин', origin:'Чимган, Тянь-Шань, Узбекистан',
    composition:'Мумиё очищенное 500 мг (фульвовые кислоты ≥ 60%). Оболочка: гипромеллоза. Без наполнителей.',
    who:'Мужчинам 45+, кто хочет проверить в анализах, а не на словах, влияние традиционного средства на показатели железа.',
    notes:'Не принимать при подагре и повышенном уровне мочевой кислоты. Не сочетать с препаратами железа без согласования с врачом.',
    img:'img/p-shilajit.webp', hero:true },
  { sku:'arginine', name:'Arginine', ru:'L-аргинин 1000 мг', tag:'',
    sub:'Свободная форма L-аргинина фармацевтической чистоты',
    form:'90 таблеток × 1000 мг', dose:'2 таблетки утром натощак или за 40 минут до нагрузки', priceUZS:290000, priceUSD:24,
    metric:'артериальное давление, липиды', origin:'Субстанция ЕС, капсулирование Узбекистан',
    composition:'L-аргинин 1000 мг. Вспомогательные: микрокристаллическая целлюлоза, стеарат магния.',
    who:'Тем, кто отслеживает давление и хочет добавить аргинин в протокол под контролем цифр.',
    notes:'Не принимать при герпетической инфекции в обострении и вместе с нитратами без согласования с врачом.',
    img:'img/p-arginine.webp' },
  { sku:'d3k2', name:'D3 + K2', ru:'Витамин D3 5000 МЕ + K2 100 мкг', tag:'Чаще всего первая',
    sub:'Холекальциферол с менахиноном-7 в масле МСТ',
    form:'90 капсул', dose:'1 капсула с едой, доза корректируется по анализу 25-OH D', priceUZS:240000, priceUSD:20,
    metric:'25-OH витамин D', origin:'Субстанция ЕС, капсулирование Узбекистан',
    composition:'Витамин D3 5000 МЕ (125 мкг), витамин K2 (MK-7) 100 мкг, масло МСТ. Капсула желатиновая.',
    who:'При подтверждённом анализом дефиците витамина D. Самая частая находка в первом анализе.',
    notes:'Не принимать при гиперкальциемии, саркоидозе, приёме варфарина без согласования с врачом.',
    img:'img/p-d3k2.webp' },
  { sku:'zinc', name:'Zinc + Se', ru:'Цинк пиколинат 25 мг + селен 100 мкг', tag:'',
    sub:'Хелатная форма цинка и селенметионин',
    form:'90 капсул', dose:'1 капсула после еды', priceUZS:220000, priceUSD:18,
    metric:'цинк сыворотки', origin:'Субстанция ЕС, капсулирование Узбекистан',
    composition:'Цинк (пиколинат) 25 мг, селен (селенметионин) 100 мкг. Оболочка: гипромеллоза.',
    who:'При подтверждённом дефиците цинка. Не принимать «для профилактики»: избыток цинка мешает усвоению меди.',
    notes:'Курс не дольше 90 дней без контрольного анализа.',
    img:'img/p-zinc.webp' },
  { sku:'magnesium', name:'Magnesium', ru:'Магния бисглицинат 400 мг', tag:'',
    sub:'Хелат магния с глицином, мягкий для желудка',
    form:'120 капсул', dose:'2 капсулы вечером', priceUZS:260000, priceUSD:22,
    metric:'сон (самоизмерение), давление', origin:'Субстанция ЕС, капсулирование Узбекистан',
    composition:'Магний (бисглицинат) 200 мг элементарного магния в 2 капсулах. Оболочка: гипромеллоза.',
    who:'Тем, кто отмечает в еженедельных самоизмерениях плохой сон и ночные судороги.',
    notes:'При почечной недостаточности только по согласованию с врачом.',
    img:'img/p-magnesium.webp' },
  { sku:'omega3', name:'Omega-3', ru:'Омега-3 ЭПК/ДГК 1000 мг', tag:'',
    sub:'Триглицеридная форма, IFOS-сертифицированное сырьё',
    form:'90 капсул', dose:'2 капсулы с едой', priceUZS:320000, priceUSD:26,
    metric:'триглицериды, ЛПНП', origin:'Сырьё Норвегия, капсулирование Узбекистан',
    composition:'Рыбий жир 1000 мг: ЭПК 500 мг, ДГК 250 мг. Витамин E как антиоксидант.',
    who:'При липидах вне целевых значений в протоколе «Метаболизм».',
    notes:'При приёме антикоагулянтов только по согласованию с врачом.',
    img:'img/p-omega3.webp' },
  { sku:'ashwagandha', name:'Ashwagandha', ru:'Ашваганда KSM-66 600 мг', tag:'',
    sub:'Стандартизированный корневой экстракт, витанолиды ≥ 5%',
    form:'60 капсул × 600 мг', dose:'1 капсула вечером, курс 60 дней', priceUZS:280000, priceUSD:23,
    metric:'сон и стресс (самоизмерение), кортизол утром', origin:'Экстракт Индия, капсулирование Узбекистан',
    composition:'Экстракт корня Withania somnifera KSM-66 600 мг. Оболочка: гипромеллоза.',
    who:'Тем, кто фиксирует в еженедельных отметках тревожность и плохой сон и хочет увидеть сдвиг в цифрах.',
    notes:'Не принимать при заболеваниях щитовидной железы и аутоиммунных состояниях без согласования с врачом.',
    img:'img/p-ashwagandha.webp' },
  { sku:'stack90', name:'Протокол 90 дней', ru:'Набор из четырёх позиций', tag:'Выгода 15%', bundle:['d3k2','zinc','magnesium','omega3'],
    sub:'D3+K2, Zinc+Se, Magnesium, Omega-3 на полный цикл до контрольного анализа',
    form:'4 банки, 90 дней', dose:'По протоколу после разбора анализов', priceUZS:890000, priceUSD:72, oldUZS:1040000, oldUSD:86,
    metric:'25-OH D, цинк, липиды, сон', origin:'Узбекистан',
    composition:'Витамин D3+K2 90 капс., Цинк+Se 90 капс., Магний 120 капс., Омега-3 90 капс.',
    who:'Тем, кто идёт по протоколу «Дефициты + Метаболизм» и хочет одной покупкой закрыть 90 дней.',
    notes:'Состав набора корректируется по результатам анализа: ненужные позиции заменяются.',
    img:'img/lineup.webp' },
];
const bySku = s => PRODUCTS.find(p => p.sku === s);

// ── Доставка ───────────────────────────────────────────────────
const ZONES = [
  { id:'uz',  name:'Узбекистан', countries:['Узбекистан'], uzs:25000, usd:2, days:'1–3 дня', carrier:'BTS / курьер', freeFrom:CONFIG.freeShippingUZS, cod:true },
  { id:'cis', name:'СНГ и Кавказ', countries:['Казахстан','Кыргызстан','Таджикистан','Азербайджан','Армения','Грузия','Беларусь','Молдова'], uzs:125000, usd:10, days:'5–10 дней', carrier:'EMS / CDEK' },
  { id:'eu',  name:'Европа, Турция, Израиль, ОАЭ', countries:['Германия','Польша','Чехия','Латвия','Литва','Эстония','Турция','Израиль','ОАЭ','Италия','Испания','Франция','Нидерланды','Австрия','Швейцария','Великобритания'], uzs:225000, usd:18, days:'7–14 дней', carrier:'DHL Express / EMS' },
  { id:'world', name:'США, Канада, Австралия и другие', countries:['США','Канада','Австралия','Южная Корея','Япония','Другая страна'], uzs:315000, usd:25, days:'10–18 дней', carrier:'DHL Express / EMS' },
];
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

// ── Supabase ───────────────────────────────────────────────────
let sb = null;
function supa(){ if (!sb && window.supabase) sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey); return sb; }

// ── Общая шапка/подвал ─────────────────────────────────────────
function shell(active){
  const nav = [['index.html','Главная'],['catalog.html','Каталог'],['delivery.html','Доставка по миру'],['index.html#quality','Качество'],['account.html','Кабинет']];
  document.querySelector('header.top .wrap').innerHTML = `
    <a class="logo" href="index.html"><i aria-hidden="true"></i><span>${BRAND}</span></a>
    <nav aria-label="Разделы">${nav.map(([h,t]) => `<a href="${h}" ${active === h ? 'aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    <div class="top-actions">
      <div class="cur" role="group" aria-label="Валюта"><button type="button" data-cur="UZS">сум</button><button type="button" data-cur="USD">USD</button></div>
      <a class="acc-btn" href="account.html">Кабинет</a>
      <a class="cart-btn" href="checkout.html">Корзина <span class="count"></span></a>
    </div>`;
  document.querySelector('footer .wrap').innerHTML = `
    <div style="display:grid;gap:var(--s4)">
      <a class="logo" href="index.html"><i aria-hidden="true"></i><span>${BRAND}</span></a>
      <p class="disclaimer">Биологически активные добавки не являются лекарственным средством. Сервис не ставит диагнозы, не назначает и не подбирает лекарственные препараты и не заменяет очную консультацию врача. Перед приёмом проконсультируйтесь со специалистом. Результат зависит от индивидуальных особенностей и подтверждается только контрольным анализом.</p>
      <span>© <span class="num">${new Date().getFullYear()}</span> ${BRAND}. Ташкент, Узбекистан. Производство на площадке с сертификатом GMP.</span>
    </div>
    <ul><li><b>Магазин</b></li><li><a href="catalog.html">Каталог</a></li><li><a href="product.html?sku=stack90">Протокол 90 дней</a></li><li><a href="delivery.html">Доставка и возврат</a></li><li><a href="checkout.html">Корзина</a></li></ul>
    <ul><li><b>Сервис</b></li><li><a href="account.html">Кабинет и заказы</a></li><li><a href="${CONFIG.telegram}" rel="noopener">Telegram</a></li><li><a href="mailto:${CONFIG.supportEmail}">${CONFIG.supportEmail}</a></li><li><a href="index.html#faq">Вопросы</a></li></ul>
    <ul><li><b>Документы</b></li><li><a href="offer.html">Публичная оферта</a></li><li><a href="privacy.html">Обработка данных</a></li><li><a href="index.html#quality">Сертификаты партий</a></li></ul>`;
  renderCurToggle(); renderCartCount();
  document.addEventListener('erkak:cart', renderCartCount);
}
