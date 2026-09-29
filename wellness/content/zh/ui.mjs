// ERKAK · 简体中文 · 界面、单位、浏览器字符串、目标、地区。
export const meta = {
  code:'zh', name:'简体中文', locale:'zh-CN', htmlLang:'zh-Hans', hreflang:'zh-Hans', ogLocale:'zh_CN', dir:'ltr',
  currency:'CNY', messengers:['whatsapp', 'telegram'],
  preload:[]
};

export const units = {
  h:{ other:'小时' },
  d:{ other:'天' },
  w:{ other:'周' },
  night:{ other:'晚' },
  lesson:{ other:'节课' },
  visit:{ other:'次' },
  session:{ other:'次咨询' }
};
export const nouns = {
  angler:{ other:'位钓手' },
  guest:{ other:'位宾客' },
  program:{ other:'个项目' }
};

export const ui = {
  pay:{ cta:'刷卡支付 {p}% 定金', note:'通过 Stripe 安全支付，尾款在出海当天支付。', doneTitle:'定金已收到', doneText:'谢谢！工作时间内，礼宾顾问会在 15 分钟内确认日期并发送行程细节。', doneBack:'返回海钓' },
  time:{ min:'{n} 分钟', h:'{n} 小时' },
  from:'起价', allYear:'全年', notFound:'页面不存在',
  suggest:['本站提供简体中文版', '切换'],
  brand:{ tag:'男士健康 · 全球' },
  a11y:{ skip:'跳到正文', nav:'主导航', crumbs:'面包屑导航', langCur:'语言和货币', lang:'语言', cur:'货币', menu:'菜单', close:'关闭' },
  nav:{ home:'首页', dirs:'方向', top:'100 个项目', fishing:'海钓', places:'目的地', guides:'指南', club:'俱乐部', about:'关于我们', visa:'签证协助', terms:'服务条款', privacy:'隐私政策', all:'全部方向' },
  cta:{ pick:'为我挑选项目', pickTour:'为我挑选行程', ask:'咨询礼宾顾问' },
  tag:{ hot:'热门', live:'开放预订', soon:'预约登记', lux:'高端' },
  per:{ boat:'每船', person:'每人', group:'整个项目', pair:'双人', implant:'每颗种植牙', set:'每套' },
  group:{ upto:'最多 {n} {noun}', range:'{a}–{b} {noun}' },
  plan:{ add:'加入行程', title:'我的行程', kicker:'行程', empty:'点击“加入行程”添加项目，我们会把它们整合成一次旅行，统一结算。', total:'参考价', send:'发送给礼宾顾问' },
  dir:{ open:'查看', kickerLive:'方向 · 开放预订', kickerSoon:'方向 · 预约登记', programs:'项目数', from:'起价', where:'地点', status:'状态', see:'查看 {n} 个项目',
    listKicker:'项目', listTitle:'选择*适合您的形式*', inclKicker:'ERKAK 标准', inclTitle:'*始终包含*的服务', inclLede:'具体内容以按您的日期出具的方案为准。不含机票，我们可以协助挑选航班。',
    placesKicker:'目的地', placesTitle:'*项目*在哪里进行', guidesTitle:'*出发前*必读', othersKicker:'ERKAK 生态', othersTitle:'其他*方向*' },
  guides:{ kicker:'指南', by:'ERKAK 编辑部', updated:'更新于', toc:'目录', disclaimer:'价格和规定依据更新日期时的公开资料整理，可能发生变化。本文不构成医疗或法律建议。', relKicker:'相关项目', relTitle:'准备好*出发*了吗？' },
  form:{ name:'称呼', namePh:'怎么称呼您', date:'出行日期', datePh:'例如：2027 年 1 月', guests:'人数', guestsPh:'几位出行', contact:'WhatsApp、Telegram 或电话', contactPh:'@username 或 +86…', send:'提交需求',
    consent:'点击按钮即表示您同意[隐私政策]({privacy})。我们不会发送垃圾信息。' },
  foot:{ title:'告诉我们目标，*其余由我们安排*', about:'“Erkak”在乌兹别克语中意为“男人”。ERKAK 是全球男士健康生态，涵盖运动、健康管理、身心恢复与探险。项目由严选合作伙伴执行，从提交需求到您回到家中，我们全程陪伴。',
    dirs:'方向', places:'目的地', allPlaces:'全部目的地', contact:'联系方式', note:'价格为美元和泰铢参考价，最终以确认单为准。ERKAK 是礼宾服务机构，不是医疗机构。', tat:'TAT 执照编号 {n}' },
  hub:{ lede:'泰拳、体检、登山、海洋与大物海钓。一位礼宾顾问全程负责，从提交需求到您回到家中。',
    dirsTitle:'{n} 个*男士健康*方向', topLede:'起价参照 {date}的市场价格，不含机票。热门项目优先。', count:'显示 {n} 个，共 {m} 个' },
  meta:{ dirTitle:'{name}：全球 {n} 个男士项目 | ERKAK', dirDesc:'{short}共 {n} 个项目，英文礼宾服务，严选合作伙伴。',
    progTitle:'{title} · {where} · 起价 {price} | ERKAK', progDesc:'{short}时长 {dur}。起价 {price}。英文礼宾服务，严选合作伙伴，现可预约登记。',
    tourTitle:'{title}：{where}钓鱼，起价 {price} | ERKAK', tourDesc:'{short}时长 {dur}，{group}。起价 {price}。含持证向导、接送、钓具和保险。',
    destTitle:'{title} | ERKAK', destDesc:'{name}：{n} 个男士项目，涵盖运动、健康管理、身心恢复与探险。英文礼宾服务。' },
  prog:{ fly:'抵达', flyVal:'{a} · 距目的地约 {t}', where:'地点', dur:'时长', when:'最佳时间', price:'价格', about:'项目介绍', plan:'行程安排', stage:'第 {n} 阶段', incl:'包含内容', inclNote:'具体内容和合作方以按您的日期出具的方案为准。不含机票。',
    best:'最佳时间', bestNote:'我们会根据天气、季节和合作方档期安排日期。', who:'适合人群', how:'服务流程', combine:'可以搭配', faq:'常见问题',
    waitNote:'该方向正在筹备上线。现在提交需求，可优先选择日期、享受早鸟价，并获得为您团队定制的项目。', waitCta:'优先登记', more:'该*方向*的更多项目' },
  quiz:{ back:'上一步', next:'下一步' },
  fishing:{ segCta:'定制我的方案', map:{ allowed:'允许垂钓', banned:'禁止垂钓', aria:'安达曼海示意图：合法钓点与禁钓区', phuket:'普吉岛', thailand:'泰国', sea:'安达曼海', pier:'查龙码头' } },
  tour:{ group:'人数', format:'形式', why:'为什么选这种形式', species:'目标鱼种', day:'当天安排', incl:'费用包含', excl:'费用不含', where:'钓点', upsell:'可加选', deposit:'预付款', cancel:'取消政策', cancelVal:'提前 7 天免费取消', cta:'查询档期', relKicker:'相似行程', relTitle:'这些*也可能适合您*' },
  dest:{ programs:'项目数', dirs:'方向数', from:'起价', live:'现可预订', seasonKicker:'季节', season:'何时前往', accessKicker:'交通', access:'如何抵达', listKicker:'项目', listTitle:'{name}：*可以体验的一切*' },
  faq:{ kicker:'常见问题' },
  legal:{ kicker:'法律文件', updated:'版本日期' }
};

