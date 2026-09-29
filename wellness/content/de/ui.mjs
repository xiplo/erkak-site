// ERKAK · Deutsch · Interface, Einheiten, Strings für den Browser, Ziele, Regionen.
export const meta = {
  code:'de', name:'Deutsch', locale:'de-DE', htmlLang:'de', hreflang:'de', ogLocale:'de_DE', dir:'ltr',
  currency:'EUR', messengers:['whatsapp', 'telegram'],
  preload:['golos-text-latin-normal-400']
};

export const units = {
  h:{ one:'Stunde', other:'Stunden' },
  d:{ one:'Tag', other:'Tage' },
  w:{ one:'Woche', other:'Wochen' },
  night:{ one:'Nacht', other:'Nächte' },
  lesson:{ one:'Einheit', other:'Einheiten' },
  visit:{ one:'Besuch', other:'Besuche' },
  session:{ one:'Sitzung', other:'Sitzungen' }
};
export const nouns = {
  spot:{ one:'Spot', other:'Spots' },
  angler:{ one:'Angler', other:'Angler' },
  guest:{ one:'Gast', other:'Gäste' },
  program:{ one:'Programm', other:'Programme' }
};

export const ui = {
  fishmap:{ aria:'Karte von Thailand: Angelgebiete und Spots' },
  pay:{ cta:'{p} % Anzahlung per Karte', note:'Sichere Zahlung über Stripe. Der Rest wird am Tag der Ausfahrt bezahlt.', doneTitle:'Anzahlung erhalten', doneText:'Vielen Dank! Ihr Concierge bestätigt den Termin und sendet die Details innerhalb von 15 Minuten während der Geschäftszeiten.', doneBack:'Zurück zum Angeln' },
  time:{ min:'{n} Min.', h:'{n} Std.' },
  from:'ab', allYear:'Ganzjährig', notFound:'Seite nicht gefunden',
  suggest:['Diese Seite gibt es auf Deutsch', 'Wechseln'],
  brand:{ tag:'Wellness für Männer · weltweit' },
  a11y:{ skip:'Zum Inhalt', nav:'Hauptnavigation', crumbs:'Brotkrümelnavigation', langCur:'Sprache und Währung', lang:'Sprache', cur:'Währung', menu:'Menü', close:'Schließen' },
  nav:{ home:'Startseite', dirs:'Bereiche', top:'100 Programme', fishing:'Angeln', places:'Reiseziele', guides:'Ratgeber', club:'Club', about:'Über uns', visa:'Visa-Service', terms:'AGB', privacy:'Datenschutz', all:'Gesamtes Ökosystem' },
  cta:{ pick:'Programm finden', pickTour:'Tour finden', ask:'Mit dem Concierge besprechen' },
  tag:{ hot:'Gefragt', live:'Jetzt buchbar', soon:'Vormerkung', lux:'Premium' },
  per:{ boat:'pro Boot', person:'pro Person', group:'pro Programm', pair:'für zwei Personen', implant:'pro Implantat', set:'pro Set' },
  group:{ upto:'bis zu {n} {noun}', range:'{a}–{b} {noun}' },
  plan:{ add:'Zur Reise', title:'Meine Reise', kicker:'Reiseplan', empty:'Fügen Sie Programme über „Zur Reise“ hinzu – wir verbinden sie zu einer Reise mit einer gemeinsamen Rechnung.', total:'Richtwert', send:'An den Concierge senden' },
  dir:{ open:'Öffnen', kickerLive:'Bereich · jetzt buchbar', kickerSoon:'Bereich · Vormerkung', programs:'Programme', from:'Preise ab', where:'Wo', status:'Status', see:'{np} ansehen',
    listKicker:'Programme', listTitle:'Wählen Sie *Ihr Format*', inclKicker:'ERKAK-Standard', inclTitle:'Was *immer* dabei ist', inclLede:'Den genauen Leistungsumfang legen wir im Angebot für Ihre Termine fest. Flüge sind nicht enthalten – bei der Auswahl helfen wir gern.',
    placesKicker:'Geografie', placesTitle:'Wo die *Programme* stattfinden', guidesTitle:'Was Sie *vor der Reise* wissen sollten', othersKicker:'Ökosystem', othersTitle:'Weitere *Bereiche*' },
  guides:{ kicker:'Ratgeber', by:'ERKAK-Redaktion', updated:'Aktualisiert am', toc:'Inhalt', disclaimer:'Preise und Regeln beruhen auf öffentlich zugänglichen Quellen zum Zeitpunkt der Aktualisierung und können sich ändern. Dies ist keine medizinische oder rechtliche Beratung.', relKicker:'Passende Programme', relTitle:'Bereit *aufzubrechen*?' },
  form:{ name:'Name', namePh:'Wie dürfen wir Sie ansprechen?', date:'Reisezeitraum', datePh:'z. B. Januar 2027', guests:'Teilnehmer', guestsPh:'Anzahl der Personen', contact:'WhatsApp, Telegram oder Telefon', contactPh:'@username oder +49…', send:'Anfrage senden',
    consent:'Mit dem Absenden stimmen Sie der [Datenschutzerklärung]({privacy}) zu. Kein Spam.' },
  foot:{ title:'Nennen Sie Ihr Ziel – wir *organisieren* den Rest', about:'„Erkak“ ist Usbekisch und bedeutet „Mann“. Ein weltweites Ökosystem für Männer-Wellness: Sport, Gesundheit, Regeneration und Abenteuer. Durchgeführt werden die Programme von geprüften Partnern; wir begleiten Sie von der Anfrage bis zur Rückkehr nach Hause.',
    dirs:'Bereiche', places:'Reiseziele', allPlaces:'Alle Reiseziele', contact:'Kontakt', note:'Preise in USD und THB sind Richtwerte; verbindlich ist die Buchungsbestätigung. ERKAK ist ein Concierge-Service, keine medizinische Einrichtung.', tat:'TAT-Lizenz Nr. {n}' },
  hub:{ lede:'Muay Thai, Check-ups, Berge, Ozean und Trophäenangeln. Ein Concierge für alles – von der Anfrage bis zur Rückkehr.',
    dirsTitle:'{n} Bereiche für *Männer-Wellness*', topLede:'Ab-Preise, Stand {date}, ohne Flug. Die gefragtesten zuerst.', count:'{n} von {m} angezeigt' },
  meta:{ dirTitle:'{name} für Männer – {np} weltweit | ERKAK', dirDesc:'{short} {np}, Concierge auf Englisch, geprüfte Partner.',
    progTitle:'{title} – {where}, ab {price} | ERKAK', progDesc:'{short} {dur}. Ab {price}. Concierge auf Englisch, geprüfte Partner, Vormerkung möglich.',
    tourTitle:'{title}: Angeln {where} – ab {price} | ERKAK', tourDesc:'{short} {dur}, {group}. Ab {price}. Lizenzierter Guide, Transfer, Ausrüstung, Versicherung.',
    destTitle:'{title} | ERKAK', destDesc:'{name}: {np} für Männer – Sport, Gesundheit, Regeneration, Abenteuer. Concierge auf Englisch.' },
  prog:{ fly:'Anreise', flyVal:'{a} · ca. {t} bis zum Ort', where:'Wo', dur:'Dauer', when:'Beste Reisezeit', price:'Preis', about:'Über das Programm', plan:'Ablauf', stage:'Phase {n}', incl:'Was enthalten ist', inclNote:'Den genauen Leistungsumfang und die Partner legen wir im Angebot für Ihre Termine fest. Flüge sind nicht enthalten.',
    best:'Beste Reisezeit', bestNote:'Die Termine planen wir nach Wetter, Saison und Verfügbarkeit der Partner.', who:'Für wen es passt', how:'So funktioniert es', combine:'Gut kombinierbar mit', faq:'Häufige Fragen',
    waitNote:'Dieser Bereich wird gerade für den Start vorbereitet. Hinterlassen Sie eine Anfrage – Sie erhalten Vorrang bei den Terminen, einen Frühbucherpreis und ein Programm für Ihre Gruppe.', waitCta:'Als Erster dabei sein', more:'Mehr aus diesem *Bereich*' },
  quiz:{ back:'Zurück', next:'Weiter' },
  fishing:{ segCta:'Meine Tour zusammenstellen', map:{ allowed:'Angeln erlaubt', banned:'Angeln verboten', aria:'Karte der Andamanensee: erlaubte Spots und Sperrzonen', phuket:'PHUKET', thailand:'THAILAND', sea:'ANDAMANENSEE', pier:'CHALONG' } },
  tour:{ group:'Gruppe', format:'Format', why:'Warum dieses Format', species:'Zielfische', day:'Tagesablauf', incl:'Inklusive', excl:'Nicht inklusive', where:'Wo wir angeln', upsell:'Optional zubuchbar', deposit:'Anzahlung', cancel:'Stornierung', cancelVal:'kostenlos bis 7 Tage vorher', cta:'Verfügbarkeit prüfen', relKicker:'Ähnliche Formate', relTitle:'Das könnte *auch passen*' },
  dest:{ programs:'Programme', dirs:'Bereiche', from:'Preise ab', live:'Jetzt buchbar', seasonKicker:'Saison', season:'Die beste Reisezeit', accessKicker:'Logistik', access:'Anreise', listKicker:'Programme', listTitle:'{name}: *alles*, was möglich ist' },
  faq:{ kicker:'Fragen' },
  legal:{ kicker:'Rechtliches', updated:'Fassung vom' }
};

