(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const finePointer = matchMedia('(pointer: fine)').matches;

  /* Year */
  $('#year').textContent = new Date().getFullYear();

  /* Theme toggle (remembers choice) */
  const root = document.documentElement;
  try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch (e) {}
  $('.theme-toggle').addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  /* Split hero title into animated letters */
  const split = $('.split');
  const text = split.textContent;
  split.textContent = '';
  [...text].forEach((c, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = c === ' ' ? ' ' : c;
    s.style.animationDelay = `${i * 30}ms`;
    split.appendChild(s);
  });

  /* Sliding nav pill */
  const nav = $('.nav'), pill = $('.nav__pill'), links = $$('.nav a');
  const movePill = (el) => {
    pill.style.width = el.offsetWidth + 'px';
    pill.style.transform = `translateX(${el.offsetLeft}px)`;
  };
  const activeLink = () => $('.nav a.is-active') || links[0];
  links.forEach((a) => {
    a.addEventListener('mouseenter', () => movePill(a));
    a.addEventListener('click', () => {
      links.forEach((l) => l.classList.remove('is-active'));
      a.classList.add('is-active');
    });
  });
  nav.addEventListener('mouseleave', () => movePill(activeLink()));
  addEventListener('resize', () => movePill(activeLink()));
  document.fonts?.ready.then(() => movePill(activeLink()));
  movePill(activeLink());

  /* Hero glow follows the mouse */
  const hero = $('.hero');
  hero.addEventListener('pointermove', (e) => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', `${e.clientX - r.left}px`);
    hero.style.setProperty('--my', `${e.clientY - r.top}px`);
  });

  /* Magnetic buttons */
  if (finePointer) {
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.25;
        const y = (e.clientY - r.top - r.height / 2) * 0.35;
        b.style.transform = `translate(${x}px, ${y}px)`;
      });
      b.addEventListener('pointerleave', () => (b.style.transform = ''));
    });
  }

  /* Hide placeholder once a real image loads; hide broken images */
  $$('.card__media img').forEach((img) => {
    const ph = img.nextElementSibling;
    const ok = () => ph && (ph.style.display = 'none');
    const bad = () => (img.style.display = 'none');
    if (img.complete) (img.naturalWidth ? ok() : bad());
    img.addEventListener('load', ok);
    img.addEventListener('error', bad);
  });

  /* Card 3D tilt + shine + cursor bubble */
  const cursor = $('.cursor');
  $$('.card__media').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--ry', `${(px - 0.5) * 6}deg`);
      card.style.setProperty('--rx', `${(0.5 - py) * 6}deg`);
      card.style.setProperty('--sx', `${px * 100}%`);
      card.style.setProperty('--sy', `${py * 100}%`);
    });
    card.addEventListener('pointerenter', () => finePointer && cursor.classList.add('is-on'));
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      cursor.classList.remove('is-on');
    });
  });
  if (finePointer) {
    addEventListener('pointermove', (e) => {
      cursor.style.setProperty('--cx', `${e.clientX}px`);
      cursor.style.setProperty('--cy', `${e.clientY}px`);
    });
  }

  /* Reveal on scroll (staggered) */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const sibs = [...en.target.parentElement.children].filter((c) => c.classList.contains('reveal'));
      en.target.style.transitionDelay = `${sibs.indexOf(en.target) * 90}ms`;
      en.target.classList.add('is-in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));

  /* Scroll progress bar */
  const bar = $('.progress');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Copy email + toast */
  const toast = $('.toast');
  let tId;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(tId);
    tId = setTimeout(() => toast.classList.remove('is-on'), 2000);
  };
  $$('.copy').forEach((b) => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); showToast('Email copied ✓'); }
    catch { location.href = `mailto:${b.dataset.copy}`; }
  }));
})();