// 浏览器脚本使用的字符串
export const client = {
  from:'起价', count:'显示 {n} 个，共 {m} 个', sending:'正在发送…', quizNext:'下一步', quizSend:'获取方案和报价', club:'俱乐部',
  msgHello:'您好，这是来自 ERKAK 网站的咨询。', msgProgram:'项目', msgDates:'日期', msgGuests:'人数',
  okTitle:'已收到您的需求', okText:'礼宾顾问会用英文发来附日期和价格的方案，工作时间内 15 分钟回复。最快的方式是直接给我们发消息：',
  failTitle:'还差一步', failText:'请通过 WhatsApp 或 Telegram 发送需求，内容已为您填好。',
  planSummary:'多项目组合行程', planAdd:'加入行程', planAdded:'已加入行程', planRemove:'从行程中移除',
  livePeak:'{list}正值旺季', liveGood:'可钓{list}', liveFresh:'淡水垂钓季', liveCalm:'海况平稳', liveMonsoon:'季风期，择机出海',
  allowed:'允许垂钓', banned:'禁止垂钓', spotRun:'航程', spotFish:'鱼种', spotHow:'钓法', spotCta:'我想去这里',
  payCancel:'支付未完成或已取消。您也可以提交需求，礼宾顾问会发送支付链接。', consentText:'是否允许分析类 Cookie？它们帮助我们了解网站哪里需要改进。', consentOk:'允许', consentNo:'暂不', consentLink:'Cookie 设置'
};

export const goals = {
  fit:['体型与体重', '减掉多余体重，找回力量与耐力'],
  skill:['新技能', '泰拳、高尔夫、冲浪、潜水：从零开始，或更上一层楼'],
  health:['健康', '体检、男性健康、健康长寿、医美'],
  reset:['身心重启', '倦怠、压力、睡眠、酒精、数字噪音'],
  adventure:['探险', '大鱼、登顶、远洋：值得讲一辈子的故事'],
  team:['与朋友或团队同行', '男士出行、企业团建、比赛'],
  family:['与儿子同行', '父子俩都会记住的时光']
};

export const regions = { th:'泰国', asia:'亚洲与巴厘岛', me:'中东、土耳其与非洲', eu:'欧洲', cis:'俄罗斯、高加索与中亚', online:'线上' };
