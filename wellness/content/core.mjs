// ERKAK · данные, не зависящие от языка: настройки, направления, программы, туры рыбалки, споты, места, гайды.
// Тексты на языках — в content/<lang>.mjs. Цены — черновик для согласования с партнёрами (см. README).

export const SITE = {
  origin: 'https://erkak.com',
  api: '/api/lead',
  // Контакты. Пустое поле скрывает кнопку. Telegram — имя без @ или номер с + (ссылка t.me/+номер), WhatsApp — международный формат без +.
  contacts: { telegram:'+998990505070', whatsapp:'998990505070', wechat:'', email:'', phone:'' },
  // Юрданные показываются только заполненными.
  legal: { operator:'', tat:'', insurance:'' },
  analytics: { metrika:'', ga4:'G-83Z5HYT9SB' },
  // Оплата: stripe:true показывает кнопку предоплаты картой на страницах туров (сервер должен иметь STRIPE_SECRET_KEY,
  // иначе кнопка честно сообщит, что оплата недоступна, и отправит обычную заявку). deposit — доля предоплаты.
  payments: { stripe:true, deposit:0.3 },
  verify: { yandex:'', google:'', bing:'' },
  // Единиц валюты за 1 USD. Ориентир для «≈» на сайте; итоговая цена — в подтверждении.
  rates: { USD:1, THB:33.4, RUB:84.3, EUR:0.87, GBP:0.74, AED:3.67, SAR:3.75, CNY:7.1, JPY:150, KRW:1400, KZT:510, UZS:12600, INR:88 },
  currencies: ['USD','THB','EUR','RUB','AED','SAR','CNY','JPY','KRW','UZS','KZT','GBP','INR'],
  founded: 2026,
  countries: 21,
  // Ключ IndexNow (Яндекс, Bing): build кладёт файл /<key>.txt, deploy.sh пингует после выкладки
  indexnow: 'e7k4a2r9k5w1m3n8p6q0',
  // Порядок языков в переключателе. Код совпадает с файлом content/<code>.mjs.
  langs: ['ru','en','de','ar','zh','ja','ko','th','uz'],
  defaultLang: 'en'
};

// ── Цели (id) и регионы (id) ─────────────────────────────────────────
export const GOALS = ['fit','skill','health','reset','adventure','team','family'];
export const REGIONS = ['th','asia','me','eu','cis','online'];

// ── Направления ──────────────────────────────────────────────────────
// art: fish-<вид> или глиф; tone: тон постера; status: live — продаём, soon — предзапись
export const DIRECTIONS = [
  { id:'fishing',    slug:'fishing',          art:'fish-sailfish', tone:'navy',     goals:['adventure','team','family'], status:'live' },
  { id:'muaythai',   slug:'muay-thai',        art:'glove',         tone:'oxblood',  goals:['fit','skill'] },
  { id:'camps',      slug:'sport-camps',      art:'kettle',        tone:'slate',    goals:['fit','skill'] },
  { id:'longevity',  slug:'checkup-longevity',art:'pulse',         tone:'plum',     goals:['health'] },
  { id:'detox',      slug:'detox',            art:'leaf',          tone:'forest',   goals:['fit','reset','health'] },
  { id:'recovery',   slug:'recovery',         art:'snow',          tone:'espresso', goals:['reset','health'] },
  { id:'mind',       slug:'mind',             art:'enso',          tone:'noir',     goals:['reset'] },
  { id:'adventure',  slug:'adventure',        art:'mountain',      tone:'bronze',   goals:['adventure','team'] },
  { id:'ocean',      slug:'ocean',            art:'wave',          tone:'navy',     goals:['skill','adventure'] },
  { id:'golf',       slug:'golf-padel',       art:'flag',          tone:'forest',   goals:['skill','team'] },
  { id:'aesthetics', slug:'mens-aesthetics',  art:'spark',         tone:'sand',     goals:['health'] },
  { id:'nutrition',  slug:'nutrition',        art:'capsule',       tone:'espresso', goals:['health','fit'] },
  { id:'family',     slug:'father-son',       art:'duo',           tone:'sand',     goals:['family'] },
  { id:'business',   slug:'corporate',        art:'case',          tone:'slate',    goals:['team'] }
].map(d => ({ status:'soon', ...d }));

