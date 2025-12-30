import { useRef, useState } from 'react';

export function useVoiceAnnotations() {
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [recordings, setRecordings] = useState<string[]>([]);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRef.current = recorder;

    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      chunks.current = [];
      setRecordings((r) => [...r, URL.createObjectURL(blob)]);
    };

    recorder.start();
  };

  const stop = () => mediaRef.current?.stop();

  return { start, stop, recordings };
}
