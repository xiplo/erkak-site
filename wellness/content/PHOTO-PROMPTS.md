# Фото для ERKAK: промпты для генерации

31 кадр: первый экран, рыбалка, клуб, 14 направлений и 14 мест. Промпты на английском: Gemini и ChatGPT по-английски рисуют точнее.

## Как сгенерировать и вставить

1. Скопируйте в Gemini или ChatGPT промпт слота и добавьте в конец **общий стиль** (ниже).
2. Сохраните картинку в папку `wellness/photos-src/`. Имя файла — это имя слота, расширение любое из `.jpg`, `.png`, `.webp`: например, `hero.jpg`, `dir-fishing.png`, `dest-phuket.webp`.
3. Запустите `node tools/photos.mjs`. Скрипт нарежет размеры в WebP, посчитает размытую подложку и сообщит, если какое-то имя файла не подошло ни к одному слоту.
4. Запустите `node tools/og.mjs`: картинки для соцсетей перерисуются с новыми кадрами.
5. Соберите сайт (`node build.mjs`) и закоммитьте `src/img/`, `content/photos-local.json`. Папка `photos-src/` в git не попадает, оригиналы храните у себя.

Слоты без своего файла остаются на временных фото из `content/photos.mjs`, поэтому менять можно по одному.

## Правила кадра

- **Формат:** горизонтальный 3:2, от 1800 px по ширине. Первый экран — 16:9, от 2400 px.
- **Кадрирование:** один и тот же кадр сайт показывает в разных пропорциях: 3:4 в плитке направления, 5:4 в шапке страницы, 16:10 в карточке. Поэтому главный объект — по центру, с запасом по краям.
- **Что убрать:** без текста, логотипов, водяных знаков и узнаваемых брендов на одежде и лодках. Люди не должны быть похожи на знаменитостей.
- **Кто в кадре:** мужчины 30–55 лет, разной внешности, в естественных позах. Не модели из фитнес-рекламы.
- **Права:** перед запуском проверьте условия сервиса, в котором генерировали: можно ли использовать картинки в коммерции.

### Общий стиль (добавлять к каждому промпту)

```
Editorial documentary photograph, natural light, realistic skin and textures, shot on a full-frame camera with a 35mm lens, shallow depth of field, calm muted colour grade with deep graphite shadows and warm highlights, premium travel-magazine look. No text, no logos, no watermark, no brand names, not a stock-photo pose.
```

## Общие

| Файл | Где на сайте | Промпт |
|---|---|---|
| `hero` | Первый экран главной, текст поверх внизу слева | Wide 16:9 photograph of a lone man in his forties standing on a rocky ridge above a tropical sea at golden hour, seen from behind in the right third of the frame, vast sky and layered islands, the lower-left third of the frame darker and calm, sense of freedom and strength. |
| `fishing-hero` | Первый экран раздела рыбалки и страницы туров | Wide photograph of a private sport-fishing boat on the Andaman Sea at sunrise, two men in the cockpit, one fighting a fish with a bent rod, limestone islands on the horizon, spray and warm light, lower-left area of calm water for text. |
| `club` | Фон блока «Скажите цель» внизу каждой страницы | Dark moody photograph of a quiet private villa terrace at blue hour, an empty lounge chair and a low table with a glass of water, sea and mountain silhouettes in the distance, mostly deep graphite tones, very minimal. |

## Направления (плитки на главной, шапки направлений и программ, карточки гайдов)

