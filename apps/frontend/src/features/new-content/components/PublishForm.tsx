'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import type { Channel } from '@/types';
import { ChannelSelector } from '@/features/new-content/components/ChannelSelector';
import {
  ScheduleSelector,
  type ScheduleMode,
} from '@/features/new-content/components/ScheduleSelector';
import { routes } from '@/lib/routes';

export function PublishForm() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Record<Channel, boolean>>({
    naver: true,
    insta: true,
  });
  const [mode, setMode] = useState<ScheduleMode>('now');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  const toggle = (ch: Channel) => setEnabled((prev) => ({ ...prev, [ch]: !prev[ch] }));

  const submit = () => {
    router.push(routes.queue);
  };

  const anyChannel = enabled.naver || enabled.insta;

  return (
    <div className="flex-1 flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-[680px] flex flex-col gap-5">
        <header className="flex flex-col gap-1">
          <span className="text-[11.5px] uppercase tracking-wider text-text-3 font-mono">
            STEP 05 · 발행
          </span>
          <h1 className="text-[22px] font-semibold text-text">어디에 발행할까요?</h1>
        </header>

        <ChannelSelector enabled={enabled} onToggle={toggle} />

        <ScheduleSelector
          mode={mode}
          onModeChange={setMode}
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
        />

        <button
          onClick={submit}
          disabled={!anyChannel}
          className="inline-flex items-center justify-center gap-2 bg-text text-white rounded-md px-5 py-3 text-[13px] font-semibold hover:bg-black disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" /> 발행하기
        </button>

        <p className="text-[11px] text-text-3 text-center">
          발행 큐에 추가되며 백엔드 → n8n webhook으로 전달됩니다.
        </p>
      </div>
    </div>
  );
}
