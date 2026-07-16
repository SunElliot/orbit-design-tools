/* OrbitTools EN/中文 language switch.
   Walks static text nodes and swaps any whose English text is in DICT.
   Units/abbreviations (km, deg, Δv, RAAN…) are intentionally left as symbols.
   Long SEO articles, footers and dynamically-generated results use t()/en-only/zh-only. */
(function(){
  const DICT = {
    // ---- page titles (h1) ----
    "🪐 Orbit Basics Calculator":"🪐 轨道基础参数计算器",
    "☀️ Sun-Synchronous Orbit Designer":"☀️ 太阳同步轨道设计器",
    "🔁 Repeat Ground Track Orbit Designer":"🔁 回归轨道设计器",
    "🌍 J2 Perturbations Calculator":"🌍 J2 摄动计算器",
    "🗺️ Satellite Coverage & Swath Calculator":"🗺️ 卫星覆盖与幅宽计算器",
    "🌗 Solar Beta Angle & Eclipse Calculator":"🌗 太阳 β 角与阴影计算器",
    "⏳ Orbit Lifetime & Drag Decay Calculator":"⏳ 轨道寿命与阻力衰降计算器",
    "🔥 Orbital Maneuver Δv Calculator":"🔥 轨道机动 Δv 计算器",
    "✨ Walker Constellation Designer":"✨ Walker 星座设计器",
    "📚 Astrodynamic Constants & Typical Orbits":"📚 天体动力学常数与典型轨道",
    // ---- subtitles (header p) ----
    "Semi-major axis · eccentricity · period · velocities · energy from perigee/apogee altitude":"由近/远地点高度求半长轴 · 偏心率 · 周期 · 速度 · 能量",
    "Required inclination vs altitude · nodal precession · period · ground-track shift":"倾角-高度关系 · 交点进动 · 周期 · 地面轨迹移动",
    "Ground-track shift · exact R revs / D days repeat altitude · J2 included":"地面轨迹移动 · 精确 R 圈 / D 天回归高度 · 含 J2",
    "Nodal regression · apsidal rotation · nodal period · critical inclination & SSO checks":"交点退行 · 拱线旋转 · 交点周期 · 临界倾角与太阳同步检查",
    "Swath width · Earth central angle · footprint area · slant range · nadir angle":"幅宽 · 地心角 · 足迹面积 · 斜距 · 星下点偏角",
    "Beta angle · eclipse fraction & duration per orbit · full-year evolution with J2 node drift":"β 角 · 每圈阴影比例与时长 · 含 J2 交点漂移的全年演化",
    "Drag decay integration · lifetime estimate · drag make-up Δv · 25-year rule check":"阻力衰降积分 · 寿命估算 · 阻力补偿 Δv · 25 年规则检查",
    "Hohmann transfer · combined plane change · pure inclination change · phasing":"霍曼转移 · 合并改平面 · 纯倾角改变 · 相位机动",
    "Walker delta i:T/P/F — plane & in-plane spacing, phasing, per-satellite elements":"Walker delta i:T/P/F —— 面间/面内间隔、相位、逐星根数",
    "Earth constants for orbit design · typical orbit quick reference":"轨道设计用地球常数 · 典型轨道速查",
    // ---- card / section titles ----
    "Inputs":"输入","Results":"结果","📖 How to use":"📖 使用说明",
    "SSO Inclination vs Altitude":"太阳同步倾角 vs 高度",
    "Current Orbit":"当前轨道","Ground-Track Analysis":"地面轨迹分析","Repeat Solver":"回归求解器",
    "Secular Rates (J2)":"长期变化率（J2）",
    "Orbit & Date":"轨道与日期","Results (at date)":"结果（当日）",
    "One-Year Evolution — β (green) & eclipse minutes (blue)":"全年演化 —— β 角（绿）与每圈阴影分钟数（蓝）",
    "Spacecraft & Orbit":"航天器与轨道","Altitude vs Time":"高度 vs 时间",
    "Hohmann Transfer":"霍曼转移","Pure Plane Change":"纯改平面","Phasing Maneuver":"相位机动",
    "Walker Pattern":"Walker 构型","Pattern Properties":"构型特性","Per-Satellite Elements":"逐星根数",
    "Earth & Time Constants":"地球与时间常数","Typical Orbits":"典型轨道",
    // ---- article headings ----
    "Two-body orbit equations":"二体轨道公式",
    "The sun-synchronous condition":"太阳同步条件",
    "Repeat ground track condition":"回归轨道条件",
    "J2 secular rates":"J2 长期变化率",
    "Coverage geometry":"覆盖几何",
    "Beta angle and eclipse model":"β 角与阴影模型",
    "Drag decay model":"阻力衰减模型",
    "Maneuver equations":"机动公式",
    "Walker delta patterns":"Walker 星座构型",
    "Notes":"说明",
    // ---- input labels ----
    "Perigee altitude":"近地点高度","Apogee altitude":"远地点高度","Orbit altitude":"轨道高度",
    "Eccentricity":"偏心率","Inclination":"轨道倾角","Inclination mode":"倾角模式",
    "Revolutions R":"圈数 R","Repeat cycle D":"回归周期 D",
    "Orbit type":"轨道类型","RAAN Ω":"升交点赤经 Ω","LTAN":"降交点/升交点地方时 LTAN","Date":"日期",
    "Spacecraft mass":"航天器质量","Drag area":"阻力面积","Drag coefficient C_d":"阻力系数 C_d",
    "Solar activity":"太阳活动","Initial altitude":"初始高度",
    "Start altitude":"起始高度","Target altitude":"目标高度","Plane change Δi":"平面改变 Δi",
    "Inclination change Δi":"倾角改变 Δi","Phase shift Δφ":"相位偏移 Δφ","Phasing revolutions":"相位机动圈数",
    "Total satellites T":"卫星总数 T","Planes P":"轨道面数 P","Phasing factor F":"相位因子 F",
    "Min elevation ε":"最低仰角 ε","Constrain by":"限制条件",
    "Half-cone angle η":"半锥角 η",
    // ---- select options ----
    "Sun-synchronous (auto)":"太阳同步（自动）","Fixed inclination":"固定倾角",
    "General (i, RAAN)":"一般轨道（i、Ω）","Sun-synchronous (LTAN)":"太阳同步（LTAN）",
    "Low (F10.7 ≈ 70)":"低（F10.7 ≈ 70）","Moderate (F10.7 ≈ 140)":"中（F10.7 ≈ 140）","High (F10.7 ≈ 210)":"高（F10.7 ≈ 210）",
    "Min ground elevation":"最低地面仰角","Sensor half-cone (off-nadir)":"传感器半锥角（偏离星下点）",
    // ---- hints ----
    "km above surface":"km（地表以上）","km — same value = circular":"km——相等即圆轨道",
    "km, circular":"km，圆轨道","0 for circular, < 0.3":"圆轨道取 0，< 0.3",
    "deg":"度","SSO couples i to altitude":"太阳同步：倾角随高度",
    "total revs in the cycle":"周期内总圈数","days":"天",
    "SSO: node follows the sun":"太阳同步：交点跟随太阳","deg, at the date below":"度，对应下方日期",
    "local time of ascending node, hours":"升交点地方时，小时","start of the 1-year sweep":"一年推演的起始日",
    "kg":"kg","m², average projected":"m²，平均迎风投影","typ. 2.2":"常取 2.2",
    "sets the density model":"决定密度模型","km, circular, 200–1500":"km，圆轨道，200–1500",
    "deg, done at 2nd burn (0 = coplanar)":"度，在第二次点火完成（0 = 共面）",
    "deg along-track, + = move forward":"度（沿迹），+ = 向前","revs spent in the phasing orbit":"在相位轨道飞行的圈数",
    "must divide T":"须整除 T","0 … P−1":"0 … P−1",
    "deg — for the footprint metric":"度——用于足迹指标","what limits the footprint":"由什么限制足迹",
    "deg — user/ground constraint":"度——用户/地面站约束","deg off nadir — payload FOV/2 or max look":"度（偏离星下点）——载荷 FOV/2 或最大侧摆",
    // ---- result metric labels ----
    "Semi-major axis a":"半长轴 a","Eccentricity e":"偏心率 e","Orbital period":"轨道周期",
    "Mean motion":"平均运动","Perigee velocity":"近地点速度","Apogee velocity":"远地点速度",
    "Escape velocity @ perigee":"近地点逃逸速度","Specific energy":"比能量","Angular momentum h":"角动量 h",
    "SSO inclination":"太阳同步倾角","Nodal precession":"交点进动","Nodal period":"交点周期",
    "Ground-track shift / rev":"每圈轨迹西移","Equator spacing / rev":"每圈赤道间距",
    "Inclination used":"所用倾角","Revs per nodal day":"每交点日圈数",
    "Nodal regression Ω̇":"交点退行 Ω̇","Apsidal rotation ω̇":"拱线旋转 ω̇","Mean anomaly drift ΔṀ":"平近点角漂移 ΔṀ",
    "Node full turn":"交点转一周","Perigee full turn":"近地点转一周","Keplerian period":"开普勒周期",
    "Anomalistic period":"近点周期",
    "Earth central angle λ":"地心角 λ","Swath width":"幅宽","Footprint area":"足迹面积",
    "Fraction of Earth":"占地球表面","Slant range @ edge":"边缘斜距","Nadir angle @ edge":"边缘星下点偏角",
    "Elevation @ edge":"边缘仰角","Horizon limit λ_max":"地平线极限 λ_max","Sats for equatorial ring":"赤道环所需卫星数",
    "Beta angle β":"β 角","Eclipse threshold β*":"阴影阈值 β*","Eclipse fraction":"阴影比例",
    "Eclipse duration":"阴影时长","Sunlit time / orbit":"每圈光照时间","Max |β| over year":"全年最大 |β|",
    "Max eclipse over year":"全年最长阴影","Eclipse-free days / year":"全年无阴影天数",
    "Ballistic coefficient":"弹道系数","Density @ altitude":"该高度大气密度","Initial decay rate":"初始衰降速率",
    "Estimated lifetime":"估计寿命","Drag make-up Δv":"阻力补偿 Δv","25-year rule":"25 年规则",
    "Burn 1 Δv":"第一次点火 Δv","Burn 2 Δv":"第二次点火 Δv","Total Δv":"总 Δv","Transfer time":"转移时间",
    "Circular velocity":"圆轨道速度","Plane-change Δv":"改平面 Δv",
    "Phasing orbit period":"相位轨道周期","Phasing perigee/apogee":"相位轨道近/远地点",
    "Total Δv (2 burns)":"总 Δv（两次点火）","Time to complete":"完成耗时",
    "Sats per plane":"每面卫星数","RAAN spacing":"面间 RAAN 间隔","In-plane spacing":"面内间隔",
    "Inter-plane phase offset":"面间相位差","Single-sat footprint λ":"单星足迹 λ",
    "Footprint / Earth":"足迹 / 地球","T × footprint / Earth":"T × 足迹 / 地球",
    // ---- preset buttons ----
    "ISS-like 420 km":"类空间站 420 km","SSO 500 km":"太阳同步 500 km",
    "VLEO 350 km":"超低轨 350 km","EO 500 km":"遥感 500 km","EO 700 km":"遥感 700 km","Dawn-dusk 800 km":"晨昏 800 km",
    "SSO 233/16 (Landsat-like)":"太阳同步 233/16（类 Landsat）","SSO 143/10 (Sentinel-2-like)":"太阳同步 143/10（类 Sentinel-2）",
    "51.6° 500 km":"51.6° 500 km","Daily repeat 15/1":"每日回归 15/1",
    "LEO 500 / 51.6°":"LEO 500 / 51.6°","SSO 700 / 98.2°":"太阳同步 700 / 98.2°",
    "Molniya 63.4°":"闪电轨道 63.4°","GPS MEO 55°":"GPS 中轨 55°",
    "Comms 550 km / 25° elev":"通信 550 km / 仰角 25°","EO sensor 700 km / 15° FOV":"遥感 700 km / FOV 15°",
    "SAR 600 km / 35° look":"SAR 600 km / 侧视 35°","GEO / 10° elev":"GEO / 仰角 10°",
    "ISS-like 420 / 51.6°":"类空间站 420 / 51.6°","SSO 10:30 / 700 km":"太阳同步 10:30 / 700 km",
    "SSO dawn-dusk 06:00":"晨昏轨道 06:00","GEO":"GEO",
    "3U CubeSat 500 km":"3U 立方星 500 km","Smallsat 550 km":"小卫星 550 km",
    "VLEO imager 350 km":"超低轨成像 350 km","Microsat 700 km":"微卫星 700 km",
    "Raise 400 → 700 km":"抬升 400 → 700 km","LEO 250 → GEO, Δi 27°":"LEO 250 → GEO，Δi 27°",
    "Plane change 5° @ 550":"改平面 5° @ 550","Phase 30° in 10 revs":"10 圈移相 30°",
    "GPS-like 55°:24/6/1":"类 GPS 55°:24/6/1","Iridium-like 86.4°:66/6/2":"类铱星 86.4°:66/6/2",
    "Broadband 53°:72/9/1":"宽带 53°:72/9/1","Smallsat EO 97.5°:12/3/1":"小卫星遥感 97.5°:12/3/1",
    "GTO 250×35786":"GTO 250×35786","Molniya 600×39750":"闪电 600×39750",
    // ---- gallery home ----
    "Satellite Orbit Design Tools":"卫星轨道设计工具",
    "Free browser-based calculators for LEO smallsat orbit & mission design — no signup, nothing uploaded.":"面向 LEO 小卫星轨道与任务设计的免费在线计算器 — 免注册，数据不上传。",
    "Categories":"分类","All tools":"全部工具","← All tools":"← 全部工具",
    "Orbit Design":"轨道设计","Mission Analysis":"任务分析","Maneuvers":"轨道机动",
    "Constellation":"星座","Reference":"参考",
    "Orbit Basics":"轨道基础","Sun-Synchronous Orbit":"太阳同步轨道","Repeat Ground Track":"回归轨道",
    "J2 Perturbations":"J2 摄动","Coverage & Swath":"覆盖与幅宽","Beta Angle & Eclipse":"β 角与阴影",
    "Orbit Lifetime":"轨道寿命","Δv Budget":"Δv 预算","Walker Constellation":"Walker 星座",
    "Constants & Orbits":"常数与轨道",
    "No tools match your search.":"没有匹配的工具。",
    // ---- gallery card descriptions ----
    "Semi-major axis, eccentricity, period, perigee/apogee velocity and energy from altitudes.":"由高度求半长轴、偏心率、周期、近/远地点速度与能量。",
    "Required SSO inclination vs altitude from the J2 precession condition, with chart.":"由 J2 进动条件求太阳同步倾角-高度关系，含曲线图。",
    "Ground-track shift per rev and the exact altitude for an R revs / D days repeat cycle.":"每圈地面轨迹移动量，及 R 圈 / D 天精确回归的高度。",
    "Secular nodal regression, perigee rotation, nodal period, critical-inclination & SSO checks.":"交点退行、近地点旋转、交点周期，含临界倾角与太阳同步检查。",
    "Swath width, footprint area, slant range and nadir angle from elevation or sensor FOV.":"由仰角或传感器视场求幅宽、足迹面积、斜距与星下点偏角。",
    "Solar beta angle and eclipse duration per orbit, with a full-year J2-drift chart.":"太阳 β 角与每圈阴影时长，含 J2 漂移的全年曲线。",
    "Drag decay integration, lifetime estimate, drag make-up Δv and the 25-year rule check.":"阻力衰降积分、寿命估算、阻力补偿 Δv 与 25 年规则检查。",
    "Hohmann transfer with combined plane change, pure inclination change and phasing Δv.":"霍曼转移（可合并改平面）、纯倾角改变与相位机动 Δv。",
    "Walker delta i:T/P/F — plane spacing, phasing and a per-satellite element table.":"Walker delta i:T/P/F —— 面间隔、相位与逐星根数表。",
    "Earth & time constants plus a typical-orbit quick reference from VLEO to graveyard.":"地球与时间常数，以及从超低轨到坟墓轨道的典型轨道速查。",
    // ---- footers ----
    "OrbitTools · Free satellite orbit design calculators · LEO / SSO / constellation · runs entirely in your browser.":"OrbitTools · 免费卫星轨道设计计算器 · LEO / 太阳同步 / 星座 · 完全在浏览器中运行。",
    "Free orbit basics calculator · period, velocity, elements · nothing leaves your browser.":"免费轨道基础计算器 · 周期、速度、根数 · 数据不上传。",
    "Free sun-synchronous orbit calculator · J2 nodal precession · nothing leaves your browser.":"免费太阳同步轨道计算器 · J2 交点进动 · 数据不上传。",
    "Free repeat ground track designer · J2 nodal period & regression · nothing leaves your browser.":"免费回归轨道设计器 · J2 交点周期与退行 · 数据不上传。",
    "Free J2 perturbation calculator · nodal regression, apsidal rotation · nothing leaves your browser.":"免费 J2 摄动计算器 · 交点退行、拱线旋转 · 数据不上传。",
    "Free satellite coverage calculator · swath, footprint, slant range · nothing leaves your browser.":"免费卫星覆盖计算器 · 幅宽、足迹、斜距 · 数据不上传。",
    "Free beta angle & eclipse calculator · full-year evolution · nothing leaves your browser.":"免费 β 角与阴影计算器 · 全年演化 · 数据不上传。",
    "Free orbit lifetime calculator · drag decay & 25-year rule · nothing leaves your browser.":"免费轨道寿命计算器 · 阻力衰降与 25 年规则 · 数据不上传。",
    "Free orbital maneuver Δv calculator · Hohmann, plane change, phasing · nothing leaves your browser.":"免费轨道机动 Δv 计算器 · 霍曼、改平面、相位 · 数据不上传。",
    "Free Walker constellation designer · i:T/P/F spacing & phasing · nothing leaves your browser.":"免费 Walker 星座设计器 · i:T/P/F 间隔与相位 · 数据不上传。",
    "Astrodynamic constants & typical orbits · quick reference for orbit design.":"天体动力学常数与典型轨道 · 轨道设计速查。"
  };

  let nodes = [];
  function capture(){
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        if(!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = n.parentNode;
        const tag = p && p.nodeName;
        if(tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
        if(p && p.closest && p.closest('.topnav')) return NodeFilter.FILTER_REJECT; // keep nav as-is
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n; while((n = w.nextNode())) nodes.push({ node:n, en:n.nodeValue });
  }
  // dynamic-content helpers used by each calculator's JS
  window.SATLANG = 'en';
  window.t = function(en, zh){ return (window.SATLANG === 'zh' && zh != null) ? zh : en; };
  const langCbs = [];
  window.onLang = function(cb){ langCbs.push(cb); };

  function applyLang(lang){
    window.SATLANG = (lang === 'zh') ? 'zh' : 'en';
    nodes.forEach(({node,en})=>{
      const key = en.trim();
      node.nodeValue = (lang === 'zh' && DICT[key]) ? en.replace(key, DICT[key]) : en;
    });
    document.querySelectorAll('[data-en]').forEach(el=>{
      const html = (lang === 'zh' && el.dataset.zh != null) ? el.dataset.zh : el.dataset.en;
      if(html != null) el.innerHTML = html;
    });
    document.querySelectorAll('[data-ph-en]').forEach(el=>{
      el.placeholder = (lang === 'zh' && el.dataset.phZh != null) ? el.dataset.phZh : el.dataset.phEn;
    });
    document.documentElement.lang = (lang === 'zh' ? 'zh-CN' : 'en');
    document.body.classList.toggle('lang-zh', lang === 'zh');
    document.body.classList.toggle('lang-en', lang !== 'zh');
    if(bEn && bZh){ bEn.classList.toggle('active', lang !== 'zh'); bZh.classList.toggle('active', lang === 'zh'); }
    try{ localStorage.setItem('orbittools_lang', lang); }catch(e){}
    langCbs.forEach(cb=>{ try{ cb(lang); }catch(e){} });
  }
  let bEn, bZh;
  function initToggle(){
    const nav = document.querySelector('.topnav'); if(!nav) return;
    const box = document.createElement('div'); box.className = 'langtoggle';
    bEn = document.createElement('button'); bEn.type='button'; bEn.textContent='EN';
    bZh = document.createElement('button'); bZh.type='button'; bZh.textContent='中文';
    bEn.onclick = ()=>applyLang('en'); bZh.onclick = ()=>applyLang('zh');
    box.appendChild(bEn); box.appendChild(bZh); nav.appendChild(box);
  }
  document.addEventListener('DOMContentLoaded', function(){
    capture(); initToggle();
    let saved = 'en';
    const urlLang = new URLSearchParams(location.search).get('lang');
    if(urlLang === 'zh' || urlLang === 'en') saved = urlLang;
    else { try{ saved = localStorage.getItem('orbittools_lang') || 'en'; }catch(e){} }
    applyLang(saved);
  });
})();