| Файл | Направление | Промпт |
|---|---|---|
| `dir-fishing` | Рыбалка и трофеи | Man in his thirties holding a large giant trevally just above the water on a boat deck, sunlit sea, genuine smile, the fish about to be released, close but not tight crop. |
| `dir-muaythai` | Муай тай и единоборства | Muay Thai training in an open-air Thai gym at dusk, a man in his thirties kicking pads held by a Thai trainer, sweat and motion, wooden ring ropes and hanging bags in the background, warm lamp light. |
| `dir-camps` | Спортивные сборы | Group of four men running on a coastal road at sunrise during a training camp, seen from the side, mountains and sea behind, focused and tired faces, athletic but not bodybuilder. |
| `dir-longevity` | Чек-ап и долголетие | Calm modern clinic consultation room with a large window onto greenery, a man in his fifties sitting with a doctor looking at a tablet with results, soft daylight, trustworthy and quiet, faces partly turned away. |
| `dir-detox` | Детокс и перезагрузка | Man in his forties in a linen shirt sitting on a wooden deck by an infinity pool in the tropical jungle in the early morning, cup of herbal tea, mist over the trees, sense of reset. |
| `dir-recovery` | Восстановление | Man stepping into a cold plunge pool next to a wooden sauna cabin, steam rising, early morning, stones and towels, strong but relaxed body language, seen from behind or in profile. |
| `dir-mind` | Ум и спокойствие | Man sitting cross-legged on a wooden platform facing a misty mountain lake at dawn, seen from behind, pine forest, total stillness, lots of negative space. |
| `dir-adventure` | Приключения | Two climbers in mountaineering gear walking along a snowy ridge towards a summit at sunrise, rope between them, huge scale of the mountains, clear sky. |
| `dir-ocean` | Океан | Surfer in his thirties paddling out through a clear turquoise wave, seen from water level, or a freediver descending along a reef with sunbeams, sense of depth and calm. |
| `dir-golf` | Гольф и падел | Man in his forties mid-swing on a green fairway by the sea at golden hour, palm trees and ocean in the background, relaxed elegant clothing without logos. |
| `dir-aesthetics` | Мужская эстетика | Classic barbershop interior with a man in his thirties getting a hot-towel shave, warm wood and brass details, soft window light, calm and well-groomed, face partly covered by the towel. |
| `dir-nutrition` | Питание и добавки | Top-down photograph of a healthy breakfast on a dark stone table: grilled fish, eggs, avocado, greens, berries, black coffee, a man’s hands reaching for a cup, natural light. |
| `dir-family` | Отец и сын | Father in his forties and his ten-year-old son on a small boat at sunset, the son holding a fishing rod while the father points at the water, both laughing, seen from the side. |
| `dir-business` | Для компаний и друзей | Group of six men in their thirties and forties on the deck of a boat at sunset, toasting with glasses of juice or water, relaxed and friendly, sea and islands behind. |

## Места (карточки на главной, список мест, шапки страниц мест)

| Файл | Место | Промпт |
|---|---|---|
| `dest-phuket` | Пхукет | Aerial photograph of Phuket’s west coast at golden hour: a curved beach, turquoise water, green hills and longtail boats, no crowds. |
| `dest-bangkok` | Бангкок | Bangkok skyline at blue hour seen from a rooftop, the Chao Phraya river with lit boats, a temple spire in the foreground, rich city lights. |
| `dest-samui` | Самуи и Ко Тао | Quiet beach on Koh Samui in the morning with coconut palms leaning over calm water, a wooden boat anchored close to shore, soft light. |
| `dest-chiang-mai` | Чиангмай | Misty green mountains near Chiang Mai at sunrise with a golden temple on a hill, layers of fog in the valleys. |
| `dest-krabi` | Краби и Као Лак | Dramatic limestone karst islands rising from emerald water near Krabi, a longtail boat in the foreground, late afternoon light. |
| `dest-gulf` | Хуа Хин и Паттайя | Long quiet beach at Hua Hin in the evening with a wooden pier and fishing boats, pastel sky over the Gulf of Thailand. |
| `dest-bali` | Бали | Bali cliffside at Uluwatu at sunset with a lone surfer walking down stone steps towards the waves, jungle on the cliff. |
| `dest-dubai` | Дубай | Golden sand dunes of the Arabian desert at sunrise with a single 4x4 track, the Dubai skyline faint on the horizon. |
| `dest-caucasus` | Кавказ | Twin-peaked Mount Elbrus above a sea of clouds at sunrise, a small group of climbers on the snow slope for scale. |
| `dest-central-asia` | Центральная Азия | Turquoise mountain lake in the Tien Shan with snowy peaks, a yurt camp on the green shore, horses grazing, clear morning. |
| `dest-russia` | Алтай и Камчатка | Snow-covered volcano in Kamchatka above autumn tundra in red and gold, steam rising from the crater, vast wilderness. |
| `dest-east-africa` | Восточная Африка | Mount Kilimanjaro at sunrise seen across the savannah of Amboseli, acacia trees and a herd of elephants in the foreground. |
| `dest-europe` | Европа | Alpine lake in the Dolomites at dawn with a wooden rowing boat, jagged peaks reflected in still water. |
| `dest-east-asia` | Япония и Корея | Traditional Japanese onsen ryokan at dusk, steaming outdoor stone bath surrounded by maple trees in autumn colour, lanterns glowing. |
