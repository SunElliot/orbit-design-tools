/* Cross-site (and cross-page) explicit jump-out / bring-back round trips.
   Modeled on SatTools' linkout.js contract: nothing ambient, no storage, no
   broadcast — a round trip exists only when the user clicks an outbound
   "↗" link, and the return bar appears only on that round trip.

   Outbound side:  <a data-xtarget="<absolute tool URL>"
                      data-xmap="homeFieldId:outputKey,homeFieldId2:outputKey2">↗ Tool</a>
     xlink.js composes the href at load time, appending ?xback=<this page>&xmap=...

   Target side:    the tool page calls XLink.update({outputKey: value, ...})
     at the end of its compute(); if the page was opened with xback/xmap, a
     sticky return bar shows the mapped values and, on click, navigates back
     to xback with ?xapply=field:value,... — a direct visit shows nothing.

   Home side:      XLink.consumeApply() fills the fields, fires input events
     (so compute() reruns), and strips the params via history.replaceState. */
(function(){
  const q = new URLSearchParams(location.search);
  const OK_BACK = /^https:\/\/sunelliot\.github\.io\//;
  function tr(en, zh){ return window.t ? window.t(en, zh) : en; }

  function initOutLinks(){
    document.querySelectorAll('a[data-xtarget]').forEach(a=>{
      try{
        const u = new URL(a.dataset.xtarget);
        u.searchParams.set('xback', location.origin + location.pathname);
        u.searchParams.set('xmap', a.dataset.xmap || '');
        a.href = u.toString();
      }catch(e){}
    });
  }

  let bar = null, mapPairs = null, backUrl = null;
  const vals = {};
  function render(){
    if(!bar || !mapPairs) return;
    const shown = mapPairs
      .map(p => vals[p[1]] !== undefined ? (p[0] + ' = ' + vals[p[1]]) : null)
      .filter(Boolean).join(' · ');
    bar.textContent = '← ' + tr('Use these values in the page you came from','把结果带回来源页面') + (shown ? ('　' + shown) : '');
  }
  function initReturnBar(){
    backUrl = q.get('xback');
    const map = q.get('xmap');
    if(!backUrl || !map) return;
    if(!OK_BACK.test(backUrl)) return;               // same publisher only
    mapPairs = map.split(',').map(s=>s.split(':')).filter(p=>p.length===2);
    if(!mapPairs.length) return;
    bar = document.createElement('div');
    bar.style.cssText = 'position:sticky;top:0;z-index:99;background:#16a34a;color:#fff;'+
      'padding:10px 16px;font-size:.9rem;font-weight:600;cursor:pointer;text-align:center;'+
      'box-shadow:0 2px 6px rgba(0,0,0,.15)';
    bar.addEventListener('click', ()=>{
      const parts = [];
      mapPairs.forEach(p=>{ if(vals[p[1]] !== undefined) parts.push(p[0] + ':' + vals[p[1]]); });
      if(!parts.length) return;
      const u = new URL(backUrl);
      u.searchParams.set('xapply', parts.join(','));
      location.href = u.toString();
    });
    document.body.prepend(bar);
    render();
  }
  function update(obj){
    for(const k in obj){
      const v = Number(obj[k]);
      if(isFinite(v)) vals[k] = Number(v.toPrecision(5));
    }
    render();
  }

  function consumeApply(){
    const ap = q.get('xapply');
    if(!ap) return;
    ap.split(',').forEach(pair=>{
      const ix = pair.indexOf(':');
      if(ix < 0) return;
      const el = document.getElementById(pair.slice(0, ix));
      const v = pair.slice(ix + 1);
      if(el && v !== ''){
        el.value = v;
        el.dispatchEvent(new Event('input', {bubbles:true}));
      }
    });
    const u = new URL(location.href);
    u.searchParams.delete('xapply');
    history.replaceState(null, '', u.toString());
  }

  window.XLink = { initOutLinks, initReturnBar, update, consumeApply };
  document.addEventListener('DOMContentLoaded', function(){
    initOutLinks(); initReturnBar(); consumeApply();
  });
})();
