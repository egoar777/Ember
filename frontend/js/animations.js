document.addEventListener('DOMContentLoaded', () => {
    const bgGlow = document.querySelector('.bg-glow');
    if (bgGlow) {
        document.addEventListener('mousemove', e => {
            const x = (e.clientX / window.innerWidth - 0.5) * 40;
            const y = (e.clientY / window.innerHeight - 0.5) * 40;
            bgGlow.style.transform = `translate(${x}px, ${y}px)`;
        });
    }

    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.section, .glass-card, .movie-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        fadeObserver.observe(el);
    });

    const style = document.createElement('style');
    style.textContent = `.visible { opacity: 1 !important; transform: translateY(0) !important; }`;
    document.head.appendChild(style);

    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            const rotateX = (y - 0.5) * -8;
            const rotateY = (x - 0.5) * 8;
            card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });
});

function initParallaxScroll() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        const heroBg = hero.querySelector('.hero-bg');
        if (heroBg && scrollY < hero.offsetHeight) {
            heroBg.style.transform = `scale(1.05) translateY(${scrollY * 0.3}px)`;
        }
    }, { passive: true });
}

function initHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    const dots = document.querySelectorAll('.hero-dot');
    if (slides.length === 0) return;

    let current = 0;
    const total = slides.length;

    function goToSlide(index) {
        slides[current].classList.remove('active');
        dots[current]?.classList.remove('active');
        current = index;
        slides[current].classList.add('active');
        dots[current]?.classList.add('active');
    }

    dots.forEach((dot, i) => dot.addEventListener('click', () => goToSlide(i)));

    setInterval(() => goToSlide((current + 1) % total), 6000);
}

document.addEventListener('DOMContentLoaded', () => {
    initParallaxScroll();
    initHeroSlider();
});
