// ERKAK · 日本語 · インターフェース、単位、ブラウザ用文字列、目的、地域。
export const meta = {
  code:'ja', name:'日本語', locale:'ja-JP', htmlLang:'ja', hreflang:'ja', ogLocale:'ja_JP', dir:'ltr',
  currency:'JPY', messengers:['whatsapp', 'telegram'],
  preload:[]
};

export const units = {
  h:{ other:'時間' },
  d:{ other:'日' },
  w:{ other:'週間' },
  night:{ other:'泊' },
  lesson:{ other:'回のレッスン' },
  visit:{ other:'回' },
  session:{ other:'回のセッション' }
};
export const nouns = {
  spot:{ other:'か所' },
  angler:{ other:'名' },
  guest:{ other:'名' },
  program:{ other:'件のプログラム' }
};

export const ui = {
  fishmap:{ aria:'タイの地図：釣りエリアとポイント' },
  pay:{ cta:'カードで {p}% の前払い金を支払う', note:'Stripe による安全な決済です。残金は出航当日にお支払いください。', doneTitle:'前払い金を受け付けました', doneText:'ありがとうございます。営業時間内であれば、15 分以内にコンシェルジュが日程を確定し、詳細をお送りします。', doneBack:'釣りのページに戻る' },
  time:{ min:'{n} 分', h:'{n} 時間' },
  from:'最低料金', allYear:'通年', notFound:'ページが見つかりません',
  suggest:['このサイトは日本語でもご覧いただけます', '切り替える'],
  brand:{ tag:'メンズウェルネス · 世界各地' },
  a11y:{ skip:'本文へ移動', nav:'セクション', crumbs:'パンくずリスト', langCur:'言語と通貨', lang:'言語', cur:'通貨', menu:'メニュー', close:'閉じる' },
  nav:{ home:'ホーム', dirs:'分野', top:'100 のプログラム', fishing:'釣り', places:'目的地', guides:'ガイド', club:'クラブ', about:'私たちについて', visa:'ビザサポート', terms:'利用規約', privacy:'プライバシー', all:'ERKAK のすべて' },
  cta:{ pick:'プログラムを選ぶ', pickTour:'ツアーを選ぶ', ask:'コンシェルジュに相談する' },
  tag:{ hot:'人気', live:'予約受付中', soon:'先行登録', lux:'プレミアム' },
  per:{ boat:'ボート 1 隻あたり', person:'1 名あたり', group:'プログラム一式', pair:'2 名分', implant:'インプラント 1 本あたり', set:'1 セットあたり' },
  group:{ upto:'最大 {n} {noun}', range:'{a}–{b} {noun}' },
  plan:{ add:'旅程に追加', title:'マイトリップ', kicker:'旅程', empty:'「旅程に追加」ボタンでプログラムを追加してください。ひとつの旅にまとめ、請求書も 1 通にします。', total:'概算合計', send:'コンシェルジュに送る' },
  dir:{ open:'開く', kickerLive:'分野 · 予約受付中', kickerSoon:'分野 · 先行登録', programs:'プログラム数', from:'最低料金', where:'場所', status:'ステータス', see:'{np}を見る',
    listKicker:'プログラム', listTitle:'*スタイル*を選ぶ', inclKicker:'ERKAK スタンダード', inclTitle:'*常に*含まれるもの', inclLede:'正確な内容は、ご希望の日程に合わせたご提案で確定します。航空券は含まれませんが、便選びもお手伝いします。',
    placesKicker:'エリア', placesTitle:'*プログラム*の開催地', guidesTitle:'*出発前に*読む', othersKicker:'エコシステム', othersTitle:'ほかの*分野*' },
  guides:{ kicker:'ガイド', by:'ERKAK 編集部', updated:'更新日', toc:'目次', disclaimer:'料金や規則は更新日時点の公開情報にもとづいており、変更される場合があります。医療上・法律上の助言ではありません。', relKicker:'関連プログラム', relTitle:'*出発*の準備はできましたか' },
  form:{ name:'お名前', namePh:'お呼びする名前', date:'日程', datePh:'例：2027 年 1 月', guests:'人数', guestsPh:'何名さまですか', contact:'WhatsApp、Telegram または電話番号', contactPh:'@username または +81…', send:'リクエストを送信',
    consent:'ボタンを押すと、[プライバシーポリシー]({privacy})に同意したものとみなされます。迷惑メールは送りません。' },
  foot:{ title:'目的を教えてください。あとは私たちが*手配*します', about:'「Erkak」はウズベク語で「男」を意味します。スポーツ、健康、リカバリー、冒険を扱う、世界規模のメンズウェルネス・エコシステムです。プログラムは厳選したパートナーが実施し、最初のご相談からご帰宅まで私たちがサポートします。',
    dirs:'分野', places:'目的地', allPlaces:'すべての目的地', contact:'お問い合わせ', note:'USD と THB の料金は目安です。最終料金は確認書に記載されます。ERKAK はコンシェルジュであり、医療機関ではありません。', tat:'TAT ライセンス番号 {n}' },
  hub:{ lede:'ムエタイ、メディカルチェック、山、海、トロフィーフィッシング。英語対応のコンシェルジュひとりが、ご相談からご帰宅まで担当します。',
    dirsTitle:'*メンズウェルネス*の {n} 分野', topLede:'{date}時点の最低料金です。航空券は含みません。人気順に表示しています。', count:'{m} 件中 {n} 件を表示' },
  meta:{ dirTitle:'男性のための{name} — 世界の {np} | ERKAK', dirDesc:'{short}{np}。英語対応のコンシェルジュと厳選パートナー。',
    progTitle:'{title} — {where}、{price}〜 | ERKAK', progDesc:'{short}期間 {dur}。{price}〜。英語対応のコンシェルジュ、厳選パートナー、先行登録受付中。',
    tourTitle:'{title}：{where}の釣り、{price}〜 | ERKAK', tourDesc:'{short}期間 {dur}、{group}。{price}〜。ライセンスを持つガイド、送迎、タックル、保険付き。',
    destTitle:'{title} | ERKAK', destDesc:'{name}：男性向けの {np}。スポーツ、健康、リカバリー、冒険。英語対応のコンシェルジュ。' },
  prog:{ fly:'到着', flyVal:'{a} · 現地まで約 {t}', where:'場所', dur:'期間', when:'ベストシーズン', price:'料金', about:'プログラムについて', plan:'流れ', stage:'ステージ {n}', incl:'含まれるもの', inclNote:'正確な内容とパートナーは、ご希望の日程に合わせたご提案で確定します。航空券は含まれません。',
    best:'ベストシーズン', bestNote:'天候、季節、パートナーの空き状況に合わせて日程を組みます。', who:'こんな方に', how:'ご利用の流れ', combine:'組み合わせにおすすめ', faq:'よくある質問',
    waitNote:'この分野は開始準備中です。リクエストをお送りいただくと、日程の優先確保、早期料金、グループに合わせたプログラムをご用意します。', waitCta:'先行登録する', more:'この*分野*のほかのプログラム' },
  quiz:{ back:'戻る', next:'次へ' },
  fishing:{ segCta:'自分向けにアレンジする', map:{ allowed:'釣り可能', banned:'釣り禁止', aria:'アンダマン海の地図：釣り可能なポイントと禁漁区域', phuket:'プーケット', thailand:'タイ', sea:'アンダマン海', pier:'チャロン' } },
  tour:{ group:'人数', format:'スタイル', why:'このスタイルを選ぶ理由', species:'ターゲット魚種', day:'1 日の流れ', incl:'含まれるもの', excl:'含まれないもの', where:'釣り場', upsell:'追加オプション', deposit:'前払い金', cancel:'キャンセル', cancelVal:'7 日前まで無料', cta:'空き状況を確認する', relKicker:'似たスタイル', relTitle:'こちらも*おすすめ*です' },
  dest:{ programs:'プログラム数', dirs:'分野数', from:'最低料金', live:'予約受付中', seasonKicker:'シーズン', season:'行く時期', accessKicker:'アクセス', access:'行き方', listKicker:'プログラム', listTitle:'{name}で*できること*のすべて' },
  faq:{ kicker:'よくある質問' },
  legal:{ kicker:'法的情報', updated:'最終更新日' }
};

