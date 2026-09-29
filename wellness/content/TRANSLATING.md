# ERKAK: how to translate the site

The master language is Russian: `content/ru/`. Every other language is a folder with the same set of files:

| File | Contents |
|---|---|
| `ui.mjs` | `meta`, `units`, `nouns`, `ui` (interface), `client` (browser strings), `goals`, `regions` |
| `catalog.mjs` | `directions` (14), `programs` (88), `destinations` |
| `fishing.mjs` | `export default {…}`: the fishing section (landing, 12 tours, spots, calendar, quiz, FAQ) |
| `site.mjs` | `hub` (home), `site`, `places`, `guidesPage`, `about`, `legal` |
| `guides.mjs` | `export default {…}`: 9 long-form guides |
| `index.mjs` | assembles everything (copy `content/ru/index.mjs` and change only the comment) |

Numbers, prices, IDs, months, coordinates and slugs live in `content/core.mjs` and are shared by all languages. Language files contain only text.

## Structure rules (checked by `node tools/check-i18n.mjs <lang>`)

1. **Same keys, same array lengths, same order** as in `ru`. Don't add or remove list items: one Russian item becomes one translated item.
2. **Technical values are never translated**: IDs and anchors such as `'solo'`, `'b1'`, `'tours'`, `'0-1000'` or `'all'` (first element of pairs in `filters` and quiz options, second element in `subnav`).
3. **Placeholders** such as `{n}`, `{name}`, `{price}`, `{privacy}` stay exactly as they are (they can move within the sentence).
4. **Markup:**
   - `*…*` marks the key words of a heading. The current design renders them as plain text, but keep the marks on the equivalent words so the accent can come back without re-translating.
   - `**bold**` is used in lists.
   - `[text](../../url/)` is a link: translate the text, never change the URL.
5. **Numbers** in the data (e.g. `0`, `≤ 6`, `30%` in `fishing.proof`) stay the same.
6. **JS strings are in single quotes.** Don't use the ASCII apostrophe `'` inside text; use the typographic `’` (U+2019).
   - Uzbek uses `oʻ` / `gʻ` with U+02BB `ʻ`, and the tutuq belgisi uses `’`.
   - If you really need an ASCII `'`, escape it as `\'`.
7. **Quotation marks** follow the language:

   | Language | Marks |
   |---|---|
   | EN | “…” |
   | DE | „…“ |
   | AR | «…» or “…” |
   | ZH | “…” |
   | UZ | «…» or “…” |

8. **No Cyrillic** in non-Russian files; the checker flags it.
9. **SEO:**
   - `metaTitle` ≤ 65 characters and `metaDesc` ≤ 160.
   - Write them as natural search queries in the target language (e.g. EN “Muay Thai camp Phuket”, DE “Muay Thai Camp Phuket”, ZH “普吉岛泰拳训练营”, AR “معسكر مواي تاي في بوكيت”, UZ “Puketda muay tay lageri”).
   - Keep `| ERKAK` at the end where Russian has it.

## Honesty rules (important, not optional)

The site must never promise what the business doesn't do.

- **Concierge languages.** The team answers in Russian, English and Uzbek.
  - Wherever Russian says «на русском» / «на вашем языке» (in Russian / in your language), adapt it:

    | Language | Say |
    |---|---|
    | EN | “English-speaking concierge”; “in your language” is fine |
    | DE | “Concierge auf Englisch” (optionally “und Russisch”) |
    | AR | “كونسيرج باللغة الإنجليزية” |
    | ZH | “英文礼宾服务” / “英语沟通” |
    | UZ | “oʻzbek va rus tillarida” |

  - Never claim German, Arabic or Chinese-speaking staff.
  - Where Russian says “in your language” as a benefit (fishing hero, pains, concierge), DE, AR and ZH must replace it with another true benefit: “one concierge for everything”, “fully arranged”, “private”.
- **Payments.** The Russian text lists “rubles via partner, USDT, foreign bank cards, cash on site, company invoice”. Adapt it:
  - EN/DE/AR/ZH: international cards · bank transfer / company invoice · USDT · cash (THB/USD) on site. Drop “rubles via partner”.
  - UZ: international Visa/Mastercard cards from Uzbek banks work · USDT · cash · company invoice.
  - FAQ “How to pay from Russia and the CIS?” becomes “How do I pay?” (UZ: “Oʻzbekistondan qanday toʻlash mumkin?”).
- **Visa.** From 15 Sep 2026 Thailand gives 30 days visa-free to 60 countries. Adapt nationality examples to the audience:

  | Language | Nationality examples |
  |---|---|
  | EN | EU/UK/US/GCC, 30 days |
  | DE | Germany, Austria and Switzerland, 30 days |
  | AR | GCC citizens, 30 days |
  | ZH | Chinese citizens, 30 days (mutual exemption) |
  | UZ | citizens of Uzbekistan need a visa (e-Visa); we help with documents |

  The nationality table in the visa guide stays complete. Don't invent new rules.
