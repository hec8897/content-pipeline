'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

import type { InterviewMessage, InterviewSession } from '@/lib/api/types';

export type NewContentState = {
  topicTitle: string;
  setTopicTitle: Dispatch<SetStateAction<string>>;
  topicId: string | null;
  setTopicId: Dispatch<SetStateAction<string | null>>;
  session: InterviewSession | null;
  setSession: Dispatch<SetStateAction<InterviewSession | null>>;
  messages: InterviewMessage[];
  setMessages: Dispatch<SetStateAction<InterviewMessage[]>>;
  appendMessage: (m: InterviewMessage) => void;
  reset: () => void;
};

const Ctx = createContext<NewContentState | null>(null);

export function NewContentProvider({ children }: { children: ReactNode }) {
  const [topicTitle, setTopicTitle] = useState('');
  const [topicId, setTopicId] = useState<string | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<InterviewMessage[]>([]);

  const appendMessage = useCallback(
    (m: InterviewMessage) => setMessages((prev) => [...prev, m]),
    [],
  );

  const reset = useCallback(() => {
    setTopicTitle('');
    setTopicId(null);
    setSession(null);
    setMessages([]);
  }, []);

  return (
    <Ctx.Provider
      value={{
        topicTitle,
        setTopicTitle,
        topicId,
        setTopicId,
        session,
        setSession,
        messages,
        setMessages,
        appendMessage,
        reset,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useNewContent() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNewContent must be used inside NewContentProvider');
  return ctx;
}
