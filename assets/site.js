/* Site interactions: appear animations, hover/click/timed states, video, hero gradient */
(function () {
  'use strict';
  var D = document;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function J(id, d) { try { return JSON.parse(D.getElementById(id).textContent); } catch (e) { return d; } }
  var data = J('fx-data', { fx: [] });
  var appear = J('__framer__appearAnimationsContent', {});
  var bps = J('__framer__breakpoints', []);

  /* ---------- easing (Framer springs -> CSS linear()) ---------- */
  var linOK = window.CSS && CSS.supports && CSS.supports('animation-timing-function', 'linear(0, 1)');
  function spring(T, z, w) {
    var N = 50, pts = [];
    for (var i = 0; i <= N; i++) {
      var t = T * i / N, x;
      if (z >= 1) x = 1 - (1 + w * t) * Math.exp(-w * t);
      else { var wd = w * Math.sqrt(1 - z * z); x = 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t)); }
      pts.push(+x.toFixed(4));
    }
    pts[N] = 1;
    return 'linear(' + pts.join(',') + ')';
  }
  function timing(tr) {
    if (!tr) return { d: 600, delay: 0, e: 'cubic-bezier(.44,0,.56,1)' };
    var delay = (tr.delay || 0) * 1000;
    if (tr.type === 'spring') {
      var T, z, w;
      if (tr.stiffness != null && tr.duration == null) {
        var k = tr.stiffness, c = tr.damping != null ? tr.damping : 10, m = tr.mass || 1;
        w = Math.sqrt(k / m); z = c / (2 * Math.sqrt(k * m));
        T = z >= 1 ? 7.4 / w : 5.3 / (z * w); T = Math.min(T, 3);
      } else {
        T = tr.duration != null ? tr.duration : 0.6; z = Math.max(0.05, 1 - (tr.bounce || 0));
        w = z >= 1 ? 7.4 / T : 5.3 / (z * T);
      }
      return { d: T * 1000, delay: delay, e: linOK ? spring(T, z, w) : (z < 1 ? 'cubic-bezier(.34,1.3,.64,1)' : 'cubic-bezier(.22,1,.36,1)') };
    }
    var e = Array.isArray(tr.ease) ? 'cubic-bezier(' + tr.ease.join(',') + ')' : (tr.ease === 'linear' ? 'linear' : 'ease');
    return { d: (tr.duration != null ? tr.duration : 0.3) * 1000, delay: delay, e: e };
  }

  /* ---------- appear animations (from Framer's own config) ---------- */
  function px(v) { return typeof v === 'number' ? v + 'px' : v; }
  function tf(o, tpl) {
    var p = [];
    if (o.x || o.y) p.push('translate(' + px(o.x || 0) + ', ' + px(o.y || 0) + ')');
    if (o.scale != null && o.scale !== 1) p.push('scale(' + o.scale + ')');
    if (o.scaleX != null && o.scaleX !== 1) p.push('scaleX(' + o.scaleX + ')');
    if (o.scaleY != null && o.scaleY !== 1) p.push('scaleY(' + o.scaleY + ')');
    if (o.rotate) p.push('rotate(' + o.rotate + 'deg)');
    if (o.rotateX) p.push('perspective(1200px) rotateX(' + o.rotateX + 'deg)');
    if (o.rotateY) p.push('perspective(1200px) rotateY(' + o.rotateY + 'deg)');
    if (o.skewX) p.push('skewX(' + o.skewX + 'deg)');
    if (o.skewY) p.push('skewY(' + o.skewY + 'deg)');
    var s = p.join(' ');
    if (tpl) s = tpl.replace('__Appear_Animation_Transform__', s).trim();
    return s || 'none';
  }
  function pick(c) {
    for (var k in c) {
      if (k === 'default') continue;
      for (var i = 0; i < bps.length; i++) if (bps[i].hash === k && matchMedia(bps[i].mediaQuery).matches) return c[k];
    }
    return c['default'];
  }
  function runAppear(el) {
    if (el.__appeared) return; el.__appeared = true;
    if (!el.hasAttribute('data-framer-appear-id')) { el.style.transition = 'opacity .6s, transform .6s'; el.style.opacity = 1; return; }
    var c = appear[el.getAttribute('data-framer-appear-id')], cfg = c && pick(c);
    if (!cfg) { el.style.transition = 'opacity .6s'; el.style.opacity = 1; return; }
    var ini = cfg.initial || {}, an = cfg.animate || {}, t = timing(an.transition);
    var from = { opacity: ini.opacity != null ? ini.opacity : 1, transform: tf(ini, cfg.transformTemplate) };
    var to = { opacity: an.opacity != null ? an.opacity : 1, transform: tf(an, cfg.transformTemplate) };
    if (reduce || !el.animate) { el.style.opacity = to.opacity; el.style.transform = to.transform; return; }
    var a = el.animate([from, to], { duration: t.d, delay: t.delay, easing: t.e, fill: 'both' });
    a.onfinish = function () { el.style.opacity = to.opacity; el.style.transform = to.transform; a.cancel(); };
  }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); runAppear(en.target); } });
  });
  var appearEls = [].slice.call(D.querySelectorAll('[data-framer-appear-id], [style*="opacity:0.001"]'));
  appearEls.forEach(function (el) {
    // Anything above the bottom of the first screen (including the nav, which
    // starts above the top edge) animates in on load, like Framer does.
    var r = el.getBoundingClientRect();
    if (r.top < innerHeight) runAppear(el); else io.observe(el);
  });

  /* ---------- scroll-in reveals (e.g. the footer) ----------
     Framer marks these with will-change:transform + opacity:0 and fades them in
     once they are in view. Plain opacity:0 layers (like "Copied!") stay hidden. */
  var rio = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target; rio.unobserve(el);
      var fromT = el.style.transform || 'none';
      if (reduce || !el.animate) { el.style.opacity = '1'; el.style.transform = 'none'; return; }
      var a = el.animate([{ opacity: 0, transform: fromT }, { opacity: 1, transform: 'none' }], { duration: 600, easing: 'cubic-bezier(.44,0,.56,1)', fill: 'both' });
      a.onfinish = function () { el.style.opacity = '1'; el.style.transform = 'none'; a.cancel(); };
    });
  }, { threshold: 0.15 });
  D.querySelectorAll('[style*="will-change:transform;opacity:0;"], [style*="will-change: transform; opacity: 0;"]').forEach(function (el) { rio.observe(el); });

  /* ---------- state morphing (hover / click / timed variants) ---------- */
  var LAYER = /^framer-[a-z0-9]{5,8}(-container)?$/;
  function kids(el) {
    var o = [];
    for (var i = 0; i < el.children.length; i++) {
      var c = el.children[i];
      if (c.classList.contains('ssr-variant')) { if (getComputedStyle(c).display !== 'none') o.push.apply(o, kids(c)); }
      else o.push(c);
    }
    return o;
  }
  function sig(c) {
    var l = '';
    for (var i = 0; i < c.classList.length; i++) if (LAYER.test(c.classList[i])) { l = c.classList[i]; break; }
    return c.tagName.toLowerCase() + '|' + l;
  }
  function index(root) {
    var m = new Map(); m.set('', root);
    (function walk(el, p) {
      var cnt = {};
      kids(el).forEach(function (c) { var s = sig(c), n = cnt[s] || 0; cnt[s] = n + 1; var k = p + '/' + s + '|' + n; m.set(k, c); walk(c, k); });
    })(root, '');
    return m;
  }
  var TR = ['background-color', 'color', 'opacity', 'transform', 'box-shadow', 'border-color', 'filter', 'border-radius', 'width', 'height', 'fill', 'stroke']
    .map(function (p) { return p + ' .4s cubic-bezier(.3,1.05,.45,1)'; }).join(', ');
  function enter(node, mode) {
    if (reduce || !node.animate) return;
    if (mode === 'timed') { node.animate([{ opacity: 0.8, scale: '0.98' }, { opacity: 1, scale: '1' }], { duration: 450, easing: 'cubic-bezier(.2,.8,.2,1)' }); return; }
    var leaves = [].filter.call(node.querySelectorAll('*'), function (e) { return !e.children.length && e.textContent.trim().length === 1; });
    if (leaves.length > 4) leaves.forEach(function (l, i) { l.animate([{ opacity: 0, translate: '0 4px' }, { opacity: 1, translate: '0 0' }], { duration: 300, delay: i * 25, easing: 'ease-out', fill: 'backwards' }); });
    else node.animate([{ opacity: 0, scale: '0.6' }, { opacity: 1, scale: '1' }], { duration: 350, easing: 'cubic-bezier(.3,1.3,.5,1)' });
  }
  function morph(root, df, mode) {
    if (!df) return;
    var m = index(root), g = function (k) { return k == null ? null : m.get(k); };
    var adds = (df.add || []).map(function (x) { return [g(x[0]), g(x[1]), x[2]]; });
    var rems = (df.rem || []).map(g);
    (df.c || []).forEach(function (x) { var el = g(x[0]); if (!el) return; x[2].forEach(function (c) { el.classList.remove(c); }); x[1].forEach(function (c) { el.classList.add(c); }); });
    (df.s || []).forEach(function (x) {
      var el = g(x[0]); if (!el) return;
      if (!el.__tr) { el.__tr = 1; var cur = el.style.transition; el.style.transition = cur ? cur + ', ' + TR : TR; }
      var v = x[2];
      if (!v) el.style.removeProperty(x[1]);
      else { var imp = /!important$/.test(v); el.style.setProperty(x[1], v.replace(/\s*!important$/, ''), imp ? 'important' : ''); }
    });
    (df.a || []).forEach(function (x) {
      var el = g(x[0]); if (!el) return;
      if (x[2] == null) el.removeAttribute(x[1]); else el.setAttribute(x[1], x[2]);
      if (mode === 'timed' && el.tagName === 'IMG' && x[1] === 'src') enter(el, mode);
    });
    (df.t || []).forEach(function (x) { var el = g(x[0]); if (el) el.textContent = x[1]; });
    rems.forEach(function (el) { if (el) el.remove(); });
    adds.forEach(function (x) {
      var p = x[0], b = x[1]; if (!p) return;
      var t = D.createElement('template'); t.innerHTML = x[2];
      var node = t.content.firstElementChild; if (!node) return;
      if (b && b.parentNode) b.parentNode.insertBefore(node, b); else p.appendChild(node);
      node.querySelectorAll('video').forEach(setupVideo);
      enter(node, mode);
    });
  }
  function bucket() { var w = innerWidth; return w >= 1280 ? 'd' : w >= 810 ? 't' : 'm'; }
  function copyText(t) {
    if (!t) return;
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(function () {});
    else { var a = D.createElement('textarea'); a.value = t; D.body.appendChild(a); a.select(); try { D.execCommand('copy'); } catch (e) {} a.remove(); }
  }
  var ctl = null, curB = null, timers = [];
  function bind() {
    var b = bucket(); if (b === curB) return; curB = b;
    if (ctl) ctl.abort(); timers.forEach(clearTimeout); timers = [];
    ctl = new AbortController(); var sig2 = { signal: ctl.signal };
    var lists = {};
    function inst(sel) {
      if (!lists[sel]) lists[sel] = [].filter.call(D.querySelectorAll(sel), function (e) { return e.getClientRects().length > 0; });
      return lists[sel];
    }
    (data.fx || []).filter(function (f) { return f.b === b; }).forEach(function (f) {
      var s = f.kind === 'timed' ? f.sel.split('.').slice(0, 2).join('.') : f.sel;
      f.root = inst(s)[f.i];
    });
    (data.fx || []).filter(function (f) { return f.b === b && f.root; }).forEach(function (f) {
      var root = f.root;
      if (f.kind === 'timed') {
        var cur = (root.className.match(/framer-v-[a-z0-9]+/) || [])[0];
        var i = Math.max(0, f.states.findIndex(function (s) { return s.v === cur; }));
        var go = function (n) { morph(root, f.states[i].diff, 'timed'); i = n; schedule(); };
        var schedule = function () { timers.push(setTimeout(function () { go((i + 1) % f.states.length); }, f.states[i].wait || 6000)); };
        schedule();
        return;
      }
      var st = 'D', over = false;
      root.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return; over = true;
        if (st === 'D' && f.dh) { morph(root, f.dh, 'hover'); st = 'H'; }
      }, sig2);
      root.addEventListener('pointerleave', function (e) {
        if (e.pointerType !== 'mouse') return; over = false;
        if (st === 'H' && f.hd) { morph(root, f.hd, 'hover'); st = 'D'; }
      }, sig2);
      if (f.hc || f.dc) root.addEventListener('click', function (e) {
        copyText(f.copy);
        if (f.copy) e.preventDefault();
        if (st === 'C') return;
        if (st === 'H' && f.hc) morph(root, f.hc, 'click');
        else if (st === 'D' && f.dc) morph(root, f.dc, 'click');
        else if (st === 'D' && f.dh && f.hc) { morph(root, f.dh, 'hover'); morph(root, f.hc, 'click'); }
        else return;
        st = 'C';
        timers.push(setTimeout(function () {
          if (over && f.ch) { morph(root, f.ch, 'hover'); st = 'H'; }
          else if (f.cd) { morph(root, f.cd, 'hover'); st = 'D'; }
        }, f.ret || 2400));
      }, sig2);
    });
  }
  bind();
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(bind, 250); });

  /* ---------- videos ----------
     Project cover videos (inside links to case studies) stay static and show
     their cover frame. Videos on the project pages autoplay while in view. */
  var vio = new IntersectionObserver(function (es) {
    es.forEach(function (en) { var v = en.target; if (en.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
  });
  function setupVideo(v) {
    if (v.__setup) return; v.__setup = true;
    v.muted = true; v.playsInline = true; v.setAttribute('playsinline', '');
    var onHome = location.pathname === '/' || /\/index(\.html)?$/.test(location.pathname);
    var cover = onHome && v.closest('a[href^="/clane"],a[href^="/cedar"],a[href^="/salario"],a[href^="/thesiora"]');
    if (cover) {
      v.autoplay = false; v.removeAttribute('autoplay'); v.pause();
      if (!v.getAttribute('poster')) { v.preload = 'auto'; v.addEventListener('loadeddata', function () { try { v.currentTime = 0.01; } catch (e) {} }, { once: true }); }
      return;
    }
    vio.observe(v);
  }
  D.querySelectorAll('video').forEach(setupVideo);

  /* ---------- section nav on project pages (Active / Inactive variants) ---------- */
  (function () {
    var RX = /^(Active|Inactive)(.*)$/;
    var items = [].filter.call(D.querySelectorAll('a[href*="#"][data-framer-name]'), function (a) {
      return RX.test(a.getAttribute('data-framer-name'));
    });
    if (!items.length) return;
    // templates per variant family, e.g. "Active"/"Inactive" and "Active - mobile"/"Inactive - mobile"
    var tpl = {};
    items.forEach(function (a) { var n = a.getAttribute('data-framer-name'); if (!tpl[n]) tpl[n] = a.cloneNode(true); });
    // group items by the nav bar that holds them (closest ancestor containing several items)
    var groups = new Map();
    items.forEach(function (a) {
      var id = decodeURIComponent((a.getAttribute('href').split('#')[1] || ''));
      var target = id && D.getElementById(id); if (!target) return;
      var p = a.parentElement;
      while (p && p !== D.body && items.filter(function (b) { return p.contains(b); }).length < 2) p = p.parentElement;
      var m = a.getAttribute('data-framer-name').match(RX);
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push({ el: a, target: target, text: a.textContent, href: a.getAttribute('href'), suffix: m[2] });
    });
    function render(it, state) {
      var name = state + it.suffix;
      if (it.el.getAttribute('data-framer-name') === name || !tpl[name]) return;
      var n = tpl[name].cloneNode(true);
      // the active pill carries Framer's pre-animation styles; show it in its final state
      n.querySelectorAll('[data-framer-appear-id]').forEach(function (e) {
        e.removeAttribute('data-framer-appear-id'); e.style.opacity = '1'; e.style.transform = 'none';
      });
      n.setAttribute('href', it.href);
      var p = n.querySelector('p') || n; p.textContent = it.text;
      it.el.replaceWith(n); it.el = n; wire(it);
    }
    function pillOf(el) { return el && (el.querySelector('[data-framer-name="Tab BG"]') || el.firstElementChild); }
    function wire(it) {
      it.el.addEventListener('click', function (e) {
        e.preventDefault();
        var y = it.target.getBoundingClientRect().top + scrollY;
        scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
        if (history.replaceState) history.replaceState(null, '', '#' + it.target.id);
      });
    }
    groups.forEach(function (list) { list.forEach(wire); });
    var ticking = false;
    function update() {
      ticking = false;
      groups.forEach(function (list) {
        var cur = 0;
        list.forEach(function (it, i) { if (it.target.getBoundingClientRect().top <= 120) cur = i; });
        var prev = list.filter(function (it) { return /^Active/.test(it.el.getAttribute('data-framer-name')); })[0];
        var from = prev && pillOf(prev.el) ? pillOf(prev.el).getBoundingClientRect() : null;
        list.forEach(function (it, i) { render(it, i === cur ? 'Active' : 'Inactive'); });
        // slide the pill from the previous tab to the new one (Framer's shared layout animation)
        var pill = pillOf(list[cur].el);
        if (from && pill && prev !== list[cur] && !reduce && pill.animate) {
          var to = pill.getBoundingClientRect();
          if (to.width) pill.animate([
            { transformOrigin: '0 50%', transform: 'translateX(' + (from.left - to.left) + 'px) scaleX(' + (from.width / to.width) + ')' },
            { transformOrigin: '0 50%', transform: 'none' }
          ], { duration: 400, easing: linOK ? spring(0.4, 0.8, 5.3 / (0.8 * 0.4)) : 'cubic-bezier(.3,1.2,.5,1)' });
        }
      });
    }
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  })();

  /* ---------- hero "Sky" shader ---------- */
  D.querySelectorAll('[data-framer-component-type="Shader"] canvas').forEach(function (cv) {
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var W = 160, H = 90; cv.width = W; cv.height = H;
    var blobs = [
      { c: '244,196,252', d: '120,60,170', x: .50, y: .05, r: .55, ax: .10, ay: .10, s: .00011, p: 0 },
      { c: '214,196,255', d: '80,60,190', x: .78, y: .25, r: .60, ax: .12, ay: .14, s: .00009, p: 1.7 },
      { c: '196,214,255', d: '50,80,190', x: .95, y: .55, r: .55, ax: .08, ay: .12, s: .00012, p: 3.1 },
      { c: '178,236,255', d: '30,110,170', x: .92, y: .02, r: .45, ax: .10, ay: .08, s: .00010, p: 4.4 },
      { c: '232,206,255', d: '100,60,160', x: .65, y: .70, r: .50, ax: .14, ay: .10, s: .00008, p: 5.3 }
    ];
    var vis = true;
    new IntersectionObserver(function (es) { vis = es[0].isIntersecting; }).observe(cv);
    function draw(t) {
      ctx.globalCompositeOperation = 'source-over';
      var dk = D.documentElement.classList.contains('dark');
      ctx.fillStyle = dk ? '#0b0d10' : '#ffffff'; ctx.fillRect(0, 0, W, H);
      blobs.forEach(function (b) {
        var x = (b.x + Math.sin(t * b.s * 6.283 + b.p) * b.ax) * W;
        var y = (b.y + Math.cos(t * b.s * 6.283 * 0.8 + b.p) * b.ay) * H;
        var r = b.r * W;
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(' + (dk ? b.d : b.c) + ',' + (dk ? 0.55 : 0.95) + ')'); g.addColorStop(1, 'rgba(' + (dk ? b.d : b.c) + ',0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });
    }
    function loop(t) { if (vis) draw(t); if (!reduce) requestAnimationFrame(loop); }
    draw(0); if (!reduce) requestAnimationFrame(loop);
    D.addEventListener('themechange', function () { draw(performance.now()); });
  });
})();

/* ---------- dark mode toggle (top-right button, remembered per visitor) ---------- */
(function () {
  var D = document, root = D.documentElement;
  function save(v) { try { localStorage.setItem('theme', v); } catch (e) {} }
  var b = D.createElement('button');
  b.type = 'button'; b.className = 'theme-toggle';
  b.innerHTML =
    '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>' +
    '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>';
  function sync() {
    var dark = root.classList.contains('dark');
    b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    b.setAttribute('aria-pressed', dark ? 'true' : 'false');
    b.title = dark ? 'Light mode' : 'Dark mode';
  }
  b.addEventListener('click', function () {
    var dark = root.classList.toggle('dark');
    save(dark ? 'dark' : 'light'); sync();
    D.dispatchEvent(new Event('themechange'));
  });
  sync();
  D.body.appendChild(b);
})();
