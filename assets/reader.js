/* Shared reader chrome for every reviewer page.
   Builds a fixed bar, a searchable contents panel, scroll progress,
   scroll-spy, and on-enter section reveals from the page's own <section id> + <h2>. */
(function () {
  var doc = document;
  doc.documentElement.dataset.theme = 'dark';

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  ready(function () {
    var aura = doc.createElement('div');
    aura.className = 'rv-aura';
    doc.body.appendChild(aura);

    var secs = [].slice.call(doc.querySelectorAll('section[id]'))
      .filter(function (s) { return s.querySelector('h2'); });

    if (!secs.length) return;   // landing page: ambient field only

    function label(sec) {
      var h = sec.querySelector('h2');
      var t = (h.textContent || '').replace(/\s+/g, ' ').trim();
      // strip a leading section number the page prints inside the heading
      return t.replace(/^\d{1,2}[.—–-]\s*/, '');
    }

    /* ---------- bar ---------- */
    var bar = doc.createElement('div');
    bar.className = 'rv-bar';
    bar.innerHTML =
      '<div class="rv-bar-in">' +
        '<a class="rv-home" href="../">← Reviewers</a>' +
        '<span class="rv-here"><b></b> <span></span></span>' +
        '<button class="rv-open" type="button" aria-expanded="false">' +
          'Contents <kbd>C</kbd></button>' +
      '</div>' +
      '<div class="rv-prog"><i></i></div>';
    doc.body.appendChild(bar);

    var hereWrap = bar.querySelector('.rv-here');
    var hereNum = hereWrap.querySelector('b');
    var hereTxt = hereWrap.querySelector('span');
    var progress = bar.querySelector('.rv-prog i');
    var openBtn = bar.querySelector('.rv-open');

    /* ---------- panel ---------- */
    var scrim = doc.createElement('div');
    scrim.className = 'rv-scrim';
    doc.body.appendChild(scrim);

    var panel = doc.createElement('nav');
    panel.className = 'rv-panel';
    panel.setAttribute('aria-label', 'Contents');
    panel.innerHTML =
      '<div class="rv-panel-head">' +
        '<p class="k">Contents</p>' +
        '<input class="rv-find" type="search" placeholder="Filter sections…" ' +
          'autocomplete="off" spellcheck="false">' +
      '</div>' +
      '<ul class="rv-list"></ul>' +
      '<p class="rv-empty" hidden>No section matches.</p>';
    doc.body.appendChild(panel);

    /* ---------- persistent sidebar (wide screens) ---------- */
    var side = doc.createElement('nav');
    side.className = 'rv-side';
    side.setAttribute('aria-label', 'Sections');
    side.innerHTML =
      '<div class="rv-side-head">' +
        '<input class="rv-find" type="search" placeholder="Filter sections…" ' +
          'autocomplete="off" spellcheck="false">' +
      '</div>' +
      '<ul class="rv-list"></ul>' +
      '<p class="rv-empty" hidden>No section matches.</p>';
    doc.body.appendChild(side);

    var groups = [panel, side].map(function (host) {
      return {
        list: host.querySelector('.rv-list'),
        find: host.querySelector('.rv-find'),
        empty: host.querySelector('.rv-empty'),
        links: []
      };
    });

    secs.forEach(function (sec, i) {
      var n = String(i + 1).padStart(2, '0');
      groups.forEach(function (g) {
        var li = doc.createElement('li');
        var a = doc.createElement('a');
        a.href = '#' + sec.id;
        a.innerHTML = '<span class="n">' + n + '</span><span class="t"></span>';
        a.querySelector('.t').textContent = label(sec);
        li.appendChild(a);
        g.list.appendChild(li);
        g.links.push(a);
        a.addEventListener('click', function () { close(); });
      });
    });

    var find = groups[0].find;

    function open() {
      scrim.classList.add('on');
      panel.classList.add('on');
      openBtn.setAttribute('aria-expanded', 'true');
      setTimeout(function () { find.focus(); }, 60);
    }
    function close() {
      scrim.classList.remove('on');
      panel.classList.remove('on');
      openBtn.setAttribute('aria-expanded', 'false');
    }
    function toggle() {
      panel.classList.contains('on') ? close() : open();
    }

    openBtn.addEventListener('click', toggle);
    scrim.addEventListener('click', close);

    doc.addEventListener('keydown', function (e) {
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) ||
        e.target.isContentEditable;
      if (e.key === 'Escape') { close(); return; }
      if (typing) return;
      if (e.key === 'c' || e.key === 'C') { e.preventDefault(); toggle(); }
      if (e.key === '/') { e.preventDefault(); open(); }
    });

    groups.forEach(function (g) {
      g.find.addEventListener('input', function () {
        var q = g.find.value.trim().toLowerCase();
        var hits = 0;
        g.links.forEach(function (a) {
          var match = !q || a.textContent.toLowerCase().indexOf(q) > -1;
          a.parentNode.classList.toggle('hide', !match);
          if (match) hits++;
        });
        g.empty.hidden = hits > 0;
      });
    });

    /* ---------- scroll state ---------- */
    var topBtn = doc.createElement('button');
    topBtn.className = 'rv-top';
    topBtn.type = 'button';
    topBtn.setAttribute('aria-label', 'Back to top');
    topBtn.textContent = '↑';
    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
    doc.body.appendChild(topBtn);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var h = doc.documentElement.scrollHeight - window.innerHeight;
        var p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
        progress.style.width = (p * 100).toFixed(2) + '%';
        doc.documentElement.style.setProperty('--rv-scroll', p.toFixed(3));
        topBtn.classList.toggle('on', window.scrollY > window.innerHeight * 0.6);
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ---------- scroll spy ---------- */
    var current = -1;
    function setCurrent(i) {
      if (i === current || i < 0) return;
      current = i;
      groups.forEach(function (g) {
        g.links.forEach(function (a, k) { a.classList.toggle('on', k === i); });
        var act = g.links[i];
        if (act && g.list.scrollHeight > g.list.clientHeight + 4) {
          var lt = act.offsetTop, lh = act.offsetHeight, st = g.list.scrollTop, ch = g.list.clientHeight;
          if (lt < st || lt + lh > st + ch) {
            g.list.scrollTo({ top: lt - ch / 2 + lh / 2, behavior: reduced ? 'auto' : 'smooth' });
          }
        }
      });
      hereNum.textContent = String(i + 1).padStart(2, '0');
      hereTxt.textContent = label(secs[i]);
      hereWrap.classList.add('on');
    }

    var spy = new IntersectionObserver(function () {
      var best = -1, bestTop = Infinity;
      secs.forEach(function (s, i) {
        var r = s.getBoundingClientRect();
        if (r.bottom > 80 && r.top < window.innerHeight * 0.55) {
          if (r.top < bestTop) { bestTop = r.top; best = i; }
        }
      });
      if (best > -1) setCurrent(best);
    }, { rootMargin: '-60px 0px -45% 0px', threshold: [0, 0.01, 0.25, 0.5] });
    secs.forEach(function (s) { spy.observe(s); });

    /* ---------- reveal ----------
       Sections here are often many times taller than the viewport, so an
       intersectionRatio threshold can never be met. Trigger on visibility
       alone, and keep a scroll-driven fallback plus a hard failsafe so a
       section can never be left invisible. */
    if (!reduced) {
      secs.forEach(function (s) { s.classList.add('rv-rise'); });

      // Reveal, then drop the classes so no long section keeps a
      // composited layer alive on a 30,000px page.
      function settle(s) {
        setTimeout(function () { s.classList.remove('rv-rise', 'in'); }, 700);
      }
      function reveal(s) {
        if (s.classList.contains('in')) return;
        s.classList.add('in');
        settle(s);
      }
      function revealVisible() {
        var vh = window.innerHeight;
        secs.forEach(function (s) {
          if (s.classList.contains('in')) return;
          var r = s.getBoundingClientRect();
          if (r.top < vh * 0.94 && r.bottom > 0) reveal(s);
        });
      }

      var rise = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            reveal(e.target);
            rise.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0 });
      secs.forEach(function (s) { rise.observe(s); });

      window.addEventListener('scroll', revealVisible, { passive: true });
      window.addEventListener('resize', revealVisible, { passive: true });
      revealVisible();

      setTimeout(function () {
        secs.forEach(function (s) { s.classList.remove('rv-rise', 'in'); });
      }, 4000);
    }
  });
})();
