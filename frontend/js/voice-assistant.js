class VoiceAssistant {
    constructor() {
        this.isSupported = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
        this.recognition = null;
        this.isListening = false;
        this.overlay = document.querySelector('.voice-overlay');
        this.voiceText = document.querySelector('.voice-text');
        this.voiceBtn = document.querySelector('.voice-btn');

        if (this.isSupported) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'ru-RU';
            this.recognition.continuous = false;
            this.recognition.interimResults = true;

            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(r => r[0].transcript)
                    .join('');
                if (this.voiceText) this.voiceText.textContent = transcript || 'Слушаю...';
                if (event.results[0].isFinal) {
                    this.stop();
                    this.processQuery(transcript);
                }
            };

            this.recognition.onerror = () => this.stop();
            this.recognition.onend = () => {
                if (this.isListening) this.stop();
            };
        }

        if (this.voiceBtn) {
            this.voiceBtn.addEventListener('click', () => {
                if (this.isListening) this.stop();
                else this.start();
            });
        }

        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) this.stop();
            });
        }
    }

    start() {
        if (!this.isSupported) {
            showToast('Голосовой ввод не поддерживается вашим браузером', 'error');
            return;
        }
        this.isListening = true;
        this.voiceBtn?.classList.add('listening');
        if (this.overlay) {
            this.overlay.classList.add('active');
            if (this.voiceText) this.voiceText.textContent = 'Слушаю...';
        }
        this.recognition.start();
    }

    stop() {
        this.isListening = false;
        this.voiceBtn?.classList.remove('listening');
        this.overlay?.classList.remove('active');
        try { this.recognition?.stop(); } catch { /* ignore */ }
    }

    async processQuery(query) {
        if (!query.trim()) return;
        const searchInput = document.querySelector('.search-box input');
        if (searchInput) searchInput.value = query;

        try {
            const result = await api.post('/ai/search', { query });
            if (result && result.results) {
                if (window.location.pathname.includes('catalog')) {
                    document.dispatchEvent(new CustomEvent('aiSearchResults', { detail: result }));
                } else {
                    sessionStorage.setItem('aiSearchResult', JSON.stringify(result));
                    window.location.href = 'catalog.html?ai=1';
                }
                showToast(result.interpretedQuery, 'success');
            }
        } catch (err) {
            showToast('Ошибка поиска: ' + err.message, 'error');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.voiceAssistant = new VoiceAssistant();
});
