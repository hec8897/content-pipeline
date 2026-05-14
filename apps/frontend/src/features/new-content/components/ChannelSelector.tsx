import type { Channel } from '@/types';
import { ChannelIcon } from '@/components/ui/ChannelIcon';
import { Panel } from '@/components/ui/Panel';

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

type Props = {
  enabled: Record<Channel, boolean>;
  onToggle: (channel: Channel) => void;
};

export function ChannelSelector({ enabled, onToggle }: Props) {
  return (
    <Panel title="채널 선택">
      <div className="flex flex-col">
        {CHANNELS.map((c) => {
          const on = enabled[c.key];
          return (
            <button
              key={c.key}
              onClick={() => onToggle(c.key)}
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
  );
}