// ブラウザスクリプト用の文字列
export const client = {
  from:'最低料金', count:'{m} 件中 {n} 件を表示', sending:'送信中…', quizNext:'次へ', quizSend:'プランと料金を受け取る', club:'クラブ',
  msgHello:'こんにちは。ERKAK のウェブサイトからのリクエストです。', msgProgram:'プログラム', msgDates:'日程', msgGuests:'人数',
  okTitle:'リクエストを受け付けました', okText:'コンシェルジュが英語で日程と料金を含むご提案をお送りします。営業時間内なら 15 分以内です。直接メッセージをいただくのが最も早い方法です：',
  failTitle:'あと一歩です', failText:'メッセンジャーでリクエストをお送りください。文面は用意してあります。',
  planSummary:'複数プログラムの旅程', planAdd:'旅程に追加', planAdded:'旅程に追加済み', planRemove:'旅程から外す',
  livePeak:'{list}のハイシーズン', liveGood:'{list}が好調', liveFresh:'淡水シーズン', liveCalm:'海は穏やか', liveMonsoon:'モンスーン期、天候の合間に出航',
  allowed:'釣り可能', banned:'釣り禁止', spotRun:'移動時間', spotFish:'魚種', spotHow:'釣法', spotCta:'ここで釣りたい',
  payCancel:'決済が完了しなかったか、キャンセルされました。リクエストをお送りいただければ、コンシェルジュが決済リンクをお送りします。', consentText:'分析用 Cookie を許可しますか。サイトの改善点を把握するのに役立ちます。', consentOk:'許可する', consentNo:'今はしない', consentLink:'Cookie 設定'
};

export const goals = {
  fit:['体型と体重', '余分なものを落とし、筋力と持久力を取り戻す'],
  skill:['新しいスキル', 'ムエタイ、ゴルフ、サーフィン、ダイビング。ゼロから、または次のレベルへ'],
  health:['健康', 'メディカルチェック、男性の健康、長寿、エステティック'],
  reset:['リセット', '燃え尽き、ストレス、睡眠、アルコール、デジタルノイズ'],
  adventure:['冒険', 'トロフィー、山頂、海。一生語れる物語を'],
  team:['友人やチームと', '男同士の旅、社員旅行、トーナメント'],
  family:['息子と', 'ふたりの記憶に残る時間']
};

export const regions = { th:'タイ', asia:'アジアとバリ島', me:'中東、トルコ、アフリカ', eu:'ヨーロッパ', cis:'ロシア、コーカサス、中央アジア', online:'オンライン' };
