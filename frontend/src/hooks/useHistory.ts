import { useRef, useState } from 'react';
import { Stroke } from '../components/Canvas';

export interface HistorySnapshot {
  id: string;
  timestamp: number;
  strokes: Stroke[];
}

export function useHistory(initial: Stroke[] = []) {
  const past = useRef<Stroke[][]>([]);
  const future = useRef<Stroke[][]>([]);
  const [present, setPresent] = useState<Stroke[]>(initial);
  const [versions, setVersions] = useState<HistorySnapshot[]>([]);

  const commit = (next: Stroke[]) => {
    past.current.push(present);
    future.current = [];
    setPresent(next);

    setVersions((v) => [
      ...v,
      {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        strokes: next,
      },
    ]);
  };

  const undo = () => {
    if (past.current.length === 0) return;
    const prev = past.current.pop()!;
    future.current.push(present);
    setPresent(prev);
  };

  const redo = () => {
    if (future.current.length === 0) return;
    const next = future.current.pop()!;
    past.current.push(present);
    setPresent(next);
  };

  const restore = (id: string) => {
    const snap = versions.find((v) => v.id === id);
    if (snap) commit(snap.strokes);
  };

  return { strokes: present, commit, undo, redo, versions, restore };
}