// ── Места (страницы — где программ достаточно, page:true) ────────────
// air — аэропорт прилёта (IATA), tr — ориентир трансфера до места программы, минут
export const DESTINATIONS = [
  { id:'phuket',       slug:'phuket',        reg:'th', air:'HKT', tr:40,  page:true, art:'fish-sailfish', tone:'navy' },
  { id:'bangkok',      slug:'bangkok',       reg:'th', air:'BKK', tr:45,  page:true, art:'pulse',    tone:'plum' },
  { id:'samui',        slug:'koh-samui',     reg:'th', air:'USM', tr:20,  page:true, art:'leaf',     tone:'forest' },
  { id:'chiang-mai',   slug:'chiang-mai',    reg:'th', air:'CNX', tr:20,  page:true, art:'enso',     tone:'noir' },
  { id:'krabi',        slug:'krabi-khao-lak',reg:'th', air:'KBV', tr:40,  page:true, art:'mountain', tone:'forest' },
  { id:'gulf',         slug:'hua-hin-pattaya',reg:'th', air:'BKK', tr:150, page:true, art:'wave',     tone:'slate' },
  { id:'bali',         slug:'bali',          reg:'asia', air:'DPS', tr:45,page:true, art:'wave',     tone:'forest' },
  { id:'dubai',        slug:'dubai',         reg:'me', air:'DXB', tr:30,  page:true, art:'spark',    tone:'sand' },
  { id:'caucasus',     slug:'caucasus',      reg:'cis', air:'MRV', tr:180, page:true, art:'mountain', tone:'bronze' },
  { id:'central-asia', slug:'central-asia',  reg:'cis', air:'TAS', tr:60, page:true, art:'compass',  tone:'espresso' },
  { id:'russia',       slug:'altai-kamchatka',reg:'cis',page:true, art:'snow',     tone:'slate' },
  { id:'east-africa',  slug:'east-africa',   reg:'me', air:'JRO', tr:60,  page:true, art:'mountain', tone:'oxblood' },
  { id:'europe',       slug:'europe',        reg:'eu',  page:true, art:'flag',     tone:'forest' },
  { id:'east-asia',    slug:'japan-korea',   reg:'asia',page:true, art:'enso',     tone:'plum' },
  { id:'nepal',        slug:'nepal',         reg:'asia', air:'KTM', tr:30 },
  { id:'india',        slug:'india',         reg:'asia', air:'COK', tr:60 },
  { id:'jordan',       slug:'jordan',        reg:'me', air:'AMM', tr:60 },
  { id:'maldives',     slug:'maldives',      reg:'asia' },
  { id:'istanbul',     slug:'istanbul',      reg:'me', air:'IST', tr:50 },
  { id:'online',       slug:'online',        reg:'online' }
];