- **Russia-centric logistics.**
  - Replace “direct flights from Moscow and Almaty” with neutral hubs: “direct flights from Europe, the Gulf and Asia; connections via Dubai, Doha, Istanbul, Bangkok”.
  - For UZ, Tashkent is fine: “Toshkentdan Bangkokka to‘g‘ridan-to‘g‘ri reyslar bor” only if Russian mentions it. Otherwise say “connections via Dubai / Istanbul / Almaty”.
  - Notes for foreigners going to Russia (cards don't work, Western insurance often excluded) stay: they are true and useful.
- **Prices written in rubles inside text** (e.g. Elbrus “55–110 тыс. ₽” in the peaks guide) become “650–1,300 USD” (formatted for the locale).
- **Medical and legal wording** stays careful:
  - Use “screening” and “check-up”, never “cure” or “treatment results”. No weight-loss guarantees.
  - ERKAK is a concierge, not a clinic.
- **Legal pages.** Translate faithfully. For `de`, also set `legal.privacy.draft` (it's empty in Russian) to a note that the operator's Impressum and full GDPR details will be published before launch.
- **Brand.** ERKAK stays in Latin capitals in every language.
  - “«Эркак» по-узбекски — мужчина” becomes “‘Erkak’ means ‘man’ in Uzbek” (EN) and equivalents.
  - UZ adapts it playfully, since the word is Uzbek (e.g. “ERKAK — bu shunchaki erkak.”).

## Per-language `meta` (in `ui.mjs`)

| code | name | locale | htmlLang | hreflang | ogLocale | dir | currency | messengers | preload |
|---|---|---|---|---|---|---|---|---|---|
| en | English | en-US | en | en | en_US | ltr | USD | whatsapp, telegram | golos-text-latin-normal-400 |
| de | Deutsch | de-DE | de | de | de_DE | ltr | EUR | whatsapp, telegram | golos-text-latin-normal-400 |
| ar | العربية | ar-u-nu-latn | ar | ar | ar_AE | rtl | USD | whatsapp, telegram | ibm-plex-sans-arabic-arabic-normal-400 |
| zh | 简体中文 | zh-CN | zh-Hans | zh-Hans | zh_CN | ltr | CNY | whatsapp, telegram | *(empty array: Chinese uses system fonts)* |
| uz | Oʻzbekcha | uz-Latn-UZ | uz | uz | uz_UZ | ltr | UZS | telegram, whatsapp | golos-text-latin-normal-400 |

## Plural forms (`units`, `nouns`)

Each unit or noun is an object with the plural categories of `new Intl.PluralRules(locale)`:

| Language | Categories |
|---|---|
| EN, DE, UZ | `one`, `other` |
| ZH | `other` only |
| AR | `zero`, `one`, `two`, `few`, `many`, `other` |

- `gen` exists only in Russian (genitive for “до 6 рыболовов”, up to 6 anglers). Other languages drop it.
- `ui.group.upto` gets `{noun}` in the plural form for `{n}`.

Examples:

- EN: `d:{ one:'day', other:'days' }`, `angler:{ one:'angler', other:'anglers' }`, `group.upto:'up to {n} {noun}'`.
- AR: `d:{ zero:'يوم', one:'يوم', two:'يومان', few:'أيام', many:'يومًا', other:'يوم' }`.
- ZH: `d:{ other:'天' }`, `angler:{ other:'位钓手' }`, `group.upto:'最多 {n} {noun}'`.

## Place names

Use the established exonyms of the target language:

| Language | Examples |
|---|---|
| EN, DE | Phuket, Bangkok, Koh Samui, Chiang Mai, Krabi, Khao Lak, Hua Hin, Pattaya, Racha Yai / Racha Noi, Similan Islands, Phi Phi, Koh Rok, Hin Daeng, Shark Point, Chalong, Soi Ta-iad, Rawai, Nai Harn, Bang Tao, Khao Sok, Cheow Lan, Phang Nga, Tap Lamu |
| ZH | 普吉岛, 曼谷, 苏梅岛, 清迈, 甲米, 考拉, 华欣, 芭提雅, 斯米兰群岛, 皮皮岛, 攀牙湾 |
| AR | بوكيت، بانكوك، كوه ساموي، شيانغ ماي، كرابي، خاو لاك… |

## Glossary

| ru | en | de | ar | zh | uz |
|---|---|---|---|---|---|
| Консьерж | concierge | Concierge | الكونسيرج | 礼宾顾问 | konsyerj |
| Маршрут (корзина) | My trip | Meine Reise | رحلتي | 我的行程 | Mening sayohatim |
| Предзапись | Early access | Vormerkung | تسجيل مسبق | 预约登记 | Oldindan yozilish |
| Бронь открыта | Booking open | Jetzt buchbar | الحجز متاح | 开放预订 | Bron ochiq |
| Хит спроса | Most requested | Gefragt | الأكثر طلبًا | 热门 | Eng koʻp soʻralgan |
| Направление | discipline | Bereich | مجال | 方向 | yoʻnalish |
| Чек-ап | check-up | Check-up | فحص شامل | 体检 | tibbiy koʻrik (check-up) |
| Рыбалка и трофеи | Fishing & trophies | Angeln & Trophäen | الصيد والجوائز | 海钓与战利品 | Baliq ovi va trofeylar |

Tone: calm, confident, premium, and concrete. Short sentences. No hype words (“best ever”, “unique”), no exclamation marks.

## Checking

```
node tools/check-i18n.mjs de --file=catalog   # one file
node tools/check-i18n.mjs de                  # whole language, including index.mjs
node build.mjs --lang=de                      # build: catches missing ui keys
```
