'use client';

import { PRESETS } from './presets';

export function BackgroundPalette({
  bg,
  onChange,
}: {
  bg: string;
  // preset 클릭 시 bg+fg 둘 다, custom color picker 시 bg 만 — 기존 동작 유지.
  onChange: (next: { bg: string; fg?: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-wide text-text-3">배경색</label>
      <div className="grid grid-cols-8 gap-1.5">
        {PRESETS.map((p) => {
          const active = bg === p.bg;
          return (
            <button
              key={p.bg}
              onClick={() => onChange({ bg: p.bg, fg: p.fg })}
              className={`aspect-square rounded ${
                active ? 'outline outline-2 outline-text' : 'outline outline-1 outline-border'
              }`}
              style={{ background: p.bg }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={bg}
          onChange={(e) => onChange({ bg: e.target.value })}
          className="w-7 h-7 rounded border border-border"
        />
        <span className="text-[11px] font-mono text-text-3">{bg}</span>
      </div>
    </div>
  );
}
