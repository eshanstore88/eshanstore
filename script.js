// GSAP Register
gsap.registerPlugin(ScrollTrigger);

// Mouse Cursor Glow Tracking (Only active if not on mobile)
const cursorGlow = document.getElementById('cursor-glow');
if (window.innerWidth > 768) {
    document.addEventListener('mousemove', (e) => {
        requestAnimationFrame(() => {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });
    });
}

// Hero Animation
const tl = gsap.timeline();
tl.fromTo(".line-1", 
    { y: 50, opacity: 0 }, 
    { y: 0, opacity: 1, duration: 1, ease: "power3.out" }
)
.fromTo(".line-2", 
    { y: 50, opacity: 0, scale: 0.9 }, 
    { y: 0, opacity: 1, scale: 1, duration: 1, ease: "power3.out" }, 
    "-=0.5"
)
.fromTo(".fade-up", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, "-=0.4");

// Scroll Reveal for Cards (Categories & CTA)
gsap.utils.toArray(".scroll-card").forEach((card) => {
    gsap.from(card, {
        y: 60,
        opacity: 0,
        duration: 0.8,
        scrollTrigger: {
            trigger: card,
            start: "top 85%",
            toggleActions: "play none none reverse"
        }
    });
});

// Slider Pause on Hover/Touch (Why Choose Us)
const sliderTrack = document.getElementById('sliderTrack');
sliderTrack.addEventListener('mouseenter', () => sliderTrack.classList.add('paused'));
sliderTrack.addEventListener('mouseleave', () => sliderTrack.classList.remove('paused'));
sliderTrack.addEventListener('touchstart', () => sliderTrack.classList.add('paused'));
sliderTrack.addEventListener('touchend', () => sliderTrack.classList.remove('paused'));

// FAQ Accordion Logic
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
    item.addEventListener('click', () => {
        faqItems.forEach(otherItem => {
            if (otherItem !== item && otherItem.classList.contains('active')) {
                otherItem.classList.remove('active');
            }
        });
        item.classList.toggle('active');
    });
});