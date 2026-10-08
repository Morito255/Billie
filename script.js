const glow = document.querySelector('.cursor-glow');
const progressBar = document.querySelector('#progress-bar');
document.querySelectorAll('img').forEach((image) => {
  image.addEventListener('error', () => {
    if (image.dataset.fallback && !image.dataset.fallbackUsed) {
      image.dataset.fallbackUsed = 'true';
      image.src = image.dataset.fallback;
      return;
    }
    image.hidden = true;
    image.closest('.tour-image, .photo-card, .hero-art')?.classList.add('image-failed');
  });
});
window.addEventListener('pointermove', (event) => {
  glow.style.left = `${event.clientX}px`;
  glow.style.top = `${event.clientY}px`;
}, { passive: true });

function updateProgress() {
  const scrollable = document.documentElement.scrollHeight - innerHeight;
  const progress = scrollable > 0 ? (scrollY / scrollable) * 100 : 0;
  progressBar.style.width = `${progress}%`;
}
window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress);
updateProgress();

const tourCards = [...document.querySelectorAll('.tour-card')];
document.querySelectorAll('.tour-filter').forEach((button) => {
  button.addEventListener('click', () => {
    const era = button.dataset.era;
    document.querySelectorAll('.tour-filter').forEach((filter) => filter.classList.toggle('active', filter === button));
    tourCards.forEach((card) => { card.hidden = era !== 'all' && card.dataset.era !== era; });
  });
});

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.tour-card, .photo-card, .mood-card, .festival-archive').forEach((element) => {
    element.classList.add('will-reveal');
    revealObserver.observe(element);
  });
}

document.querySelectorAll('.tour-card').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--pointer-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--pointer-y', `${event.clientY - rect.top}px`);
  });
});

document.querySelectorAll('.era-choices button').forEach((button) => {
  button.addEventListener('click', () => {
    document.body.dataset.palette = button.dataset.palette;
    document.querySelectorAll('.era-choices button').forEach((choice) => {
      const active = choice === button;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-pressed', String(active));
    });
  });
});

document.querySelectorAll('.photo-card').forEach((card) => {
  card.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--photo-x', `${x * 100}%`);
    card.style.setProperty('--photo-y', `${y * 100}%`);
    card.style.setProperty('--rotate-x', `${(x - .5) * 2.2}deg`);
    card.style.setProperty('--rotate-y', `${(.5 - y) * 2.2}deg`);
  });
  card.addEventListener('pointerleave', () => {
    card.style.setProperty('--rotate-x', '0deg');
    card.style.setProperty('--rotate-y', '0deg');
  });
});

const tracks = [...document.querySelectorAll('.track')];
const moodResult = document.querySelector('#mood-result');
const moodNames = {
  dreamy: 'En mi mundo', sad: 'Un poco sensible', energia: 'Con toda la energía', romantico: 'Enamorada'
};

document.querySelectorAll('[data-mood]').forEach((button) => {
  button.addEventListener('click', () => {
    const mood = button.dataset.mood;
    const matches = tracks.filter((track) => track.dataset.moods.split(' ').includes(mood));
    const chosen = matches[Math.floor(Math.random() * matches.length)];
    document.querySelectorAll('.mood-buttons button').forEach((item) => item.classList.toggle('active', item === button));
    tracks.forEach((track) => track.classList.toggle('recommended', track === chosen));
    moodResult.innerHTML = `Para "${moodNames[mood]}": <strong>${chosen.querySelector('.track-name').childNodes[0].textContent.trim()}</strong> <a href="${chosen.href}" target="_blank" rel="noreferrer">escuchar ↗</a>`;
    document.querySelector('#music').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

document.querySelector('#secret-button').addEventListener('click', () => {
  const message = document.querySelector('#secret-message');
  message.hidden = !message.hidden;
  document.querySelector('#secret-button').innerHTML = message.hidden
    ? 'DESBLOQUEAR MENSAJE <span>✧</span>'
    : 'GUARDAR MI MENSAJE <span>♥</span>';
  if (!message.hidden) message.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
});
