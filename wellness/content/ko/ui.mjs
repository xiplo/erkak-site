// ERKAK · 한국어 · 인터페이스, 단위, 브라우저 문자열, 목표, 지역.
export const meta = {
  code:'ko', name:'한국어', locale:'ko-KR', htmlLang:'ko', hreflang:'ko', ogLocale:'ko_KR', dir:'ltr',
  currency:'KRW', messengers:['whatsapp', 'telegram'],
  preload:[]
};

export const units = {
  h:{ other:'시간' },
  d:{ other:'일' },
  w:{ other:'주' },
  night:{ other:'박' },
  lesson:{ other:'회 레슨' },
  visit:{ other:'회 방문' },
  session:{ other:'회 세션' }
};
export const nouns = {
  spot:{ other:'개 포인트' },
  angler:{ other:'명' },
  guest:{ other:'명' },
  program:{ other:'개 프로그램' }
};

export const ui = {
  fishmap:{ aria:'태국 지도: 낚시 구역과 포인트' },
  pay:{ cta:'카드로 {p}% 선금 결제', note:'Stripe를 통한 안전한 결제입니다. 잔금은 출항 당일에 결제합니다.', doneTitle:'선금이 결제되었습니다', doneText:'감사합니다. 업무 시간에는 15분 이내에 컨시어지가 날짜를 확정하고 일정 세부 사항을 보내 드립니다.', doneBack:'낚시 페이지로 돌아가기' },
  time:{ min:'{n}분', h:'{n}시간' },
  from:'최저', allYear:'연중', notFound:'페이지를 찾을 수 없습니다',
  suggest:['이 사이트는 한국어로도 제공됩니다', '전환'],
  brand:{ tag:'남성 웰니스 · 전 세계' },
  a11y:{ skip:'본문으로 건너뛰기', nav:'메뉴', crumbs:'현재 위치', langCur:'언어 및 통화', lang:'언어', cur:'통화', menu:'메뉴', close:'닫기' },
  nav:{ home:'홈', dirs:'분야', top:'프로그램 100선', fishing:'낚시', places:'여행지', guides:'가이드', club:'클럽', about:'회사 소개', visa:'비자 지원', terms:'이용약관', privacy:'개인정보처리방침', all:'ERKAK 전체' },
  cta:{ pick:'프로그램 추천받기', pickTour:'투어 추천받기', ask:'컨시어지와 상담하기' },
  tag:{ hot:'인기', live:'예약 가능', soon:'사전 신청', lux:'프리미엄' },
  per:{ boat:'보트당', person:'1인당', group:'프로그램당', pair:'2인 기준', implant:'임플란트 1개당', set:'세트당' },
  group:{ upto:'최대 {n}{noun}', range:'{a}–{b}{noun}' },
  plan:{ add:'내 여행에 추가', title:'내 여행', kicker:'여행 일정', empty:'“내 여행에 추가” 버튼으로 프로그램을 담아 주세요. 하나의 여행과 하나의 청구서로 묶어 드립니다.', total:'예상 금액', send:'컨시어지에게 보내기' },
  dir:{ open:'열기', kickerLive:'분야 · 예약 가능', kickerSoon:'분야 · 사전 신청', programs:'프로그램', from:'최저가', where:'장소', status:'상태', see:'프로그램 {n}개 보기',
    listKicker:'프로그램', listTitle:'*형식*을 선택하세요', inclKicker:'ERKAK 스탠더드', inclTitle:'*항상* 포함되는 것', inclLede:'정확한 포함 내역은 희망 날짜에 맞춘 제안서에서 확정합니다. 항공권은 포함되지 않지만 알맞은 항공편을 찾도록 도와 드립니다.',
    placesKicker:'지역', placesTitle:'*프로그램*이 진행되는 곳', guidesTitle:'*떠나기 전에* 읽어 보세요', othersKicker:'에코시스템', othersTitle:'다른 *분야*' },
  guides:{ kicker:'가이드', by:'ERKAK 편집팀', updated:'업데이트', toc:'목차', disclaimer:'가격과 규정은 업데이트 날짜 기준 공개 자료를 바탕으로 하며 변경될 수 있습니다. 이 글은 의료 또는 법률 자문이 아닙니다.', relKicker:'관련 프로그램', relTitle:'*떠날* 준비가 되셨나요?' },
  form:{ name:'이름', namePh:'어떻게 불러 드릴까요?', date:'날짜', datePh:'예: 2027년 1월', guests:'인원', guestsPh:'몇 명인가요?', contact:'WhatsApp, Telegram 또는 전화번호', contactPh:'@username 또는 +82…', send:'요청 보내기',
    consent:'버튼을 누르면 [개인정보처리방침]({privacy})에 동의하게 됩니다. 스팸은 보내지 않습니다.' },
  foot:{ title:'목표만 알려 주세요. 나머지는 저희가 *준비합니다*', about:'“Erkak”은 우즈베크어로 “남자”라는 뜻입니다. 스포츠, 건강, 회복, 모험을 아우르는 글로벌 남성 웰니스 에코시스템입니다. 프로그램은 검증된 파트너가 진행하며, 저희는 첫 요청부터 귀국까지 함께합니다.',
    dirs:'분야', places:'여행지', allPlaces:'전체 여행지', contact:'연락처', note:'USD 및 THB 가격은 참고용이며 최종 금액은 확정서에 기재됩니다. ERKAK은 컨시어지이며 의료 기관이 아닙니다.', tat:'TAT 라이선스 번호 {n}' },
  hub:{ lede:'무에타이, 건강검진, 산, 바다, 트로피 낚시. 영어 컨시어지 한 명이 요청부터 귀국까지 모두 맡습니다.',
    dirsTitle:'*남성 웰니스* {n}개 분야', topLede:'{date} 기준 최저가, 항공권 제외. 인기 프로그램부터 보여 드립니다.', count:'{m}개 중 {n}개 표시' },
  meta:{ dirTitle:'남성을 위한 {name} — 전 세계 {n}개 프로그램 | ERKAK', dirDesc:'{short} 프로그램 {n}개, 영어 컨시어지, 검증된 파트너.',
    progTitle:'{title} — {where}, {price}부터 | ERKAK', progDesc:'{short} {dur}. {price}부터. 영어 컨시어지, 검증된 파트너, 사전 신청 가능.',
    tourTitle:'{title} — {where} 낚시, {price}부터 | ERKAK', tourDesc:'{short} {dur}, {group}. {price}부터. 면허 가이드, 픽업, 장비, 보험 포함.',
    destTitle:'{title} | ERKAK', destDesc:'{name}: 남성을 위한 프로그램 {n}개 — 스포츠, 건강, 회복, 모험. 영어 컨시어지.' },
  prog:{ fly:'도착', flyVal:'{a} · 현지까지 약 {t}', where:'장소', dur:'기간', when:'추천 시기', price:'가격', about:'프로그램 소개', plan:'진행 방식', stage:'{n}단계', incl:'포함 사항', inclNote:'정확한 포함 내역과 파트너는 희망 날짜에 맞춘 제안서에서 확정합니다. 항공권은 포함되지 않습니다.',
    best:'추천 시기', bestNote:'날씨, 시즌, 파트너 일정에 맞춰 날짜를 정합니다.', who:'이런 분께 맞습니다', how:'진행 절차', combine:'함께하기 좋은 프로그램', faq:'자주 묻는 질문',
    waitNote:'이 분야는 오픈을 준비하고 있습니다. 지금 요청을 남기시면 날짜 우선 배정, 얼리버드 가격, 그룹 맞춤 프로그램을 받으실 수 있습니다.', waitCta:'먼저 신청하기', more:'이 *분야*의 다른 프로그램' },
  quiz:{ back:'이전', next:'다음' },
  fishing:{ segCta:'나에게 맞게 구성하기', map:{ allowed:'낚시 허용', banned:'낚시 금지', aria:'안다만해 지도: 허용 포인트와 낚시 금지 구역', phuket:'푸켓', thailand:'태국', sea:'안다만해', pier:'찰롱' } },
  tour:{ group:'인원', format:'형식', why:'이 형식을 권하는 이유', species:'대상 어종', day:'하루 일정', incl:'포함', excl:'불포함', where:'낚시 장소', upsell:'추가 옵션', deposit:'선금', cancel:'취소', cancelVal:'7일 전까지 무료', cta:'날짜 확인하기', relKicker:'비슷한 형식', relTitle:'이런 투어도 *어울립니다*' },
  dest:{ programs:'프로그램', dirs:'분야', from:'최저가', live:'지금 예약 가능', seasonKicker:'시즌', season:'언제 가면 좋을까', accessKicker:'교통', access:'가는 방법', listKicker:'프로그램', listTitle:'{name}에서 할 수 있는 *모든 것*' },
  faq:{ kicker:'질문' },
  legal:{ kicker:'법적 고지', updated:'최종 수정일' }
};

