function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createMovieCard(movie) {
    const genres = (movie.genres || []).join(', ');
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.onclick = () => window.location.href = `movie.html?id=${movie.id}`;
    card.innerHTML = `
        <div class="movie-poster-wrap">
            <img class="movie-poster" src="${movie.posterUrl || 'https://picsum.photos/seed/placeholder/400/600'}" alt="${movie.title}" loading="lazy">
            <div class="movie-poster-overlay"></div>
            <div class="movie-poster-rating">${movie.averageRating.toFixed(1)}</div>
            ${movie.isExclusive ? '<div class="movie-poster-exclusive">Эксклюзив</div>' : ''}
        </div>
        <div class="movie-title">${movie.title}</div>
        <div class="movie-info">${movie.year} &middot; ${genres}</div>
    `;
    return card;
}

function renderMoviesRow(container, movies) {
    container.innerHTML = '';
    movies.forEach(m => container.appendChild(createMovieCard(m)));
}

function createSkeleton(width, height) {
    const el = document.createElement('div');
    el.className = 'skeleton';
    el.style.width = width;
    el.style.height = height;
    return el;
}

function renderSkeletonRow(container, count = 6) {
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'flex: 0 0 auto; width: 180px;';
        wrap.appendChild(createSkeleton('100%', '270px'));
        const title = createSkeleton('80%', '14px');
        title.style.marginTop = '8px';
        wrap.appendChild(title);
        const info = createSkeleton('60%', '12px');
        info.style.marginTop = '6px';
        wrap.appendChild(info);
        container.appendChild(wrap);
    }
}

function updateHeaderAuth() {
    const actions = document.querySelector('.header-actions');
    if (!actions) return;
    if (api.isAuthenticated && api.user) {
        const initials = api.user.displayName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
        actions.innerHTML = `
            <a href="profile.html" class="header-btn" title="Мои билеты">&#127915;</a>
            <button class="header-btn" onclick="document.getElementById('notifPanel')?.classList.toggle('active')" title="Уведомления">
                &#128276;<span class="badge"></span>
            </button>
            <a href="profile.html" class="user-avatar" title="${api.user.displayName}">${initials}</a>
        `;
    } else {
        actions.innerHTML = `<a href="auth.html" class="btn btn-primary btn-sm">Войти</a>`;
    }
}

function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderAuth();

    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const rect = btn.getBoundingClientRect();
            btn.style.setProperty('--ripple-x', ((e.clientX - rect.left) / rect.width * 100) + '%');
            btn.style.setProperty('--ripple-y', ((e.clientY - rect.top) / rect.height * 100) + '%');
        });
    });
});

document.addEventListener('authChanged', () => updateHeaderAuth());
