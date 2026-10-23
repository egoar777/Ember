import { createContext, useContext } from 'react';

export const VoiceContext = createContext(null);

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) return { isListening: false, startListening: () => {}, stopListening: () => {} };
  return ctx;
}
