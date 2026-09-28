// ERKAK · языковой слой сборки: строки, склонения, деньги, длительности, месяцы.
import { typo } from './util.mjs';

const NICE = v => {
  const a = Math.abs(v);
  const step = a < 100 ? 1 : a < 1000 ? 10 : a < 10000 ? 100 : a < 100000 ? 1000 : a < 1000000 ? 5000 : 10000;
  return Math.round(v / step) * step;
};

export function makeI18n(L, SITE){
  const { code, locale } = L.meta;
  const pr = new Intl.PluralRules(locale);
  const fill = (s, v) => v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] ?? m)) : s;
  const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  const t = (key, vars) => {
    const v = get(L.ui, key);
    if (v == null) throw new Error(`[${code}] нет строки ui.${key}`);
    return typeof v === 'string' ? fill(v, vars) : v;
  };
  const plural = (n, forms) => {
    if (typeof forms === 'string') return forms;
    return forms[pr.select(n)] ?? forms.other ?? forms.many ?? Object.values(forms)[0];
  };
  const nf = new Intl.NumberFormat(locale);
  const num = n => nf.format(n);
  const moneyFmt = {};
  const money = (n, cur) => (moneyFmt[cur] ||= new Intl.NumberFormat(locale, { style:'currency', currency:cur, currencyDisplay:'narrowSymbol', maximumFractionDigits:0 })).format(n);
  const toUsd = (n, cur) => n / (SITE.rates[cur] || 1);
  const conv = (n, from, to) => NICE(toUsd(n, from) * (SITE.rates[to] || 1));
  const approx = (n, from, to) => '≈ ' + money(conv(n, from, to), to);

  const monthFmt = new Intl.DateTimeFormat(locale, { month:'short' });
  const monthLongFmt = new Intl.DateTimeFormat(locale, { month:'long' });
  const months = Array.from({ length:12 }, (_, i) => monthFmt.format(new Date(2026, i, 15)).replace(/\.$/, ''));
  const monthsLong = Array.from({ length:12 }, (_, i) => { const s = monthLongFmt.format(new Date(2026, i, 15)); return s.charAt(0).toLocaleUpperCase(locale) + s.slice(1); });

  // Длительность: «7d», «1-2d», «6-8w», «9-10h», «2d1n», «10lesson», «5visit», «6session», «2night»
  const unit = (u, n) => plural(n, L.units[u]);
  // «число + слово»; в арабском двойственное число читается без цифры: «يومان», не «2 يومان»
  const count = (n, forms) => typeof forms === 'object' && forms.two && pr.select(n) === 'two' ? plural(n, forms) : `${num(n)} ${plural(n, forms)}`;
  // Для диапазона «1–2» берём форму множественного числа, а не двойственного
  const rangeForm = (n, forms) => typeof forms === 'object' && forms.two && pr.select(n) === 'two' ? (forms.few || forms.other) : plural(n, forms);
  function dur(spec){
    const comp = /^(\d+)d(\d+)n$/.exec(spec);
    if (comp) return `${dur(comp[1] + 'd')} / ${dur(comp[2] + 'night')}`;
    const m = /^(\d+)(?:-(\d+))?([a-z]+)$/.exec(spec);
    if (!m) throw new Error(`Неверная длительность: ${spec}`);
    const [, a, b, u0] = m, u = u0 === 'n' ? 'night' : u0;
    if (!L.units[u]) throw new Error(`[${code}] нет единицы ${u}`);
    return b ? `${num(+a)}–${num(+b)} ${rangeForm(+b, L.units[u])}` : count(+a, L.units[u]);
  }
  // Дни для подбора: «2d1n» → 2, «6-8w» → 49, занятия/визиты/сессии → 0 (гибко)
  function days(spec){
    const comp = /^(\d+)d\d+n$/.exec(spec); if (comp) return +comp[1];
    const m = /^(\d+)(?:-(\d+))?([a-z]+)$/.exec(spec); const v = +(m[2] || m[1]);
    return { d:v, w:v * 7, h:1, n:v, night:v, lesson:0, visit:0, session:0 }[m[3]] ?? v;
  }
  // Группа: «≤6 angler», «4-6 guest», «1-3 angler»
  function group(spec){
    const m = /^(≤)?(\d+)(?:-(\d+))?\s+(\w+)$/.exec(spec);
    if (!m) throw new Error(`Неверная группа: ${spec}`);
    const [, upto, a, b, noun] = m, N = L.nouns[noun];
    if (!N) throw new Error(`[${code}] нет существительного ${noun}`);
    if (upto) return t('group.upto', { n:num(+a), noun:N.gen ?? plural(+a, N) });
    if (b) return t('group.range', { a:num(+a), b:num(+b), noun:rangeForm(+b, N) });
    return count(+a, N);
  }
  const monthsRange = list => {
    if (!list || !list.length || list.length >= 12) return t('allYear');
    // Сворачиваем в диапазоны с учётом перехода через год: [11,12,1,2,3,4] → «Ноя – Апр»
    const set = new Set(list), start = [...set].find(m => !set.has(m === 1 ? 12 : m - 1)) ?? list[0];
    const runs = []; let cur = null;
    for (let i = 0, m = start; i < 12; i++, m = m === 12 ? 1 : m + 1) {
      if (set.has(m)) { if (!cur) runs.push(cur = [m, m]); else cur[1] = m; } else cur = null;
    }
    return runs.map(([x, y]) => x === y ? months[x - 1] : `${months[x - 1]} – ${months[y - 1]}`).join(', ');
  };

  return {
    L, code, locale, dir:L.meta.dir || 'ltr', t, plural, count, num, money, conv, approx, months, monthsLong, monthsRange, dur, days, group,
    typo: s => typo(s, code),
    has: key => get(L.ui, key) != null
  };
}
