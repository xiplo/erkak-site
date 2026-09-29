// ERKAK · oʻzbekcha · interfeys, birliklar, brauzer satrlari, maqsadlar, mintaqalar.
export const meta = {
  code:'uz', name:'Oʻzbekcha', locale:'uz-Latn-UZ', htmlLang:'uz', hreflang:'uz', ogLocale:'uz_UZ', dir:'ltr',
  currency:'UZS', messengers:['telegram', 'whatsapp'],
  preload:['golos-text-latin-normal-400']
};

export const units = {
  h:{ one:'soat', other:'soat' },
  d:{ one:'kun', other:'kun' },
  w:{ one:'hafta', other:'hafta' },
  night:{ one:'tun', other:'tun' },
  lesson:{ one:'mashgʻulot', other:'mashgʻulot' },
  visit:{ one:'tashrif', other:'tashrif' },
  session:{ one:'seans', other:'seans' }
};
export const nouns = {
  angler:{ one:'baliqchi', other:'baliqchi' },
  guest:{ one:'mehmon', other:'mehmon' },
  program:{ one:'dastur', other:'dastur' }
};

export const ui = {
  pay:{ cta:'Karta bilan {p}% oldindan toʻlash', note:'Stripe orqali xavfsiz toʻlov. Qolgan qismi chiqish kuni toʻlanadi.', doneTitle:'Oldindan toʻlov qabul qilindi', doneText:'Rahmat! Ish vaqtida konsyerj 15 daqiqa ichida sanani tasdiqlaydi va tafsilotlarni yuboradi.', doneBack:'Baliq oviga qaytish' },
  time:{ min:'{n} daq', h:'{n} soat' },
  from:'kamida', allYear:'Yil boʻyi', notFound:'Sahifa topilmadi',
  suggest:['Sayt oʻzbek tilida ham bor', 'Oʻtish'],
  brand:{ tag:'Erkaklar velnesi · butun dunyo boʻylab' },
  a11y:{ skip:'Asosiy mazmunga oʻtish', nav:'Boʻlimlar', crumbs:'Navigatsiya yoʻli', langCur:'Til va valyuta', lang:'Til', cur:'Valyuta', menu:'Menyu', close:'Yopish' },
  nav:{ home:'Bosh sahifa', dirs:'Yoʻnalishlar', top:'100 dastur', fishing:'Baliq ovi', places:'Manzillar', guides:'Qoʻllanmalar', club:'Klub', about:'Biz haqimizda', visa:'Viza boʻyicha yordam', terms:'Shartlar', privacy:'Maxfiylik', all:'Butun ekotizim' },
  cta:{ pick:'Dastur tanlash', pickTour:'Tur tanlash', ask:'Konsyerj bilan gaplashish' },
  tag:{ hot:'Eng koʻp soʻralgan', live:'Bron ochiq', soon:'Oldindan yozilish', lux:'Premium' },
  per:{ boat:'qayiq uchun', person:'kishi boshiga', group:'dastur uchun', pair:'ikki kishi uchun', implant:'implant uchun', set:'toʻplam uchun' },
  group:{ upto:'{n} {noun}gacha', range:'{a}–{b} {noun}' },
  plan:{ add:'Sayohatga qoʻshish', title:'Mening sayohatim', kicker:'Sayohat', empty:'Dasturlarni «Sayohatga qoʻshish» tugmasi bilan qoʻshing — ularni umumiy hisob bilan bitta safarga jamlaymiz.', total:'Taxminiy narx', send:'Konsyerjga yuborish' },
  dir:{ open:'Batafsil', kickerLive:'Yoʻnalish · bron ochiq', kickerSoon:'Yoʻnalish · oldindan yozilish', programs:'Dasturlar', from:'Boshlangʻich narx', where:'Qayerda', status:'Holat', see:'{n} ta dasturni koʻrish',
    listKicker:'Dasturlar', listTitle:'*Formatni* tanlang', inclKicker:'ERKAK standarti', inclTitle:'Nimalar *har doim* kiradi', inclLede:'Aniq tarkibni sanalaringizga moslangan taklifda belgilaymiz. Parvoz narxga kirmaydi — mos reysni topishga yordam beramiz.',
    placesKicker:'Geografiya', placesTitle:'*Dasturlar* qayerda oʻtadi', guidesTitle:'*Safardan oldin* oʻqing', othersKicker:'Ekotizim', othersTitle:'Boshqa *yoʻnalishlar*' },
  guides:{ kicker:'Qoʻllanma', by:'ERKAK tahririyati', updated:'Yangilangan:', toc:'Mundarija', disclaimer:'Narxlar va qoidalar yangilangan sanadagi ochiq manbalar asosida keltirilgan va oʻzgarishi mumkin. Bu tibbiy yoki yuridik maslahat emas.', relKicker:'Mavzuga oid dasturlar', relTitle:'*Yoʻlga chiqishga* tayyormisiz?' },
  form:{ name:'Ism', namePh:'Sizga qanday murojaat qilaylik', date:'Sanalar', datePh:'Masalan, 2027-yil yanvar', guests:'Ishtirokchilar soni', guestsPh:'Necha kishi', contact:'Telegram, WhatsApp yoki telefon', contactPh:'@username yoki +998…', send:'Ariza yuborish',
    consent:'Tugmani bosish orqali siz [maxfiylik siyosatiga]({privacy}) rozilik bildirasiz. Hech qanday spam yoʻq.' },
  foot:{ title:'Maqsadingizni ayting — qolganini biz *tashkil qilamiz*', about:'ERKAK — bu shunchaki erkak. Tarjimaga hojat yoʻq. Erkaklar velnesining global ekotizimi: sport, salomatlik, tiklanish va sarguzashtlar. Dasturlarni tekshirilgan hamkorlar oʻtkazadi, biz esa sizni arizadan to uyga qaytguningizcha kuzatib boramiz.',
    dirs:'Yoʻnalishlar', places:'Manzillar', allPlaces:'Barcha manzillar', contact:'Aloqa', note:'Narxlar USD va THB valyutasida taxminiy koʻrsatilgan; yakuniy narx tasdiqnomada belgilanadi. ERKAK — konsyerj, tibbiy muassasa emas.', tat:'TAT litsenziyasi № {n}' },
  hub:{ lede:'Muay tay, tibbiy koʻrik, togʻlar, okean va trofey baliq ovi. Oʻzbek va rus tillarida bitta konsyerj — arizadan uyga qaytguningizcha.',
    dirsTitle:'*Erkaklar velnesining* {n} yoʻnalishi', topLede:'Boshlangʻich narxlar {date} holatiga, parvozsiz. Avval — eng koʻp soʻralganlari.', count:'{m} tadan {n} tasi koʻrsatilgan' },
  meta:{ dirTitle:'{name} — erkaklar uchun dunyo boʻylab {n} dastur | ERKAK', dirDesc:'{short} {n} dastur, oʻzbek va rus tillarida konsyerj, tekshirilgan hamkorlar.',
    progTitle:'{title} — {where}, kamida {price} | ERKAK', progDesc:'{short} {dur}. Boshlangʻich narx — {price}. Oʻzbek va rus tillarida konsyerj, tekshirilgan hamkorlar, oldindan yozilish.',
    tourTitle:'{title}: baliq ovi, {where} — kamida {price} | ERKAK', tourDesc:'{short} {dur}, {group}. Boshlangʻich narx — {price}. Litsenziyali gid, transfer, anjomlar, sugʻurta.',
    destTitle:'{title} | ERKAK', destDesc:'{name}: erkaklar uchun {n} dastur — sport, salomatlik, tiklanish, sarguzashtlar. Oʻzbek va rus tillarida konsyerj.' },
  prog:{ fly:'Uchib kelish', flyVal:'{a} · joygacha ~{t}', where:'Qayerda', dur:'Davomiyligi', when:'Eng qulay vaqt', price:'Narxi', about:'Dastur haqida', plan:'Qanday oʻtadi', stage:'{n}-bosqich', incl:'Nimalar kiradi', inclNote:'Aniq tarkib va hamkorlarni sanalaringizga moslangan taklifda belgilaymiz. Parvoz narxga kirmaydi.',
    best:'Eng qulay vaqt', bestNote:'Sanalarni ob-havo, mavsum va hamkorlar bandligiga qarab tanlaymiz.', who:'Kimlarga mos keladi', how:'Bu qanday ishlaydi', combine:'Bir safarda birlashtirish mumkin', faq:'Koʻp beriladigan savollar',
    waitNote:'Yoʻnalish ishga tushirishga tayyorlanmoqda. Ariza qoldiring — sanalarda ustuvorlik, erta narx va guruhingizga moslangan dasturga ega boʻlasiz.', waitCta:'Birinchilardan boʻlib yozilish', more:'Ushbu *yoʻnalishdagi* boshqa dasturlar' },
  quiz:{ back:'Orqaga', next:'Keyingi' },
  fishing:{ segCta:'Menga variant tuzing', map:{ allowed:'Baliq ovlashga ruxsat berilgan', banned:'Baliq ovlash taqiqlangan', aria:'Andaman dengizi sxemasi: ruxsat etilgan nuqtalar va taqiqlangan hududlar', phuket:'PUKET', thailand:'TAILAND', sea:'ANDAMAN DENGIZI', pier:'CHALONG' } },
  tour:{ group:'Guruh', format:'Format', why:'Nega aynan shu format', species:'Qanday baliq tutamiz', day:'Kun qanday oʻtadi', incl:'Narxga kiradi', excl:'Narxga kirmaydi', where:'Qayerda ovlaymiz', upsell:'Qoʻshimcha xizmatlar', deposit:'Oldindan toʻlov', cancel:'Bekor qilish', cancelVal:'7 kun oldingacha bepul', cta:'Sanani tekshirish', relKicker:'Oʻxshash formatlar', relTitle:'Bular ham *mos kelishi mumkin*' },
  dest:{ programs:'Dasturlar', dirs:'Yoʻnalishlar', from:'Boshlangʻich narx', live:'Bron ochiq', seasonKicker:'Mavsum', season:'Qachon borish yaxshi', accessKicker:'Logistika', access:'Qanday yetib borish mumkin', listKicker:'Dasturlar', listTitle:'{name}: bu yerda qilish mumkin boʻlgan *hamma narsa*' },
  faq:{ kicker:'Savollar' },
  legal:{ kicker:'Hujjatlar', updated:'Tahrir sanasi:' }
};

