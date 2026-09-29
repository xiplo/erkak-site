// ERKAK · English · interface, units, browser strings, goals, regions.
export const meta = {
  code:'en', name:'English', locale:'en-US', htmlLang:'en', hreflang:'en', ogLocale:'en_US', dir:'ltr',
  currency:'USD', messengers:['whatsapp', 'telegram'],
  preload:['golos-text-latin-normal-400']
};

export const units = {
  h:{ one:'hour', other:'hours' },
  d:{ one:'day', other:'days' },
  w:{ one:'week', other:'weeks' },
  night:{ one:'night', other:'nights' },
  lesson:{ one:'lesson', other:'lessons' },
  visit:{ one:'visit', other:'visits' },
  session:{ one:'session', other:'sessions' }
};
export const nouns = {
  angler:{ one:'angler', other:'anglers' },
  guest:{ one:'guest', other:'guests' },
  program:{ one:'program', other:'programs' }
};

export const ui = {
  from:'from', allYear:'Year-round', notFound:'Page not found',
  suggest:['This site is available in English', 'Switch'],
  brand:{ tag:'Men’s wellness · worldwide' },
  a11y:{ skip:'Skip to content', nav:'Sections', crumbs:'Breadcrumb', langCur:'Language and currency', lang:'Language', cur:'Currency', menu:'Menu', close:'Close' },
  nav:{ home:'Home', dirs:'Disciplines', top:'100 programs', fishing:'Fishing', places:'Destinations', guides:'Guides', club:'Club', about:'About us', visa:'Visa support', terms:'Terms', privacy:'Privacy', all:'All of ERKAK' },
  cta:{ pick:'Find my program', pickTour:'Find my tour', ask:'Talk to a concierge' },
  tag:{ hot:'Most requested', live:'Booking open', soon:'Early access', lux:'Premium' },
  per:{ boat:'per boat', person:'per person', group:'per program', pair:'for two', implant:'per implant', set:'per set' },
  group:{ upto:'up to {n} {noun}', range:'{a}–{b} {noun}' },
  plan:{ add:'Add to trip', title:'My trip', kicker:'Itinerary', empty:'Add programs with the “Add to trip” button, and we’ll combine them into one trip with a single invoice.', total:'Estimated total', send:'Send to concierge' },
  dir:{ open:'Open', kickerLive:'Discipline · booking open', kickerSoon:'Discipline · early access', programs:'Programs', from:'Prices from', where:'Where', status:'Status', see:'See {np}',
    listKicker:'Programs', listTitle:'Choose your *format*', inclKicker:'The ERKAK standard', inclTitle:'What’s *always* included', inclLede:'We confirm the exact inclusions in a proposal for your dates. Flights are not included, but we’ll help you find the right ones.',
    placesKicker:'Geography', placesTitle:'Where the *programs* take place', guidesTitle:'Read *before you go*', othersKicker:'Ecosystem', othersTitle:'Other *disciplines*' },
  guides:{ kicker:'Guide', by:'ERKAK editorial team', updated:'Updated', toc:'Contents', disclaimer:'Prices and rules are based on public sources as of the update date and may change. This is not medical or legal advice.', relKicker:'Related programs', relTitle:'Ready to *go*?' },
  form:{ name:'Name', namePh:'What should we call you?', date:'Dates', datePh:'e.g., January 2027', guests:'Group size', guestsPh:'How many people', contact:'WhatsApp, Telegram or phone', contactPh:'@username or +1…', send:'Send request',
    consent:'By clicking the button, you agree to our [privacy policy]({privacy}). No spam.' },
  foot:{ kicker:'ERKAK concierge', title:'Tell us your goal — we’ll *arrange* the rest', about:'‘Erkak’ means ‘man’ in Uzbek. A worldwide men’s wellness ecosystem: sport, health, recovery and adventure. Programs are run by vetted partners, and we look after you from your first request to your return home.',
    dirs:'Disciplines', places:'Destinations', allPlaces:'All destinations', contact:'Contact', note:'Prices in USD and THB are indicative; the final price is in your confirmation. ERKAK is a concierge, not a medical provider.', tat:'TAT License No. {n}' },
  hub:{ lede:'Muay Thai, check-ups, mountains, ocean and trophy fishing. One English-speaking concierge, from request to return home.',
    dirsTitle:'{n} disciplines of *men’s wellness*', topLede:'Starting prices as of {date}, flights excluded. Most requested first.', count:'Showing {n} of {m}' },
  meta:{ dirTitle:'{name} for men — {np} worldwide | ERKAK', dirDesc:'{short} {np}, an English-speaking concierge and vetted partners.',
    progTitle:'{title} — {where}, from {price} | ERKAK', progDesc:'{short} {dur}. From {price}. English-speaking concierge, vetted partners, early access.',
    tourTitle:'{title} — fishing trip, {where}, from {price} | ERKAK', tourDesc:'{short} {dur}, {group}. From {price}. Licensed guide, transfers, tackle and insurance.',
    destTitle:'{title} | ERKAK', destDesc:'{name}: {np} for men — sport, health, recovery and adventure. English-speaking concierge.' },
  prog:{ where:'Where', dur:'Duration', when:'Best time', price:'Price', about:'About the program', plan:'How it runs', stage:'Stage {n}', incl:'What’s included', inclNote:'We confirm the exact inclusions and partners in a proposal for your dates. Flights are not included.',
    best:'Best time to go', bestNote:'We choose dates around the weather, the season and partner availability.', who:'Who it’s for', how:'How it works', combine:'Pairs well with', faq:'Frequently asked questions',
    waitNote:'This discipline is getting ready to launch. Leave a request to get priority on dates, an early-bird price and a program built around your group.', waitCta:'Get early access', more:'More in this *discipline*' },
  quiz:{ back:'Back', next:'Next' },
  fishing:{ segCta:'Tailor it for me', map:{ allowed:'Fishing allowed', banned:'Fishing prohibited', aria:'Andaman Sea map: permitted spots and no-fishing zones', phuket:'PHUKET', thailand:'THAILAND', sea:'ANDAMAN SEA', pier:'CHALONG' } },
  tour:{ group:'Group', format:'Format', why:'Why this format', species:'Target species', day:'How the day runs', incl:'Included', excl:'Not included', where:'Where we fish', upsell:'Add-ons', deposit:'Deposit', cancel:'Cancellation', cancelVal:'free up to 7 days before', cta:'Check availability', relKicker:'Similar formats', relTitle:'You might also *like*' },
  dest:{ programs:'Programs', dirs:'Disciplines', from:'Prices from', live:'Bookable now', seasonKicker:'Season', season:'When to go', accessKicker:'Logistics', access:'Getting there', listKicker:'Programs', listTitle:'{name}: *everything* you can do' },
  faq:{ kicker:'Questions' },
  legal:{ kicker:'Legal', updated:'Last updated' }
};

