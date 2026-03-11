import { useVoice } from '../context/VoiceContext';
import { IconMic } from './Icons';

export default function VoiceOverlay() {
  const { isListening, transcript, stopListening } = useVoice();
  if (!isListening) return null;
  return (
    <div className="voice-overlay active" onClick={stopListening} role="presentation">
      <div className="voice-ring" onClick={(e) => e.stopPropagation()}>
        <span className="mic-icon">
          <IconMic style={{ width: 48, height: 48 }} />
        </span>
      </div>
      <div className="voice-text">{transcript}</div>
      <div className="voice-hint">Скажите название фильма или жанр</div>
    </div>
  );
}
