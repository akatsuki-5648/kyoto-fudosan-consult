/* ==========================================================================
   京都不動産コンサルSEOサイト  app.js
   2026-09-02
   ★世界TOP79件の実測に基づき、★ライブラリを足さずに素のJSで出す
      IntersectionObserver 9% ／ parallax語 51% ／ scroll-timeline は 1/79＝1%
      → ★CSS標準のscroll-timelineはまだ誰も使っていない。★JSでやる
   ★GSAP(24%)・three.js(10%)・Tailwind(9%) は使わない（重い／読めなくなる）
   ★prefers-reduced-motion を尊重する（★実測49%が入れている）
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     1. ★スクロール量を CSS変数に流す（★背景の透かし用）
        → base.css の .kfc-hero__veil が --kfc-scroll を読む
     ------------------------------------------------------------------ */
  var hero = document.querySelector('.kfc-hero, .kfc-phero');
  var gnav = document.getElementById('kfc-gnav');
  var stick = document.getElementById('kfc-stick');
  var progressBar = document.getElementById('kfc-progress-bar');
  var sections = document.querySelectorAll('[data-kfc-section]');
  var leads = document.querySelectorAll('.kfc-lead');
  var splitPanel = document.querySelector('.kfc-split');
  var railLinks = [];
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;

      // ★ヒーローの高さを 0〜1 に正規化して流す
      if (hero) {
        var h = hero.offsetHeight || 1;
        var p = Math.min(1, Math.max(0, y / h));
        document.documentElement.style.setProperty('--kfc-scroll', p.toFixed(4));
        document.documentElement.style.setProperty('--kfc-hero-p', p.toFixed(4));
      }

      // ★ページ全体の現在地。見た目ではなく、読了位置をそのまま線にする
      if (progressBar) {
        var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progressBar.style.transform = 'scaleX(' + Math.min(1, y / max).toFixed(5) + ')';
      }
      // ★ヘッダーの地を濃くする
      if (gnav) gnav.setAttribute('data-scrolled', y > 40 ? '1' : '0');

      // ★相談バーは、ヒーローを抜けてから／フッター手前で引っ込める
      if (stick) {
        var foot = document.querySelector('.kfc-foot');
        var footTop = foot ? foot.getBoundingClientRect().top : 99999;
        var on = (y > (hero ? hero.offsetHeight * 0.9 : 400)) &&
                 (footTop > window.innerHeight);
        stick.setAttribute('data-on', on ? '1' : '0');
      }

      // ★一文領域は、画面中央へ来た時だけ左の判断線が伸びる
      Array.prototype.forEach.call(leads, function (el) {
        var r = el.getBoundingClientRect();
        var center = r.top + r.height / 2;
        var d = Math.min(1, Math.abs(center - window.innerHeight / 2) / (window.innerHeight * .72));
        el.style.setProperty('--kfc-lead-active', (1 - d).toFixed(3));
      });

      if (splitPanel) {
        var sr = splitPanel.getBoundingClientRect();
        splitPanel.setAttribute('data-kfc-active', sr.top < window.innerHeight * .82 && sr.bottom > window.innerHeight * .18 ? '1' : '0');
      }

      // ★見出しを通過した順番を、右端レールとセクション自身へ返す
      if (sections.length) {
        var active = 0;
        for (var si = 0; si < sections.length; si++) {
          var rr = sections[si].getBoundingClientRect();
          if (rr.top <= window.innerHeight * .46) active = si;
        }
        for (var sj = 0; sj < sections.length; sj++) {
          var isActive = sj === active;
          sections[sj].setAttribute('data-kfc-active', isActive ? '1' : '0');
          if (railLinks[sj]) {
            if (isActive) railLinks[sj].setAttribute('aria-current', 'true');
            else railLinks[sj].removeAttribute('aria-current');
          }
        }
        var current = document.getElementById('kfc-rail-current');
        if (current) current.textContent = String(active + 1).padStart(2, '0');
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  /* ★右端に全H2の現在地を作る。本文が増減してもHTMLへ手書きしない */
  (function buildRail() {
    var list = document.getElementById('kfc-rail-list');
    var total = document.getElementById('kfc-rail-total');
    if (!list || !sections.length) {
      var rail = document.getElementById('kfc-rail');
      if (rail) rail.hidden = true;
      return;
    }
    if (total) total.textContent = String(sections.length).padStart(2, '0');
    Array.prototype.forEach.call(sections, function (sec, i) {
      if (!sec.id) sec.id = 'section-' + String(i + 1).padStart(2, '0');
      var h = sec.querySelector('.kfc-sec__h');
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + sec.id;
      a.textContent = String(i + 1).padStart(2, '0') + '  ' + (h ? h.textContent.trim() : 'セクション');
      li.appendChild(a); list.appendChild(li); railLinks.push(a);
    });
    onScroll();
  })();

  /* ------------------------------------------------------------------
     2. ★見えたら動く（IntersectionObserver）
        ★CSS側で [data-reveal][data-in="1"] に transition が当たる
     ------------------------------------------------------------------ */
  var targets = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, function (el) {
      el.setAttribute('data-in', '1');
    });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.setAttribute('data-in', '1');
        io.unobserve(e.target);   // ★一度出したら外す（★何度も動かさない）
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
  }

  /* ------------------------------------------------------------------
     3. ★数字のカウントアップ（★KnightFrank型・実測71%が数字を持つ）
        ★実体のある数字だけを data-count に入れること
     ------------------------------------------------------------------ */
  function countUp(el) {
    var goal = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(goal)) return;
    var small = el.querySelector('small');
    var unit = small ? small.outerHTML : '';
    if (reduce) { el.innerHTML = goal.toLocaleString('ja-JP') + unit; return; }
    var dur = 1200, t0 = null;
    function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / dur);
      // ★easeOutCubic（★最後がすっと止まる）
      var v = Math.round(goal * (1 - Math.pow(1 - p, 3)));
      el.innerHTML = v.toLocaleString('ja-JP') + unit;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var nums = document.querySelectorAll('[data-count]');
  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(nums, countUp);
  } else {
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        countUp(e.target);
        io2.unobserve(e.target);
      });
    }, { threshold: 0.4 });
    Array.prototype.forEach.call(nums, function (el) { io2.observe(el); });
  }

  /* ------------------------------------------------------------------
     3-B. ★モバイルメニューの開閉
        ★実測でナビが display:none で消えていた。★畳んで開ける形にする
     ------------------------------------------------------------------ */
  var burger = document.getElementById('kfc-burger');
  var navList = document.getElementById('kfc-gnav-list');
  if (burger && navList) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', open ? 'false' : 'true');
      navList.setAttribute('data-open', open ? '0' : '1');
      if (gnav) gnav.setAttribute('data-menu-open', open ? '0' : '1');
      document.documentElement.classList.toggle('kfc-menu-open', !open);
    });
    // ★リンクを押したら閉じる
    navList.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        navList.setAttribute('data-open', '0');
        if (gnav) gnav.setAttribute('data-menu-open', '0');
        document.documentElement.classList.remove('kfc-menu-open');
      }
    });
  }

  /* ★ポインター位置へ紙面の光を返す。触れない端末には何も強制しない */
  Array.prototype.forEach.call(document.querySelectorAll('.kfc-card,.kfc-help__i,.kfc-use__i'), function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--kfc-mx', (e.clientX - r.left).toFixed(1) + 'px');
      el.style.setProperty('--kfc-my', (e.clientY - r.top).toFixed(1) + 'px');
    }, { passive: true });
  });

  /* ------------------------------------------------------------------
     4. ★ヘッダーの高さぶん、アンカーの着地をずらす
        （CSS側 scroll-margin-top と二重にしない。★保険）
     ------------------------------------------------------------------ */
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest ? ev.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href');
    if (!id || id === '#') return;
    var el = document.querySelector(id);
    if (!el) return;
    ev.preventDefault();
    var top = el.getBoundingClientRect().top + window.pageYOffset - 72;
    window.scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', id);
  });

  /* ==================================================================
     2026-09-03 こころ再設計
     参考サイトの技法は借りるが、動きの意味は京都不動産コンサルへ戻す。
     文字は入場時だけ一字ずつ整列し、読んでいる途中では散らさない。
     その後は町割り・背景・境界・現在地だけが静かに動く。
     ================================================================== */

  /* ① ★1文字ずつ span に割る（★april-taylor / era-residence と同じ形） */
  function splitChars(el) {
    if (!el || el.dataset.split === '1') return;
    var html = el.innerHTML, out = '', i = 0, n = 0;
    while (i < html.length) {
      if (html[i] === '<') {                       // ★タグはそのまま通す
        var j = html.indexOf('>', i);
        if (j < 0) { out += html.slice(i); break; }
        out += html.slice(i, j + 1); i = j + 1; continue;
      }
      var c = html[i];
      if (c === '&') {                             // ★実体参照は1文字として扱う
        var k = html.indexOf(';', i);
        if (k > 0 && k - i < 9) { c = html.slice(i, k + 1); i = k + 1; }
        else i++;
      } else i++;
      if (c === ' ' || c === '\n') { out += c; continue; }
      out += '<span class="kfc-ch" style="--i:' + (n++) + '">' + c + '</span>';
    }
    el.innerHTML = out;
    el.dataset.split = '1';
    return n;
  }

  var bigs = document.querySelectorAll('.kfc-hero__name, .kfc-phero__name, .kfc-lead__t');
  Array.prototype.forEach.call(bigs, function (el) { splitChars(el); });

  /* ★入場が終わった文字を静止させる。本文を読ませる段階では可読性を優先する */
  Array.prototype.forEach.call(document.querySelectorAll('.kfc-ch'), function (c) {
    c.addEventListener('animationend', function () {
      c.style.animation = 'none';
      c.style.opacity = '1';
      c.style.clipPath = 'polygon(0 -30%, 100% -30%, 100% 100%, 0 100%)';
      c.style.transform = 'none';
    }, { once: true });
  });

  /* ★横帯は継ぎ目で跳ねず、ヒーローを離れるぶんだけ移動する */
  var marquee = document.querySelector('.kfc-marquee__in');
  if (!reduce && marquee) {
    window.addEventListener('scroll', function () {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      marquee.style.transform = 'translate3d(' + (-Math.min(420, y * .18)).toFixed(1) + 'px,0,0)';
    }, { passive: true });
  }

  /* ★背景と町割りはポインターへ数pxだけ応答する */
  if (!reduce && hero) {
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      document.documentElement.style.setProperty('--kfc-pointer-x', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      document.documentElement.style.setProperty('--kfc-pointer-y', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    }, { passive: true });
    hero.addEventListener('pointerleave', function () {
      document.documentElement.style.setProperty('--kfc-pointer-x', '0');
      document.documentElement.style.setProperty('--kfc-pointer-y', '0');
    });
  }


  /* ==================================================================
     ★★プリローダー（← grounded2026.com の実装をそのまま応用・2026-09-03）
     実物のコード（srcdump/grounded2026.com/all.js）：
       if (seen || reduced) document.documentElement.classList.add('preloader-skip');
       var minTimer = new Promise(function(res){ setTimeout(res, MIN_TIME); });
       var cap = new Promise(...);          // ★読み込み完了
       Promise.all([minTimer, cap]).then(...)   // ★両方揃うまで待つ
     ★★「最低表示時間」と「読み込み完了」の★両方を待つのが要点。
        ★どちらか片方だと、速すぎてチラつくか、遅すぎて待たされる。
     ★2回目以降は sessionStorage でスキップ（★実物と同じ）
     ================================================================== */
  (function () {
    var root = document.documentElement;
    var pre = document.getElementById('kfc-pre');
    if (!pre) return;
    var seen = false;
    try { seen = sessionStorage.getItem('kfc-pre') === '1'; } catch (e) {}
    if (seen || reduce) { root.classList.add('kfc-pre-skip'); return; }

    var MIN_TIME = 760;                        // ★背景が見えるまでの最低表示時間
    var nEl = document.getElementById('kfc-pre-n');
    var bar = document.getElementById('kfc-pre-bar');
    var v = 0, done = false;

    // ★乱数は使わず、毎回同じ速度で収束させる
    function tick() {
      if (done) return;
      v += (94 - v) * 0.075;
      if (v > 94) v = 94;
      if (nEl) nEl.textContent = String(Math.floor(v));
      if (bar) bar.style.width = v.toFixed(1) + '%';
      requestAnimationFrame(tick);
    }
    tick();

    function finish() {
      done = true;
      if (nEl) nEl.textContent = '100';
      if (bar) bar.style.width = '100%';
      setTimeout(function () {
        root.classList.add('kfc-pre-done');
        try { sessionStorage.setItem('kfc-pre', '1'); } catch (e) {}
      }, 180);
    }

    var minTimer = new Promise(function (res) { setTimeout(res, MIN_TIME); });
    var loaded = new Promise(function (res) {
      if (document.readyState === 'complete') return res();
      window.addEventListener('load', res, { once: true });
      setTimeout(res, 4200);                   // ★保険：重くても必ず開く
    });
    Promise.all([minTimer, loaded]).then(finish);
  })();

})();
