import { useVoice } from '../context/useVoice';
import { useI18n } from '../context/useI18n';
import { IconMic } from './Icons';

export default function VoiceOverlay() {
  const { isListening, transcript, stopListening } = useVoice();
  const { t } = useI18n();
  if (!isListening) return null;
  return (
    <div className="voice-overlay active" onClick={stopListening} role="presentation">
      <div className="voice-ring" onClick={(e) => e.stopPropagation()}>
        <span className="mic-icon">
          <IconMic style={{ width: 48, height: 48 }} />
        </span>
      </div>
      <div className="voice-text">{transcript}</div>
      <div className="voice-hint">{t('voice.hint')}</div>
    </div>
  );
}