// Strings für Skripte im Browser
export const client = {
  from:'ab', count:'{n} von {m} angezeigt', sending:'Wird gesendet…', quizNext:'Weiter', quizSend:'Plan und Preis erhalten', club:'Club',
  msgHello:'Guten Tag, dies ist eine Anfrage über die ERKAK-Website.', msgProgram:'Programm', msgDates:'Reisezeitraum', msgGuests:'Teilnehmer',
  okTitle:'Anfrage eingegangen', okText:'Der Concierge schickt Ihnen Optionen mit Terminen und Preisen, während der Geschäftszeiten innerhalb von 15 Minuten. Am schnellsten geht es, wenn Sie uns direkt schreiben:',
  failTitle:'Nur noch ein Schritt', failText:'Senden Sie die Anfrage per Messenger – der Text ist bereits vorbereitet.',
  planSummary:'Reise aus mehreren Programmen', planAdd:'Zur Reise', planAdded:'Hinzugefügt', planRemove:'Aus der Reise entfernen',
  livePeak:'Hochsaison für {list}', liveGood:'gute Chancen auf {list}', liveFresh:'Süßwassersaison', liveCalm:'ruhige See', liveMonsoon:'Monsun, wir angeln in Wetterfenstern',
  allowed:'Angeln erlaubt', banned:'Angeln verboten', spotRun:'Anfahrt', spotFish:'Zielfische', spotHow:'Methode', spotCta:'Diesen Spot anfragen',
  payCancel:'Die Zahlung wurde nicht abgeschlossen. Senden Sie stattdessen eine Anfrage – Ihr Concierge schickt Ihnen einen Zahlungslink.', consentText:'Dürfen wir Analyse-Cookies verwenden? Sie helfen uns zu verstehen, was wir auf der Website verbessern können.', consentOk:'Zulassen', consentNo:'Ablehnen', consentLink:'Cookie-Einstellungen'
};

export const goals = {
  fit:['Form und Gewicht', 'Überschüssige Kilos loswerden, Kraft und Ausdauer zurückgewinnen'],
  skill:['Neue Fähigkeit', 'Muay Thai, Golf, Surfen, Tauchen – als Einsteiger oder aufs nächste Level'],
  health:['Gesundheit', 'Check-up, Männergesundheit, Longevity, Ästhetik'],
  reset:['Neustart', 'Burn-out, Stress, Schlaf, Alkohol, digitaler Lärm'],
  adventure:['Abenteuer', 'Trophäe, Gipfel, Ozean – eine Geschichte fürs Leben'],
  team:['Mit Freunden oder dem Team', 'Männerreise, Firmenevent, Turnier'],
  family:['Mit dem Sohn', 'Zeit, die Ihnen beiden in Erinnerung bleibt']
};

export const regions = { th:'Thailand', asia:'Asien und Bali', me:'Naher Osten, Türkei, Afrika', eu:'Europa', cis:'Russland, Kaukasus, Zentralasien', online:'Online' };
