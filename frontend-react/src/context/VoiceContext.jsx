import { VoiceContext } from './useVoice';
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './useToast';
import { useAuth } from './useAuth';
import { useI18n } from '../context/useI18n';
import { searchMoviesCatalog, navigateFromSearchResults } from '../utils/movieSearchNavigate';


export function VoiceProvider({ children }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);
  const navigate = useNavigate();
  const { show: showToast } = useToast();
  const { onAuthChange } = useAuth();
  const { t } = useI18n();

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      showToast(t('voice.unsupported'), 'error');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
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
      let text = '';
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      text = text.trim();
      setTranscript(text || t('voice.listening'));

      const last = e.results[e.results.length - 1];
      if (!last?.isFinal) return;

      recognition.stop();
      searchMoviesCatalog(text, onAuthChange, { voice: true })
        .then(({ items, query }) => {
          if (!query) {
            showToast(t('voice.notRecognized'), 'error');
            return;
          }
          navigateFromSearchResults(items, query, navigate, showToast, t);
        })
        .catch(() => {
          showToast(t('header.toastSearchError'), 'error');
        });
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (e) => {
      showToast(t('voice.error', { code: e?.error || '' }), 'error');
      setIsListening(false);
      recognitionRef.current = null;
    };
    recognition.start();
    setIsListening(true);
    setTranscript(t('voice.listening'));
  }, [navigate, showToast, onAuthChange, t]);

  const stopListening = useCallback(() => {
    setIsListening(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* ignore */
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