// Brauzerdagi skriptlar uchun satrlar
export const client = {
  from:'kamida', count:'{m} tadan {n} tasi koʻrsatilgan', sending:'Yuborilmoqda…', quizNext:'Keyingi', quizSend:'Reja va narxni olish', club:'Klub',
  msgHello:'Assalomu alaykum. ERKAK saytidan ariza.', msgProgram:'Dastur', msgDates:'Sanalar', msgGuests:'Ishtirokchilar soni',
  okTitle:'Arizangiz qabul qilindi', okText:'Konsyerj sanalar va narxlar bilan variantlarni yuboradi. Ish vaqtida — 15 daqiqa ichida. Eng tezkor yoʻli — oʻzingiz yozing:',
  failTitle:'Bir qadam qoldi', failText:'Arizani messenjer orqali yuboring — matn allaqachon tayyor.',
  planSummary:'Bir nechta dasturdan iborat sayohat', planAdd:'Sayohatga qoʻshish', planAdded:'Qoʻshilgan', planRemove:'Sayohatdan olib tashlash',
  livePeak:'avj pallasi — {list}', liveGood:'{list} yaxshi ilinadi', liveFresh:'chuchuk suv mavsumi', liveCalm:'dengiz tinch', liveMonsoon:'musson, qulay kunlarda chiqamiz',
  allowed:'Baliq ovlashga ruxsat berilgan', banned:'Baliq ovlash taqiqlangan', spotRun:'Yoʻl', spotFish:'Baliq', spotHow:'Usul', spotCta:'Shu joyni tanlayman',
  payCancel:'Toʻlov amalga oshmadi yoki bekor qilindi. Uning oʻrniga ariza yuboring — konsyerj toʻlov havolasini yuboradi.', consentText:'Analitik cookie-fayllarga ruxsat berasizmi? Ular saytda nimani yaxshilash kerakligini tushunishga yordam beradi.', consentOk:'Ruxsat berish', consentNo:'Hozir emas', consentLink:'Cookie sozlamalari'
};

export const goals = {
  fit:['Jismoniy forma va vazn', 'Ortiqcha vazndan qutulish, kuch va chidamlilikni qaytarish'],
  skill:['Yangi koʻnikma', 'Muay tay, golf, serfing, dayving — noldan yoki yangi darajaga'],
  health:['Salomatlik', 'Tibbiy koʻrik, erkaklar salomatligi, uzoq umr, estetika'],
  reset:['Yangilanish', 'Toliqish, stress, uyqu, alkogol, raqamli shovqin'],
  adventure:['Sarguzasht', 'Trofey, choʻqqi, okean — bir umr esda qoladigan hikoya'],
  team:['Doʻstlar yoki jamoa bilan', 'Erkaklar safari, korporativ tadbir, turnir'],
  family:['Oʻgʻlingiz bilan', 'Ikkalangiz ham eslab yuradigan damlar']
};

export const regions = { th:'Tailand', asia:'Osiyo va Bali', me:'Yaqin Sharq, Turkiya, Afrika', eu:'Yevropa', cis:'Rossiya, Kavkaz, Markaziy Osiyo', online:'Onlayn' };
