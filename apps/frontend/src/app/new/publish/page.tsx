'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Send, Zap } from 'lucide-react';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { Panel } from '@/components/ui/Panel';
import { routes } from '@/lib/routes';
import type { Channel } from '@/types';

const CHANNELS: { key: Channel; label: string; sub: string }[] = [
  {
    key: 'naver',
    label: '네이버 블로그',
    sub: '메일 포스팅 · blog.naver.com/minji.daily',
  },
  {
    key: 'insta',
    label: '인스타그램',
    sub: 'Graph API · @minji.daily',
  },
];

export default function NewPublishPage() {
  const router = useRouter();
  const [enabled, setEnabled] = useState<Record<Channel, boolean>>({
    naver: true,
    insta: true,
  });
  const [mode, setMode] = useState<'now' | 'scheduled'>('now');
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

        <Panel title="채널 선택">
          <div className="flex flex-col">
            {CHANNELS.map((c) => {
              const on = enabled[c.key];
              return (
                <button
                  key={c.key}
                  onClick={() => toggle(c.key)}
                  className={`flex items-center gap-3 px-3.5 py-3 border-t border-border first:border-t-0 text-left transition-colors ${
                    on ? 'bg-accent-soft' : ''
                  }`}
                >
                  <ChannelIcon channel={c.key} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-text">{c.label}</div>
                    <div className="text-[11px] text-text-3">{c.sub}</div>
                  </div>
                  <span
                    className={`w-9 h-5 rounded-full relative transition-colors ${
                      on ? 'bg-accent' : 'bg-border-strong'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                        on ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        </Panel>

        <Panel title="발행 시점">
          <div className="px-3.5 py-3 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setMode('now')}
                className={`px-3 py-2.5 rounded-md border text-[12.5px] inline-flex items-center justify-center gap-1.5 ${
                  mode === 'now'
                    ? 'border-accent bg-accent-soft text-accent font-semibold'
                    : 'border-border text-text-2'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> 즉시 발행
              </button>
              <button
                onClick={() => setMode('scheduled')}
                className={`px-3 py-2.5 rounded-md border text-[12.5px] inline-flex items-center justify-center gap-1.5 ${
                  mode === 'scheduled'
                    ? 'border-accent bg-accent-soft text-accent font-semibold'
                    : 'border-border text-text-2'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" /> 예약 발행
              </button>
            </div>

            {mode === 'scheduled' && (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px]"
                />
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[12.5px]"
                />
              </div>
            )}
          </div>
        </Panel>

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
