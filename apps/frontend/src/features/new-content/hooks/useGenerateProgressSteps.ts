'use client';

import { useCallback, useEffect, useState } from 'react';

import { GENERATE_STEPS } from '@/features/new-content/components/GenerateProgress';

// 백엔드 generate 는 단일 호출이라 실제 스텝 신호가 없다. start() 이후 일정 간격으로
// 스텝/로그를 진행하는 시늉을 하고, complete()/fail() 로 멈춘다. GenerateController(작성)
// 와 RegenerateProgressModal(상세) 가 공유.
const STEP_INTERVAL_MS = 8000;

/** logLines 의 마지막 `[done]` 라인을 1회만 덧붙인다. */
function appendDoneLine(prev: string[], logLines: readonly string[]): string[] {
  const done = logLines[logLines.length - 1];
  if (!done || !done.startsWith('[done]')) return prev;
  if (prev[prev.length - 1] === done) return prev;
  return [...prev, done];
}

export function useGenerateProgressSteps(logLines: readonly string[]) {
  const [active, setActive] = useState(1);
  const [logs, setLogs] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  const start = useCallback(() => {
    setActive(1);
    setLogs(logLines.length > 0 ? [logLines[0]] : []);
    setRunning(true);
  }, [logLines]);

  const complete = useCallback(() => {
    setRunning(false);
    setActive(GENERATE_STEPS.length);
    setLogs((prev) => appendDoneLine(prev, logLines));
  }, [logLines]);

  const fail = useCallback(() => {
    setRunning(false);
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setActive((a) => Math.min(a + 1, GENERATE_STEPS.length));
      setLogs((prev) => {
        const next = logLines[prev.length];
        if (!next || next.startsWith('[done]')) return prev;
        return [...prev, next];
      });
    }, STEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [running, logLines]);

  return { active, logs, start, complete, fail };
}
