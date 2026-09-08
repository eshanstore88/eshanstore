(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopMotion = window.matchMedia('(min-width: 761px) and (pointer: fine)');
  const motionButton = document.getElementById('motion-toggle');
  let userPaused = false;
  try { userPaused = localStorage.getItem('eshan-motion') === 'paused'; } catch (_) {}
  let context, lenis, tickerCallback, cleanupMotion = [];
  let entrancePlayed = false;
  const revealedElements = new WeakSet();
  const hasGsap = !!window.gsap && !!window.ScrollTrigger;
  const isPaused = () => userPaused || reduced.matches;

  // Basic navigation, reviews, and FAQs keep working without animation libraries.
  const reviewWindow = document.getElementById('review-window');
  const prev = document.getElementById('review-prev');
  const next = document.getElementById('review-next');
  const cards = [...document.querySelectorAll('.review-card')];
  function updateReviews() {
    const max = reviewWindow.scrollWidth - reviewWindow.clientWidth;
    prev.disabled = reviewWindow.scrollLeft <= 2;
    next.disabled = reviewWindow.scrollLeft >= max - 2;
    const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
    const index = Math.min(cards.length, Math.round(reviewWindow.scrollLeft / step) + 1);
    document.getElementById('review-position').textContent = `${String(index).padStart(2, '0')} — 05`;
  }
  function moveReview(direction) {
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    reviewWindow.scrollBy({ left: direction * step, behavior: isPaused() ? 'instant' : 'smooth' });
  }
  prev.addEventListener('click', () => moveReview(-1));
  next.addEventListener('click', () => moveReview(1));
  reviewWindow.addEventListener('scroll', updateReviews, { passive: true });
  reviewWindow.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault(); moveReview(e.key === 'ArrowRight' ? 1 : -1);
    }
  });
  window.addEventListener('resize', updateReviews);
  updateReviews();

  // Keep <details> open until its closing animation ends. Native toggling
  // would hide the answer immediately, before GSAP could animate it.
  let layoutFrame = 0;
  const refreshLayout = () => {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      if (lenis) lenis.resize();
      if (hasGsap) ScrollTrigger.refresh();
    });
  };
  const faqStates = [...document.querySelectorAll('.faq-item')].map(item => ({
    item,
    summary: item.querySelector('summary'),
    answer: item.querySelector('.faq-answer'),
    expanded: item.open,
    tween: null
  }));
  const syncFaqState = state => {
    state.item.dataset.expanded = String(state.expanded);
    state.summary.setAttribute('aria-expanded', String(state.expanded));
    state.answer.setAttribute('aria-hidden', String(!state.expanded));
    state.answer.inert = !state.expanded;
  };
  const finishFaq = state => {
    if (state.tween) state.tween.kill();
    state.tween = null;
    state.item.open = state.expanded;
    state.answer.style.removeProperty('height');
    state.answer.style.removeProperty('opacity');
    syncFaqState(state);
    refreshLayout();
  };
  const setFaq = (state, expanded) => {
    if (state.expanded === expanded) return;
    // Read the current painted height before cancelling, so rapid clicks reverse
    // from the current position instead of jumping to a start/end frame.
    const height = state.item.open ? state.answer.getBoundingClientRect().height : 0;
    const opacity = state.item.open ? parseFloat(getComputedStyle(state.answer).opacity) : 0;
    if (state.tween) state.tween.kill();
    state.tween = null;
    state.expanded = expanded;
    syncFaqState(state);
    if (!hasGsap || isPaused()) { finishFaq(state); return; }
    state.item.open = true;
    state.answer.style.height = 'auto';
    const targetHeight = expanded ? state.answer.scrollHeight : 0;
    state.tween = gsap.fromTo(state.answer, { height, opacity }, {
      height: targetHeight,
      opacity: expanded ? 1 : 0,
      duration: desktopMotion.matches ? .42 : .34,
      ease: 'power2.inOut',
      overwrite: true,
      onComplete: () => finishFaq(state)
    });
  };
  faqStates.forEach(state => {
    syncFaqState(state);
    state.summary.addEventListener('click', event => {
      event.preventDefault();
      const expand = !state.expanded;
      if (expand) faqStates.forEach(other => { if (other !== state) setFaq(other, false); });
      setFaq(state, expand);
    });
    // The native summary translates Enter/Space into clicks; no duplicate key handler.
  });
  const settleFaqs = () => faqStates.forEach(state => { if (state.tween) finishFaq(state); });
  window.addEventListener('resize', settleFaqs, { passive: true });

  function stopMotion() {
    if (context) { context.revert(); context = null; }
    if (tickerCallback) { gsap.ticker.remove(tickerCallback); tickerCallback = null; }
    if (lenis) { lenis.destroy(); lenis = null; }
    cleanupMotion.forEach(fn => fn()); cleanupMotion = [];
  }
  function startMotion() {
    settleFaqs();
    stopMotion();
    document.body.classList.toggle('motion-paused', isPaused());
    document.documentElement.style.scrollBehavior = isPaused() ? 'auto' : '';
    motionButton.textContent = reduced.matches ? 'Reduced motion on' : userPaused ? 'Resume motion' : 'Pause motion';
    motionButton.setAttribute('aria-pressed', String(isPaused()));
    motionButton.disabled = reduced.matches;
    if (!hasGsap || isPaused()) return;
    gsap.registerPlugin(ScrollTrigger);
    const desktop = desktopMotion.matches;
    // Touch devices keep native scrolling and avoid a continuous smooth-scroll ticker.
    if (window.Lenis && desktop) {
      lenis = new Lenis({ duration: 1.05, smoothWheel: true, syncTouch: false, anchors: true });
      lenis.on('scroll', ScrollTrigger.update);
      tickerCallback = time => lenis.raf(time * 1000);
      gsap.ticker.add(tickerCallback);
    }
    context = gsap.context(() => {
      if (!entrancePlayed) {
        entrancePlayed = true;
        gsap.timeline({ defaults: { ease: 'power3.out' } })
        .from('.hero-intro', { y: 15, opacity: 0, duration: .65 })
        .from('.line-wrap > span', { yPercent: 110, duration: 1.15, stagger: .12 }, .12)
        .from('.hero-art', { scale: 1.1, opacity: 0, duration: 1.6 }, .1)
        .from('.hero-description, .hero-actions', { y: 20, opacity: 0, stagger: .12, duration: .85 }, .6);
      }
      gsap.utils.toArray('.reveal').forEach((element) => {
        if (revealedElements.has(element)) return;
        gsap.from(element, { y: desktop ? 35 : 18, opacity: 0, duration: desktop ? .85 : .55, ease: 'power3.out',
          onComplete: () => revealedElements.add(element),
          scrollTrigger: { trigger: element, start: 'top 94%', once: true } });
      });
      gsap.to('.scroll-progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .2 } });
      // Only visible, foreground decorations animate. No particles, video, or extra assets.
      const ambient = new Map();
      const updateAmbient = () => ambient.forEach(state => {
        state.tween.paused(!state.visible || state.hovered || document.hidden);
      });
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          const state = ambient.get(entry.target);
          if (state) state.visible = entry.isIntersecting;
        });
        updateAmbient();
      });
      const watchMotion = (element, tween) => {
        ambient.set(element, { tween, visible: false, hovered: false });
        observer.observe(element);
      };
      document.addEventListener('visibilitychange', updateAmbient);
      cleanupMotion.push(() => {
        observer.disconnect();
        document.removeEventListener('visibilitychange', updateAmbient);
      });
      const brandTween = gsap.to('.brand-track', { xPercent: -50, duration: desktop ? 30 : 40, ease: 'none', repeat: -1, paused: true });
      const band = document.querySelector('.brands-band');
      watchMotion(band, brandTween);
      const pauseBand = () => { ambient.get(band).hovered = true; updateAmbient(); };
      const resumeBand = () => { ambient.get(band).hovered = false; updateAmbient(); };
      band.addEventListener('mouseenter', pauseBand); band.addEventListener('mouseleave', resumeBand);
      cleanupMotion.push(() => { band.removeEventListener('mouseenter', pauseBand); band.removeEventListener('mouseleave', resumeBand); });
      const artwork = document.querySelector('.hero-art');
      watchMotion(artwork, gsap.to(artwork, {
        y: desktop ? -12 : -5, rotation: desktop ? .7 : 0,
        duration: desktop ? 4 : 5, delay: 1.7,
        repeat: -1, yoyo: true, ease: 'sine.inOut', paused: true
      }));
      const scrollArrow = document.querySelector('.scroll-cue span');
      watchMotion(scrollArrow, gsap.to(scrollArrow, {
        y: 5, duration: 1.4, repeat: -1, yoyo: true, ease: 'sine.inOut', paused: true
      }));
      if (desktop) {
        const ctaAccent = document.querySelector('.cta-top > span:last-child');
        watchMotion(ctaAccent, gsap.to(ctaAccent, {
          rotation: 360, duration: 40, repeat: -1, ease: 'none', paused: true
        }));
        gsap.to('.hero-visual', { y: 80, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
        document.querySelectorAll('.magnetic').forEach(button => {
          const xTo = gsap.quickTo(button, 'x', { duration: .45, ease: 'power3.out' });
          const yTo = gsap.quickTo(button, 'y', { duration: .45, ease: 'power3.out' });
          const onMove = e => { const rect = button.getBoundingClientRect(); xTo((e.clientX - rect.left - rect.width / 2) * .12); yTo((e.clientY - rect.top - rect.height / 2) * .18); };
          const onLeave = () => { xTo(0); yTo(0); };
          button.addEventListener('pointermove', onMove); button.addEventListener('pointerleave', onLeave);
          cleanupMotion.push(() => { button.removeEventListener('pointermove', onMove); button.removeEventListener('pointerleave', onLeave); });
        });
      }
    });
    ScrollTrigger.refresh();
  }
  if (hasGsap) {
    motionButton.hidden = false;
    motionButton.addEventListener('click', () => {
      userPaused = !userPaused;
      try { localStorage.setItem('eshan-motion', userPaused ? 'paused' : 'running'); } catch (_) {}
      startMotion();
    });
    reduced.addEventListener('change', startMotion);
    desktopMotion.addEventListener('change', startMotion);
    startMotion();
    if (document.fonts) document.fonts.ready.then(() => { settleFaqs(); updateReviews(); refreshLayout(); });
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }
})();