// ── Программы экосистемы ─────────────────────────────────────────────
// [id, slug, направление, место, длительность, от USD, лучшие месяцы (пусто = круглый год), хит, за что цена (person по умолчанию)]
// Цены «от» — по исследованию рынка сентября 2026 (см. ECOSYSTEM.md). Проверить до запуска.
// Себестоимость и маржа — во внутренней таблице, НЕ в этом репозитории: он публичный.
const ALL = [];
const M = (...m) => m;
const P = [
  // Муай тай и единоборства
  ['mt-phuket-week','phuket-camp-week','muaythai','phuket','7d',690,[],1],
  ['mt-month','phuket-four-week-transformation','muaythai','phuket','4w',2490,[],1],
  ['mt-bangkok','bangkok-stadium-week','muaythai','bangkok','5d',1190,M(11,12,1,2),0],
  ['mt-private','private-coach','muaythai','phuket','10lesson',450,[],0],
  ['mt-fight','first-fight-camp','muaythai','phuket','6-8w',3190,M(11,12,1,2,3,4),0],
  ['bjj-camp','bjj-camp-phuket','muaythai','phuket','7d',750,[],0],
  ['boxing-camp','boxing-camp-almaty','muaythai','central-asia','7d',1190,M(4,5,6,9,10),0],
  ['mma-camp','mma-camp-phuket','muaythai','phuket','14d',1390,[],0],
  ['mt-samui-lux','samui-private-villa','muaythai','samui','7d',3890,M(1,2,3,4,5,6,7,8),0],
  // Спортивные сборы
  ['hyrox-camp','hyrox-camp-phuket','camps','phuket','7d',1190,M(11,12,1,2,3),1],
  ['fatloss-camp','fat-loss-camp-phuket','camps','phuket','14d',1690,[],1],
  ['trail-camp','trail-running-chiang-mai','camps','chiang-mai','7d',1390,M(11,12,1),0],
  ['tri-camp','triathlon-camp-phuket','camps','phuket','10d',2390,M(11,12,1,2,3),0],
  ['marathon-camp','altitude-running-kenya','camps','east-africa','14d',2390,M(1,2,3,6,7,8,9,10),0],
  ['cycling-camp','cycling-camp-spain','camps','europe','7d',2590,M(2,3,4,5,9,10),0],
  ['strength-40','strength-camp-40-dubai','camps','dubai','5d',4290,M(11,12,1,2,3),1],
  ['altitude-camp','altitude-camp-caucasus','camps','caucasus','10d',1890,M(6,7,8,9),0],
  ['ski-camp','ski-camp-coach','camps','caucasus','7d',2590,M(12,1,2,3),0],
  // Чек-ап и долголетие
  ['checkup-bkk','executive-checkup-bangkok','longevity','bangkok','1-2d',850,[],1],
  ['mens-health','mens-health-bangkok','longevity','bangkok','1d',590,[],1],
  ['longevity-week','longevity-week','longevity','bangkok','7d',3400,[],1],
  ['heart-check','cardio-checkup-bangkok','longevity','bangkok','1d',750,[],0],
  ['sleep-lab','sleep-study-bangkok','longevity','bangkok','2night',650,[],0],
  ['dna-plan','dna-test-plan','longevity','online','4-10w',490,[],0],
  ['biohack-week','biohacking-dubai','longevity','dubai','5d',5890,M(11,12,1,2,3),0],
  ['seoul-checkup','checkup-seoul','longevity','east-asia','2d',3290,M(4,5,9,10,11),0],
  // Детокс и перезагрузка
  ['detox-samui','detox-retreat-samui','detox','samui','7d',2500,M(1,2,3,4,5,6,7,8,9),1],
  ['weight-reset','weight-reset-21-days','detox','phuket','21d',4090,[],1],
  ['sober-retreat','sober-retreat-bali','detox','bali','14d',3290,M(4,5,6,7,8,9,10),1],
  ['digital-detox','digital-detox-khao-sok','detox','krabi','4d',990,M(12,1,2,3,4),0],
  ['fasting','medical-fasting-europe','detox','europe','7d',6190,[],0],
  ['ayurveda','ayurveda-kerala','detox','india','14d',3190,M(6,7,8,9,11,12,1,2,3),0],
  ['burnout','burnout-retreat-chiang-mai','detox','chiang-mai','10d',3190,M(10,11,12,1),1],
  // Восстановление
  ['sauna-ice','sauna-ice-bath-phuket','recovery','phuket','5visit',290,[],1],
  ['thai-massage','thai-massage-chiang-mai','recovery','chiang-mai','5d',390,M(11,12,1,2),0],
  ['sports-recovery','sports-recovery-phuket','recovery','phuket','7d',890,[],0],
  ['spa-week','mens-spa-bali','recovery','bali','7d',2390,M(4,5,6,7,8,9,10),0],
  ['onsen','onsen-japan','recovery','east-asia','5d',2090,M(11,12,1,2,3,4),0],
  ['banya','russian-banya','recovery','russia','2d',590,M(10,11,12,1,2,3),0],
  ['dead-sea','dead-sea-jordan','recovery','jordan','7d',2490,M(10,11,12,1,2,3,4),0],
  // Ум и спокойствие
  ['silent-retreat','silent-retreat-chiang-mai','mind','chiang-mai','10d',290,M(11,12,1),0],
  ['breathwork','breathwork-cold-bali','mind','bali','5d',1750,M(4,5,6,7,8,9,10),0],
  ['mens-retreat','mens-retreat-altai','mind','russia','5d',1390,M(6,7,8,9),1],
  ['coaching','performance-coaching','mind','online','6session',1290,[],0],
  ['monk-week','monastery-stay-thailand','mind','chiang-mai','7d',590,M(11,12,1),0],
  ['psychologist','psychologist-for-men','mind','online','8session',690,[],0],
  ['meditation-21','meditation-21-days','mind','online','21d',149,[],0],
  // Приключения
  ['elbrus','elbrus-climb','adventure','caucasus','8d',1990,M(6,7,8,9),1],
  ['kilimanjaro','kilimanjaro-machame','adventure','east-africa','8d',3490,M(1,2,3,6,7,8,9,10),1],
  ['ebc','everest-base-camp-trek','adventure','nepal','14d',2490,M(3,4,5,10,11),1],
  ['kamchatka','kamchatka-volcanoes-fishing','adventure','russia','10d',4990,M(7,8,9),0],
  ['moto-north','motorbike-mae-hong-son','adventure','chiang-mai','7d',1690,M(11,12,1,2),0],
  ['safari','safari-kenya-tanzania','adventure','east-africa','8d',4390,M(1,2,7,8,9,10),0],
  ['railay-climb','rock-climbing-railay','adventure','krabi','3d',790,M(11,12,1,2,3,4),0],
  ['altai-horse','altai-horse-trek','adventure','russia','7d',1590,M(6,7,8,9),0],
  ['uzbek-mountains','uzbekistan-mountains','adventure','central-asia','6d',1190,M(6,7,8,9),0],
  // Океан
  ['padi-ow','padi-open-water-phuket','ocean','phuket','4d',990,M(11,12,1,2,3,4),1],
  ['similan-dive','similan-liveaboard','ocean','krabi','4d',1490,M(11,12,1,2,3,4),1],
  ['freediving','freediving-koh-tao','ocean','samui','4d',790,M(3,4,5,6,7,8,9),0],
  ['surf-camp','surf-camp-bali','ocean','bali','7d',990,M(4,5,6,7,8,9,10),1],
  ['kite','kitesurf-hua-hin','ocean','gulf','7d',1590,M(11,12,1,2,3,4),0],
  ['sailing','skipper-course-phuket','ocean','phuket','7d',2390,M(11,12,1,2,3,4),0],
  ['yacht-week','yacht-week-andaman','ocean','phuket','7d',3390,M(11,12,1,2,3,4),0],
  ['wakeboard','wakeboard-camp-pattaya','ocean','gulf','5d',990,M(11,12,1,2),0],
  ['maldives-surf','maldives-surf-charter','ocean','maldives','7d',3490,M(3,4,5,6,7,8,9,10),0],
  // Гольф и падел
  ['golf-phuket','golf-week-phuket','golf','phuket','7d',2190,M(11,12,1,2,3,4),1],
  ['golf-school','golf-school-hua-hin','golf','gulf','5d',2490,M(11,12,1,2,3,4),0],
  ['padel-camp','padel-camp-dubai','golf','dubai','5d',2290,M(11,12,1,2,3),1],
  ['tennis-camp','tennis-camp-mallorca','golf','europe','7d',2890,M(3,4,5,6,9,10,11),0],
  ['golf-scotland','golf-st-andrews','golf','europe','7d',6390,M(5,6,7,8,9),0],
  ['padel-bali','padel-wellness-bali','golf','bali','7d',1490,M(4,5,6,7,8,9,10),0],
  // Мужская эстетика
  ['hair','hair-transplant-istanbul','aesthetics','istanbul','3d',3600,M(10,11,12,1,2,3,4),1],
  ['dental','dental-implants-bangkok','aesthetics','bangkok','5-7d',2390,[],1,'implant'],
  ['lasik','lasik-bangkok','aesthetics','bangkok','5-7d',2690,[],0],
  ['skin-seoul','mens-skin-seoul','aesthetics','east-asia','5d',1590,M(10,11,12,1,2,3,4),0],
  ['style','style-dubai','aesthetics','dubai','2d',1290,M(11,12,1,2,3),0],
  // Питание и добавки
  ['nutritionist','nutritionist-labs','nutrition','online','4w',290,[],0],
  ['erkak-stack','erkak-protocol-90','nutrition','online','90d',72,[],0,'set'],
  ['chef-prep','private-chef-phuket','nutrition','phuket','7d',1890,[],0,'pair'],
  ['shilajit-tour','shilajit-chimgan','nutrition','central-asia','3d',790,M(5,6,7,8,9,10),0],
  // Отец и сын
  ['father-son-thai','father-son-phuket','family','phuket','5d',2490,M(11,12,1,2,3,4),1,'pair'],
  ['family-krabi','family-adventure-krabi','family','krabi','7d',1150,M(11,12,1,2,3,4),0],
  ['teen-camp','teen-sports-camp-phuket','family','phuket','14d',3490,M(12,1,3,4),0],
  ['father-son-nepal','father-son-nepal','family','nepal','10d',1490,M(3,4,5,10,11),0],
  // Для компаний и друзей
  ['corp-retreat','leadership-retreat-phuket','business','phuket','4d',2790,M(11,12,1,2,3,4),0],
  ['founders','founders-retreat-bali','business','bali','5d',2390,M(4,5,6,7,8,9,10),0],
  ['regatta','corporate-regatta-phuket','business','phuket','2d',890,M(11,12,1,2,3,4),0],
  ['bachelor','bachelor-party','business','phuket','3d',1290,[],1]
];
for (const [id, slug, dir, dest, dur, usd, months, hot, per] of P) ALL.push({ id, slug, dir, dest, dur, usd, months, hot:!!hot, per:per || 'person' });
export const PROGRAMS = ALL;

