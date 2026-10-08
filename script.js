(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const glow = $('.cursor-glow');
  const progressBar = $('#progress-bar');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // A short first-visit curtain, never a blocking loader.
  const curtain = $('.intro-curtain');
  let firstVisit = false;
  try {
    firstVisit = !sessionStorage.getItem('billie-verse-intro-seen');
    sessionStorage.setItem('billie-verse-intro-seen', '1');
  } catch { firstVisit = true; }
  if (curtain && firstVisit && !reducedMotion.matches) {
    requestAnimationFrame(() => document.body.classList.add('intro-active'));
    setTimeout(() => { curtain.hidden = true; document.body.classList.remove('intro-active'); }, 1020);
  } else if (curtain) curtain.hidden = true;

  // Image failures keep their editorial card and use the local visual fallback.
  $$('img').forEach((image) => image.addEventListener('error', () => {
    if (image.dataset.fallback && !image.dataset.fallbackUsed) {
      image.dataset.fallbackUsed = 'true';
      image.src = image.dataset.fallback;
      return;
    }
    image.hidden = true;
    image.closest('.tour-image, .photo-card, .hero-art')?.classList.add('image-failed');
  }));

  // Mobile navigation is a real, keyboard-operable disclosure.
  const menuToggle = $('.menu-toggle');
  const mainNav = $('#main-nav');
  const closeMenu = () => {
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuToggle?.setAttribute('aria-label', 'Abrir menú');
    mainNav?.classList.remove('menu-open');
    document.body.classList.remove('menu-is-open');
  };
  menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    mainNav?.classList.toggle('menu-open', open);
    document.body.classList.toggle('menu-is-open', open);
  });
  $$('#main-nav a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });

  // Reading progress and cursor light are frame-limited for smooth scrolling.
  function updateProgress() {
    if (!progressBar) return;
    const scrollable = document.documentElement.scrollHeight - innerHeight;
    progressBar.style.width = `${scrollable > 0 ? scrollY / scrollable * 100 : 0}%`;
  }
  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { updateProgress(); scrollFrame = 0; });
  }, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  updateProgress();
  let pointerFrame = 0;
  window.addEventListener('pointermove', (event) => {
    if (!glow || !finePointer.matches || reducedMotion.matches || pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
      pointerFrame = 0;
    });
  }, { passive: true });
  $$('.cursor-glow, a, button, .hero-art, .photo-card').forEach((element) => {
    element.addEventListener('pointerenter', () => glow?.classList.add('is-interactive'));
    element.addEventListener('pointerleave', () => glow?.classList.remove('is-interactive'));
  });

  // Scroll reveals and active-section navigation.
  const tourCards = $$('.tour-card');
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); }
    }), { threshold: .12 });
    $$('.tour-card, .tour-timeline, .photo-card, .mood-card, .festival-archive, .music-section, .concerts-section, .gallery-section, .era-section, .fan-zone, .surprise-section').forEach((element) => {
      element.classList.add('will-reveal');
      revealObserver.observe(element);
    });
  }
  const navLinks = $$('#main-nav a');
  const navSections = navLinks.map((link) => $(link.getAttribute('href'))).filter(Boolean);
  if ('IntersectionObserver' in window && navSections.length) {
    const navObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        const current = link.hash === `#${entry.target.id}`;
        link.classList.toggle('is-current', current);
        if (current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }), { rootMargin: '-24% 0px -62% 0px', threshold: 0 });
    navSections.forEach((section) => navObserver.observe(section));
  }

  // Filters preserve the complete timeline and only hide non-matching eras.
  const filterStatus = $('#tour-filter-status');
  $$('.tour-filter').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    button.addEventListener('click', () => {
      const era = button.dataset.era;
      $$('.tour-filter').forEach((filter) => {
        const active = filter === button;
        filter.classList.toggle('active', active);
        filter.setAttribute('aria-pressed', String(active));
      });
      let shown = 0;
      tourCards.forEach((card) => {
        card.hidden = era !== 'all' && card.dataset.era !== era;
        if (!card.hidden) shown++;
      });
      if (filterStatus) filterStatus.textContent = `${shown} ${shown === 1 ? 'gira visible' : 'giras visibles'}`;
    });
  });

  // Four era palettes alter the site's lighting, surfaces and WebGL tone.
  const palettes = {
    green: { title: 'WHEN WE ALL FALL ASLEEP, WHERE DO WE GO?', note: 'Una sombra verde, un mundo que no termina de estar quieto.' },
    ocean: { title: 'DON’T SMILE AT ME · OCEAN EYES', note: 'Cercanía, noche y azul profundo; el principio contado en voz baja.' },
    gold: { title: 'HAPPIER THAN EVER', note: 'Una luz cálida y cinematográfica que crece hasta romper el silencio.' },
    blue: { title: 'HIT ME HARD AND SOFT', note: 'Bajo el agua, entre un susurro y una ola que lo cambia todo.' }
  };
  function applyPalette(name) {
    if (!palettes[name]) return;
    document.body.dataset.palette = name;
    $$('.era-choices button').forEach((button) => {
      const active = button.dataset.palette === name;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const title = $('#era-caption');
    const note = $('#era-caption-note');
    if (title) title.textContent = `AHORA: ${palettes[name].title}`;
    if (note) note.textContent = palettes[name].note;
    const themeColor = $('meta[name="theme-color"]');
    if (themeColor) themeColor.content = getComputedStyle(document.body).getPropertyValue('--era-accent').trim();
    window.dispatchEvent(new CustomEvent('billie:palette', { detail: { palette: name } }));
  }
  $$('.era-choices button').forEach((button) => button.addEventListener('click', () => applyPalette(button.dataset.palette)));
  applyPalette('green');

  // Track selection updates the listening corner before Spotify opens in its own tab.
  const nowTitle = $('#now-title');
  const nowLabel = $('#now-label');
  const nowCaption = $('#now-caption');
  const nowLink = $('#now-link');
  $$('.track').forEach((track) => track.addEventListener('click', () => {
    const song = $('.track-name', track)?.childNodes[0]?.textContent?.trim() || 'Billie Eilish';
    const album = $('small', track)?.textContent?.split('·')[0]?.trim() || 'BILLIE EILISH';
    if (nowTitle) nowTitle.textContent = song;
    if (nowLabel) nowLabel.textContent = `AHORA EN TU SELECCIÓN · ${track.dataset.track.toUpperCase()}`;
    if (nowCaption) nowCaption.textContent = `${album} · Abriendo esta canción en Spotify. La selección queda marcada aquí.`;
    if (nowLink) { nowLink.href = track.href; nowLink.innerHTML = 'ABRIR ESTA CANCIÓN EN SPOTIFY <span>↗</span>'; }
    $$('.track').forEach((item) => item.classList.toggle('recommended', item === track));
    $('.now-card')?.classList.add('is-selected');
    const era = album.includes('HAPPIER') ? 'gold' : album.includes('HIT ME') ? 'blue' : album.includes('WHEN WE ALL') ? 'green' : 'ocean';
    applyPalette(era);
  }));

  // Mood picker: song, album era and short fan-style note, with no lyric quotes.
  const moodData = {
    dreamy: { name: 'En mi mundo', palette: 'blue', line: 'Hoy toca dejar que el pensamiento flote un poco.' },
    sad: { name: 'Sensible', palette: 'ocean', line: 'No tienes que arreglar lo que sientes; puedes acompañarlo.' },
    enfadado: { name: 'Con fuego dentro', palette: 'green', line: 'A veces una canción es el lugar seguro para soltarlo todo.' },
    romantico: { name: 'Enamorada', palette: 'gold', line: 'Guarda ese sentimiento como una escena que no quieres que acabe.' },
    tranquilo: { name: 'En calma', palette: 'blue', line: 'Respira; hoy el mundo puede ir un poquito más despacio.' },
    caotico: { name: 'Caótica', palette: 'green', line: 'Que el ruido encuentre su propio ritmo.' },
    energia: { name: 'Imparable', palette: 'gold', line: 'Sube el volumen y deja que la energía haga lo suyo.' },
    nocturno: { name: 'De madrugada', palette: 'ocean', line: 'Hay canciones que entienden mejor las horas tardías.' }
  };
  const tracks = $$('.track');
  const moodResult = $('#mood-result');
  $$('.mood-buttons [data-mood]').forEach((button) => button.addEventListener('click', () => {
    const mood = moodData[button.dataset.mood];
    if (!mood) return;
    const choices = tracks.filter((track) => track.dataset.moods.split(' ').includes(button.dataset.mood));
    const chosen = choices[Math.floor(Math.random() * choices.length)];
    if (!chosen || !moodResult) return;
    $$('.mood-buttons button').forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    tracks.forEach((track) => track.classList.toggle('recommended', track === chosen));
    applyPalette(mood.palette);
    const song = $('.track-name', chosen)?.childNodes[0]?.textContent?.trim() || 'Billie Eilish';
    const era = $('small', chosen)?.textContent?.split('·')[0]?.trim() || 'Billie Eilish';
    moodResult.replaceChildren();
    const card = document.createElement('div');
    card.className = 'mood-answer';
    const label = document.createElement('small'); label.textContent = `HOY ERES · ${mood.name.toUpperCase()}`;
    const title = document.createElement('strong'); title.textContent = song;
    const album = document.createElement('span'); album.textContent = era;
    const note = document.createElement('p'); note.textContent = mood.line;
    const listen = document.createElement('a'); listen.href = chosen.href; listen.target = '_blank'; listen.rel = 'noreferrer'; listen.textContent = 'ESCUCHAR ESTA CANCIÓN ↗';
    card.append(label, title, album, note, listen);
    moodResult.append(card);
    moodResult.classList.remove('answer-in');
    requestAnimationFrame(() => moodResult.classList.add('answer-in'));
  }));
  $$('.mood-buttons button').forEach((button) => button.setAttribute('aria-pressed', 'false'));

  // Fan archive: ten optional discoveries, saved locally and announced with a small toast.
  const eggs = new Set();
  const eggKey = 'billie-verse-easter-eggs-v1';
  const eggCopy = {
    stars: 'Una luz escondida en la portada.', logo: 'Ya encontraste la entrada secreta.', ocean: 'De Ocean Eyes al universo entero.', pattern: 'Patrón reconocido. Esto sí es cultura fan.', hold: 'A veces hay que quedarse un momento más.', message: 'Un secreto detrás del mensaje secreto.', favorite: 'El corazón siempre estuvo en el número uno.', era: 'Has encontrado una puerta a otra era.', double: 'La órbita respondió a tu gesto.', archive: 'El archivo también guarda sus pequeñas sorpresas.'
  };
  try {
    JSON.parse(localStorage.getItem(eggKey) || '[]').forEach((id) => eggs.add(id));
  } catch { /* Storage can be disabled without affecting the experience. */ }
  const eggCount = $('#egg-count');
  const eggMeter = $('#egg-meter-fill');
  const eggStatus = $('#egg-status');
  const toast = $('#egg-toast');
  const toastCopy = $('#egg-toast-copy');
  const toastCount = $('#egg-toast-count');
  let toastTimer;
  function updateEggCounter() {
    if (eggCount) eggCount.textContent = String(eggs.size);
    if (eggMeter) eggMeter.style.width = `${eggs.size * 10}%`;
    if (eggStatus) eggStatus.textContent = eggs.size === 10 ? 'Archivo completo. Billie estaría orgullosa de tu atención al detalle.' : `${eggs.size} de 10 secretos encontrados · sigue curioseando sin prisa.`;
  }
  function discoverEgg(id, message = eggCopy[id]) {
    if (eggs.has(id)) return;
    eggs.add(id);
    try { localStorage.setItem(eggKey, JSON.stringify([...eggs])); } catch { /* Discovery still counts for this visit. */ }
    updateEggCounter();
    if (toast && toastCopy && toastCount) {
      toastCopy.textContent = message || 'Has encontrado un detalle escondido.';
      toastCount.textContent = `${String(eggs.size).padStart(2, '0')} / 10`;
      toast.hidden = false;
      toast.classList.remove('toast-show');
      requestAnimationFrame(() => toast.classList.add('toast-show'));
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toast.classList.remove('toast-show'); setTimeout(() => { toast.hidden = true; }, 360); }, 3600);
    }
    document.body.classList.remove('egg-flash');
    requestAnimationFrame(() => document.body.classList.add('egg-flash'));
  }
  updateEggCounter();
  $$('.art-star').forEach((star) => star.addEventListener('click', (event) => { event.stopPropagation(); discoverEgg('stars'); }));
  let logoClicks = 0, secretClicks = 0, heartClicks = 0, blueClicks = 0;
  $$('.wordmark').forEach((logo) => logo.addEventListener('click', () => { if (++logoClicks >= 5) discoverEgg('logo'); }));
  const secretButton = $('#secret-button');
  const secretMessage = $('#secret-message');
  secretButton?.addEventListener('click', () => {
    // The original message is a one-click interaction; repeated clicks only
    // count as the optional Easter egg and never gate the message itself.
    if (secretMessage?.hidden) {
      secretMessage.hidden = false;
      secretButton.setAttribute('aria-expanded', 'true');
      secretButton.innerHTML = 'MENSAJE DESBLOQUEADO <span aria-hidden="true">✧</span>';
    }
    if (++secretClicks >= 3) discoverEgg('message');
  });
  $('.favorite-number')?.addEventListener('click', (event) => { event.preventDefault(); event.stopPropagation(); if (++heartClicks >= 3) discoverEgg('favorite'); });
  $('[data-palette="blue"]')?.addEventListener('click', () => { if (++blueClicks >= 3) discoverEgg('era'); });
  $('.hero-art')?.addEventListener('dblclick', () => discoverEgg('double'));
  const orb = $('.mood-orb');
  let holdTimer;
  orb?.addEventListener('pointerdown', () => { holdTimer = setTimeout(() => discoverEgg('hold'), 900); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((type) => orb?.addEventListener(type, () => clearTimeout(holdTimer)));
  orb?.addEventListener('click', (event) => { if (event.detail === 0) discoverEgg('hold'); });
  const phraseBuffer = [];
  const fanPhrase = 'ocean eyes';
  const pattern = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  const patternBuffer = [];
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if (event.key.length === 1 && /[a-z ]/i.test(event.key)) {
      phraseBuffer.push(event.key.toLowerCase());
      phraseBuffer.splice(0, Math.max(0, phraseBuffer.length - fanPhrase.length));
      if (phraseBuffer.join('').includes(fanPhrase)) { discoverEgg('ocean'); phraseBuffer.length = 0; }
    }
    patternBuffer.push(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    patternBuffer.splice(0, Math.max(0, patternBuffer.length - pattern.length));
    if (pattern.every((key, index) => patternBuffer[index] === key)) { discoverEgg('pattern'); patternBuffer.length = 0; }
  });

  // Gallery lightbox with keyboard, focus return and swipe navigation.
  const galleryButtons = $$('.gallery-open');
  const lightbox = $('#lightbox');
  const lightboxImage = $('.lightbox-image', lightbox || document);
  const lightboxCaption = $('.lightbox-caption', lightbox || document);
  const lightboxCredit = $('.lightbox-credit', lightbox || document);
  const lightboxCount = $('.lightbox-count', lightbox || document);
  let galleryIndex = 0;
  let previousFocus = null;
  const credits = ['iMore · retrato de era', 'NPR / KPBS · universo de HMHAS', 'Vogue · directo'];
  function showGalleryImage(index) {
    if (!galleryButtons.length || !lightbox) return;
    galleryIndex = (index + galleryButtons.length) % galleryButtons.length;
    const source = $('img', galleryButtons[galleryIndex]);
    lightboxImage.src = source.currentSrc || source.src;
    lightboxImage.alt = source.alt;
    lightboxCaption.textContent = $('figcaption span', galleryButtons[galleryIndex].closest('figure'))?.textContent || source.alt;
    lightboxCredit.textContent = credits[galleryIndex] || 'Archivo Billie Verse';
    lightboxCount.textContent = `${String(galleryIndex + 1).padStart(2, '0')} / ${String(galleryButtons.length).padStart(2, '0')}`;
    if (galleryIndex === 2) discoverEgg('archive');
  }
  function closeGallery() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.classList.remove('lightbox-open');
    previousFocus?.focus();
  }
  galleryButtons.forEach((button, index) => button.addEventListener('click', () => {
    if (!lightbox) return;
    previousFocus = button;
    showGalleryImage(index);
    lightbox.hidden = false;
    document.body.classList.add('lightbox-open');
    $('.lightbox-close', lightbox)?.focus();
  }));
  $('.lightbox-close')?.addEventListener('click', closeGallery);
  $('.lightbox-prev')?.addEventListener('click', () => showGalleryImage(galleryIndex - 1));
  $('.lightbox-next')?.addEventListener('click', () => showGalleryImage(galleryIndex + 1));
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeGallery(); });
  document.addEventListener('keydown', (event) => {
    if (lightbox?.hidden) return;
    if (event.key === 'Escape') closeGallery();
    if (event.key === 'ArrowLeft') { event.preventDefault(); showGalleryImage(galleryIndex - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showGalleryImage(galleryIndex + 1); }
    if (event.key === 'Tab') {
      const focusables = $$('button', lightbox).filter((item) => !item.disabled);
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  let touchStart = 0;
  lightbox?.addEventListener('touchstart', (event) => { touchStart = event.changedTouches[0].clientX; }, { passive: true });
  lightbox?.addEventListener('touchend', (event) => {
    const delta = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(delta) > 55) showGalleryImage(galleryIndex + (delta < 0 ? 1 : -1));
  }, { passive: true });

  // Preserve the soft card tilt only on pointer-capable desktop devices.
  $$('.tour-card').forEach((card) => card.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType !== 'mouse') return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
  }));
  $$('.photo-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (!finePointer.matches || reducedMotion.matches || event.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty('--photo-x', `${x * 100}%`);
      card.style.setProperty('--photo-y', `${y * 100}%`);
      card.style.setProperty('--rotate-x', `${(x - .5) * 2}deg`);
      card.style.setProperty('--rotate-y', `${(.5 - y) * 2}deg`);
    });
    card.addEventListener('pointerleave', () => { card.style.setProperty('--rotate-x', '0deg'); card.style.setProperty('--rotate-y', '0deg'); });
  });

  // The tour entry animates into its custom page, respecting reduced motion.
  $$('a.tour-image, a.dates-link').forEach((link) => link.addEventListener('click', (event) => {
    if (reducedMotion.matches || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    document.body.classList.add('page-leaving');
    setTimeout(() => { window.location.href = link.href; }, 190);
  }));
})();