// Strings for browser scripts
export const client = {
  from:'from', count:'Showing {n} of {m}', sending:'Sending…', quizNext:'Next', quizSend:'Get my plan and price', club:'Club',
  msgHello:'Hello, this is a request from the ERKAK website.', msgProgram:'Program', msgDates:'Dates', msgGuests:'Group size',
  okTitle:'Request received', okText:'A concierge will send you options with dates and prices, within 15 minutes during business hours. The fastest way is to message us directly:',
  failTitle:'One more step', failText:'Send your request by messenger — the text is ready.',
  planSummary:'Multi-program trip', planAdd:'Add to trip', planAdded:'In your trip', planRemove:'Remove from trip',
  livePeak:'peak season for {list}', liveGood:'good for {list}', liveFresh:'freshwater season', liveCalm:'calm seas', liveMonsoon:'monsoon, we fish the weather windows',
  allowed:'Fishing allowed', banned:'Fishing prohibited', spotRun:'Getting there', spotFish:'Species', spotHow:'Method', spotCta:'I want to fish here'
};

export const goals = {
  fit:['Fitness and weight', 'Shed the excess, rebuild strength and stamina'],
  skill:['A new skill', 'Muay Thai, golf, surfing, diving — from scratch or to the next level'],
  health:['Health', 'Check-ups, men’s health, longevity, aesthetics'],
  reset:['Reset', 'Burnout, stress, sleep, alcohol, digital noise'],
  adventure:['Adventure', 'A trophy, a summit, the ocean — a story for life'],
  team:['With friends or your team', 'Men’s trip, corporate offsite, tournament'],
  family:['With your son', 'Time you’ll both remember']
};

export const regions = { th:'Thailand', asia:'Asia and Bali', me:'Middle East, Turkey, Africa', eu:'Europe', cis:'Russia, Caucasus, Central Asia', online:'Online' };
