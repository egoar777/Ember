import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';
import { apiGet } from '../api/client';
import { getDisplayTitleForString } from '../titleOverrides';

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const { onAuthChange } = useAuth();

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast('Голосовой ввод не поддерживается браузером', 'error');
      return;
    }

    // Останавливаем предыдущий сеанс, если по какой‑то причине он ещё идёт
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'ru-RU';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      const text = Array.from(e.results).map((r) => r[0].transcript).join('').trim();
      setTranscript(text || 'Слушаю...');
      if (e.results[0].isFinal) {
        recognition.stop();
        if (!text) {
          showToast('Не удалось распознать запрос, попробуйте ещё раз', 'error');
          return;
        }
        const params = new URLSearchParams({ search: text, pageSize: '20' });
        const textLower = text.toLowerCase();
        apiGet(`/movies?${params}`, onAuthChange)
          .then(async (r) => {
            let items = r?.items ?? r?.Items ?? [];
            if (items.length === 0) {
              const allParams = new URLSearchParams({ pageSize: '50' });
              const allRes = await apiGet(`/movies?${allParams}`, onAuthChange);
              const all = allRes?.items ?? allRes?.Items ?? [];
              items = all.filter((m) => {
                const t = (m.title ?? m.Title ?? '').toLowerCase();
                const o = (m.originalTitle ?? m.OriginalTitle ?? '').toLowerCase();
                const display = getDisplayTitleForString(m.title ?? m.Title ?? '').toLowerCase();
                return t.includes(textLower) || o.includes(textLower) || display.includes(textLower);
              });
            }
            if (items.length >= 1) {
              const first = items[0];
              const id = first.id ?? first.Id;
              navigate(`/movie/${id}`);
              showToast(`Открыт: ${getDisplayTitleForString(first.title ?? first.Title)}`, 'success');
            } else {
              navigate(`/catalog?search=${encodeURIComponent(text)}`);
              showToast('Ничего не найдено', 'info');
            }
          })
          .catch(() => {
            navigate(`/catalog?search=${encodeURIComponent(text)}`);
            showToast('Ошибка поиска', 'error');
          });
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (e) => {
      showToast('Ошибка распознавания речи: ' + (e?.error || ''), 'error');
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.start();
    setIsListening(true);
    setTranscript('Слушаю...');
  }, [navigate, showToast, onAuthChange]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  return (
    <VoiceContext.Provider value={{ isListening, transcript, startListening, stopListening }}>
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) return { isListening: false, startListening: () => {}, stopListening: () => {} };
  return ctx;
}
