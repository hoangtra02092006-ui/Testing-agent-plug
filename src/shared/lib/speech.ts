import { useEffect, useState } from 'react';

function englishVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined;
  return window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith('en'));
}

/** Whether an English voice is available; voices load asynchronously on some browsers. */
export function useEnglishVoice(): boolean {
  const [available, setAvailable] = useState(() => Boolean(englishVoice()));
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const update = () => setAvailable(Boolean(englishVoice()));
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, []);
  return available;
}

export function speak(text: string): void {
  const voice = englishVoice();
  if (!voice) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}