// 브라우저 스크립트용 문자열
export const client = {
  from:'최저', count:'{m}개 중 {n}개 표시', sending:'보내는 중…', quizNext:'다음', quizSend:'플랜과 가격 받기', club:'클럽',
  msgHello:'안녕하세요. ERKAK 웹사이트에서 보내는 요청입니다.', msgProgram:'프로그램', msgDates:'날짜', msgGuests:'인원',
  okTitle:'요청을 받았습니다', okText:'컨시어지가 날짜와 가격이 담긴 옵션을 영어로 보내 드립니다. 업무 시간에는 15분 이내에 답변합니다. 가장 빠른 방법은 직접 메시지를 보내는 것입니다:',
  failTitle:'한 단계만 남았습니다', failText:'메신저로 요청을 보내 주세요. 내용은 이미 준비되어 있습니다.',
  planSummary:'여러 프로그램으로 구성한 여행', planAdd:'내 여행에 추가', planAdded:'내 여행에 담김', planRemove:'내 여행에서 빼기',
  livePeak:'{list} 성수기', liveGood:'{list} 입질이 좋은 시기', liveFresh:'민물낚시 시즌', liveCalm:'바다가 잔잔함', liveMonsoon:'몬순 시기, 날씨가 좋은 날에 출항',
  allowed:'낚시 허용', banned:'낚시 금지', spotRun:'이동 시간', spotFish:'어종', spotHow:'낚시 방법', spotCta:'여기로 가고 싶어요',
  payCancel:'결제가 완료되지 않았거나 취소되었습니다. 대신 요청을 보내 주시면 컨시어지가 결제 링크를 보내 드립니다.', consentText:'분석용 쿠키를 허용하시겠습니까? 사이트 개선에 도움이 됩니다.', consentOk:'허용', consentNo:'나중에', consentLink:'쿠키 설정'
};

export const goals = {
  fit:['체형과 체중', '군살을 빼고 근력과 지구력을 되찾습니다'],
  skill:['새로운 기술', '무에타이, 골프, 서핑, 다이빙 — 처음부터 또는 한 단계 위로'],
  health:['건강', '건강검진, 남성 건강, 장수, 에스테틱'],
  reset:['리셋', '번아웃, 스트레스, 수면, 음주, 디지털 소음'],
  adventure:['모험', '트로피, 정상, 바다 — 평생 남을 이야기'],
  team:['친구나 팀과 함께', '남자들의 여행, 기업 워크숍, 토너먼트'],
  family:['아들과 함께', '두 사람 모두 기억할 시간']
};

export const regions = { th:'태국', asia:'아시아와 발리', me:'중동, 튀르키예, 아프리카', eu:'유럽', cis:'러시아, 캅카스, 중앙아시아', online:'온라인' };
