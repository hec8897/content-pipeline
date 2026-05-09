'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type NewContentState = {
  topic: string;
  setTopic: (s: string) => void;
  answers: string[];
  setAnswer: (idx: number, value: string) => void;
};

const Ctx = createContext<NewContentState | null>(null);

export function NewContentProvider({ children }: { children: ReactNode }) {
  const [topic, setTopic] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);

  const setAnswer = (idx: number, value: string) =>
    setAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });

  return <Ctx.Provider value={{ topic, setTopic, answers, setAnswer }}>{children}</Ctx.Provider>;
}

export function useNewContent() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNewContent must be used inside NewContentProvider');
  return ctx;
}