// ── Туры рыбалки (продаются сейчас) ─────────────────────────────────
// price — THB «от»; per: boat | person | group
export const TOURS = [
  { id:'first-strike',       cat:'sea',   tier:1, fish:'barracuda', tone:'navy',     hot:true,  price:4900,   per:'person', dur:'8h',     group:'≤6 angler', months:[1,2,3,4,10,11,12], spot:'racha-yai', dest:'phuket' },
  { id:'family-half',        cat:'sea',   tier:2, fish:'mahi',      tone:'espresso',            price:26000,  per:'boat',   dur:'5h',     group:'≤6 guest',  months:[1,2,3,4,10,11,12], spot:'racha-yai', dest:'phuket' },
  { id:'pro-gt',             cat:'sea',   tier:3, fish:'gt',        tone:'oxblood',  hot:true,  price:45000,  per:'boat',   dur:'9-10h',  group:'≤4 angler', months:[1,3,4,5,6,7,8,9,10,11,12], spot:'racha-noi', dest:'phuket' },
  { id:'bigame-day',         cat:'sea',   tier:4, fish:'sailfish',  tone:'navy',     lux:true,  price:96000,  per:'boat',   dur:'10h',    group:'≤6 guest',  months:[10,11,12,1,2,3,4], spot:'shelf', dest:'phuket' },
  { id:'overnight-shelf',    cat:'sea',   tier:4, fish:'marlin',    tone:'plum',     lux:true,  price:180000, per:'boat',   dur:'2d1n',   group:'≤6 guest',  months:[11,12,1,2,3,4], spot:'shelf', dest:'phuket' },
  { id:'expedition-khaolak', cat:'sea',   tier:5, fish:'tuna',      tone:'bronze',   lux:true,  price:96000,  per:'person', dur:'4d3n',   group:'4-6 angler',months:[11,12,1,2,3,4], spot:'khaolak-fad', dest:'krabi' },
  { id:'gulf-private',       cat:'sea',   tier:3, fish:'barracuda', tone:'slate',               price:32000,  per:'boat',   dur:'6-8h',   group:'≤6 guest',  months:[10,11,12,1,2,3,4,5], spot:null, dest:'gulf' },
  { id:'bangkok-monsters',   cat:'fresh', tier:2, fish:'catfish',   tone:'forest',              price:11900,  per:'person', dur:'12h',    group:'1-4 angler',months:[], spot:'bungsamran', dest:'bangkok' },
  { id:'stingray',           cat:'fresh', tier:3, fish:'ray',       tone:'plum',                price:21000,  per:'person', dur:'10-12h', group:'1-3 angler',months:[], spot:'maeklong', dest:'bangkok' },
  { id:'khaosok-jungle',     cat:'fresh', tier:3, fish:'snakehead', tone:'forest',              price:27000,  per:'person', dur:'2d1n',   group:'2-6 guest', months:[12,1,2,3,4,5], spot:'khaosok', dest:'krabi' },
  { id:'tournament',         cat:'group', tier:5, fish:'sailfish',  tone:'bronze',   lux:true,  price:470000, per:'group',  dur:'2d',     group:'8-30 guest',months:[11,12,1,2,3,4], spot:'racha-noi', dest:'phuket' },
  { id:'signature-week',     cat:'vip',   tier:5, fish:'marlin',    tone:'bronze',   lux:true,  price:1090000, per:'group',  dur:'7d',     group:'2-4 angler',months:[11,12,1,2,3,4], spot:'shelf', dest:'phuket' }
];

