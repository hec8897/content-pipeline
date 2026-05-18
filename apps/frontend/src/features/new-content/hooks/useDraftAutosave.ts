'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { type AutosaveStatus } from '@/features/new-content/components/AutosaveIndicator';
import { draftsApi } from '@/lib/api/drafts';
import type { CardNewsCardData, Draft } from '@/lib/api/types';
import type { CardNewsCard } from '@/types';

const AUTOSAVE_DEBOUNCE_MS = 800;

export type DraftSource = Pick<
  Draft,
  'id' | 'card_news' | 'blog_title' | 'blog_body' | 'blog_tags'
>;

export interface UseDraftAutosaveArgs {
  draft: DraftSource;
  /** ISO 문자열 또는 null. null 이면 hook 내에서 현재 시각으로 초기화. */
  initialSavedAtIso: string | null;
  onPatched: (updated: Draft) => void;
}

export function toEditorCards(cards: CardNewsCardData[]): CardNewsCard[] {
  return cards.map((c, i) => ({
    ...c,
    id: c.type === 'body' ? `body-${c.num ?? i}` : `${c.type}-${i}`,
  }));
}

export function fromEditorCards(cards: CardNewsCard[]): CardNewsCardData[] {
  return cards.map((c) => {
    // Phase 6 — bg_image 는 클라 in-memory only. autosave payload 에서 제외.
    const { id, bg_image, ...rest } = c;
    void id;
    void bg_image;
    return rest;
  });
}

function formatSavedAgo(savedAt: number, now: number): string {
  const diffSec = Math.max(0, Math.floor((now - savedAt) / 1000));
  if (diffSec < 10) return '방금';
  if (diffSec < 60) return `${diffSec}초 전`;
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  return `${hour}시간 전`;
}

export function useDraftAutosave({ draft, initialSavedAtIso, onPatched }: UseDraftAutosaveArgs) {
  const initialCards = useMemo(
    () => toEditorCards(draft.card_news ?? []),
    // 마운트 시점 한 번만 — 저장 후에도 local 우선.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [cards, setCardsState] = useState<CardNewsCard[]>(initialCards);
  const [blogTitle, setBlogTitleState] = useState(draft.blog_title ?? '');
  const [blogBody, setBlogBodyState] = useState(draft.blog_body ?? '');
  const [blogTags, setBlogTagsState] = useState<string[]>(draft.blog_tags);
  const [dirty, setDirty] = useState(false);

  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number>(() =>
    initialSavedAtIso ? new Date(initialSavedAtIso).getTime() : Date.now(),
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const savedAgo = formatSavedAgo(lastSavedAt, now);

  const pendingChangeRef = useRef(false);

  const mutation = useMutation({
    mutationFn: () =>
      draftsApi.patch(draft.id, {
        card_news: fromEditorCards(cards),
        blog_title: blogTitle,
        blog_body: blogBody,
        blog_tags: blogTags,
      }),
    onMutate: () => {
      setAutosaveStatus('saving');
    },
    onSuccess: (updated) => {
      onPatched(updated);
      setDirty(false);
      setLastSavedAt(Date.now());
      setAutosaveStatus('saved');
      if (pendingChangeRef.current) {
        pendingChangeRef.current = false;
        setDirty(true);
      }
    },
    onError: () => {
      setAutosaveStatus('failed');
    },
  });
  const { mutate, isPending } = mutation;

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      if (isPending) {
        pendingChangeRef.current = true;
      } else {
        mutate();
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [dirty, blogTitle, blogBody, blogTags, cards, isPending, mutate]);

  const isDirtyOrPending = dirty || isPending;

  useEffect(() => {
    if (!isDirtyOrPending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirtyOrPending]);

  const setCards = (next: CardNewsCard[]) => {
    setCardsState(next);
    setDirty(true);
  };
  const setBlogTitle = (next: string) => {
    setBlogTitleState(next);
    setDirty(true);
  };
  const setBlogBody = (next: string) => {
    setBlogBodyState(next);
    setDirty(true);
  };
  const setBlogTags = (next: string[]) => {
    setBlogTagsState(next);
    setDirty(true);
  };

  const retry = () => {
    if (isPending) return;
    mutate();
  };

  const confirmDiscardIfDirty = (
    message = '저장 중인 변경 사항이 있어요. 그대로 이동할까요?',
  ): boolean => {
    if (!isDirtyOrPending) return true;
    return window.confirm(message);
  };

  return {
    initialCards,
    cards,
    setCards,
    blogTitle,
    setBlogTitle,
    blogBody,
    setBlogBody,
    blogTags,
    setBlogTags,
    autosaveStatus,
    savedAgo,
    retry,
    isDirtyOrPending,
    confirmDiscardIfDirty,
  };
}