// ── Споты карты (координаты ориентировочные). ok:false — рыбалка запрещена ──
export const SPOTS = [
  { id:'racha-yai',   reg:'andaman', lat:7.60, lon:98.37, ok:true },
  { id:'racha-noi',   reg:'andaman', lat:7.49, lon:98.32, ok:true },
  { id:'shelf',       reg:'andaman', lat:7.40, lon:97.95, ok:true },
  { id:'khaolak-fad', reg:'andaman', lat:8.62, lon:98.08, ok:true },
  { id:'phangnga',    reg:'andaman', lat:8.10, lon:98.52, ok:true },
  { id:'similan',     reg:'andaman', lat:8.65, lon:97.64, ok:false },
  { id:'surin',       reg:'andaman', lat:9.40, lon:97.90, ok:false },
  { id:'phiphi',      reg:'andaman', lat:7.74, lon:98.77, ok:false },
  { id:'shark',       reg:'andaman', lat:7.81, lon:98.51, ok:false, la:'t' },
  { id:'lanta',       reg:'andaman', lat:7.20, lon:98.90, ok:false, la:'l' },
  { id:'khaosok',     reg:'khaosok', lat:8.96, lon:98.78, ok:true,  la:'l' },
  { id:'pattaya',     reg:'gulf',    lat:12.93, lon:100.78, ok:true },
  { id:'samui-south', reg:'gulf',    lat:9.40, lon:99.95, ok:true },
  { id:'angthong',    reg:'gulf',    lat:9.63, lon:99.67, ok:false },
  { id:'bungsamran',  reg:'bangkok', lat:13.84, lon:100.70, ok:true },
  { id:'maeklong',    reg:'bangkok', lat:13.41, lon:99.99, ok:true }
];
// Районы на общей карте Таиланда (страница /fishing/map/). tour — ближайший тур для кнопки
export const FISH_REGIONS = [
  { id:'andaman', lat:8.0,  lon:98.25, tour:'first-strike' },
  { id:'gulf',    lat:11.2, lon:100.3, tour:'gulf-private' },
  { id:'bangkok', lat:13.75, lon:100.5, tour:'bangkok-monsters' },
  { id:'khaosok', lat:8.95, lon:98.8,  tour:'khaosok-jungle' }
];

// ── Календарь клёва: 0 нет · 1 бывает · 2 хорошо · 3 пик (янв…дек) ──
export const SEASON = [
  ['sailfish', [3,3,3,2,2,2,2,2,2,2,2,3]],
  ['marlin',   [2,2,2,2,0,0,0,0,0,1,2,2]],
  ['gt',       [1,1,2,2,2,3,3,2,2,2,2,1]],
  ['yellowfin',[1,1,2,3,3,1,1,1,1,1,1,1]],
  ['wahoo',    [2,1,1,2,2,2,2,2,2,3,3,3]],
  ['mackerel', [3,2,2,2,1,0,0,0,0,2,3,3]],
  ['reef',     [3,3,3,3,2,2,2,2,2,2,3,3]],
  ['fresh',    [3,3,3,3,3,3,3,3,3,3,3,3]]
];
export const SEA_STATE = [3,3,3,3,1,1,1,1,1,2,3,3];

// ── Гайды (тексты — в языковых файлах) ──────────────────────────────
export const GUIDES = [
  { id:'muay-thai-phuket',  slug:'muay-thai-camps-phuket',            dir:'muaythai',  art:'glove',         tone:'oxblood', updated:'2026-09-28', related:['mt-phuket-week','mt-month','mt-private','mt-fight'] },
  { id:'checkup-bangkok',   slug:'bangkok-health-checkup-cost',       dir:'longevity', art:'pulse',         tone:'plum',    updated:'2026-09-28', related:['checkup-bkk','mens-health','heart-check','longevity-week'] },
  { id:'fishing-legal',     slug:'phuket-fishing-legal-spots-seasons',dir:'fishing',   art:'fish-sailfish', tone:'navy',    updated:'2026-09-28', related:['pro-gt','bigame-day','first-strike','family-half'] },
  { id:'thailand-visa',     slug:'thailand-visa-2026-dtv-muay-thai',  dir:null,        art:'compass',       tone:'bronze',  updated:'2026-09-28', related:['mt-month','mt-fight','weight-reset'] },
  { id:'thailand-by-month', slug:'thailand-for-men-by-month',         dir:null,        art:'globe',         tone:'espresso',updated:'2026-09-28', related:['bigame-day','golf-phuket','detox-samui','padi-ow'] },
  { id:'fat-loss-camp',     slug:'fat-loss-camp-thailand-men',        dir:'camps',     art:'kettle',        tone:'slate',   updated:'2026-09-28', related:['fatloss-camp','weight-reset','hyrox-camp','mt-month'] },
  { id:'mens-retreats',     slug:'mens-retreats-detox-sober-burnout', dir:'detox',     art:'leaf',          tone:'forest',  updated:'2026-09-28', related:['burnout','sober-retreat','detox-samui','mens-retreat'] },
  { id:'hair-istanbul',     slug:'hair-transplant-istanbul-cost',     dir:'aesthetics',art:'spark',         tone:'sand',    updated:'2026-09-28', related:['hair','dental','lasik'] },
  { id:'peaks',             slug:'elbrus-kilimanjaro-everest-base-camp',dir:'adventure',art:'mountain',     tone:'bronze',  updated:'2026-09-28', related:['elbrus','kilimanjaro','ebc'] }
];

// ── Готовые маршруты на главной ─────────────────────────────────────
export const COMBOS = [
  { id:'reset40',  items:['checkup-bkk','detox-samui','bigame-day'] },
  { id:'fighter',  items:['mt-month','sauna-ice','mens-health'] },
  { id:'fatherson',items:['father-son-thai','padi-ow','family-half'] }
];

// ── ERKAK Private: личный консьерж на Пхукете ───────────────────────
// Плата за консьержа «от», THB, за поездку. Виллы, яхты и услуги партнёров — отдельно, одним счётом.
// Черновик: утвердить с владельцем (см. внутреннюю таблицу экономики).
export const PRIVATE = { cur:'THB', tiers:[ { id:'weekend', price:29000 }, { id:'week', price:59000, feat:true }, { id:'season', price:189000 } ] };
