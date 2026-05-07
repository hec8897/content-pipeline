"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { routes } from "@/lib/routes";

const STEPS = [
  { id: 1, label: "인터뷰 분석" },
  { id: 2, label: "카드뉴스 작성" },
  { id: 3, label: "블로그 작성" },
  { id: 4, label: "이미지 생성" },
];

const LOG_LINES = [
  "[ai] 인터뷰 답변 임베딩 (5/5)",
  "[ai] 핵심 메시지 추출",
  "[ai] 카드뉴스 8장 생성 — gemini-2.5-flash",
  "[ai] 블로그 본문 작성 (~1500자)",
  "[render] HTML → Image 8장",
  "[done] 양산 완료. 편집 화면으로 이동합니다.",
];

export default function NewGeneratePage() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    STEPS.forEach((_, i) => {
      stepTimers.push(setTimeout(() => setActive(i + 1), (i + 1) * 800));
    });
    LOG_LINES.forEach((line, i) => {
      stepTimers.push(
        setTimeout(() => setLogs((prev) => [...prev, line]), 400 + i * 600),
      );
    });
    const done = setTimeout(() => router.push(routes.newEdit), 4500);
    stepTimers.push(done);
    return () => stepTimers.forEach((t) => clearTimeout(t));
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[640px] flex flex-col items-center gap-8">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
        <div className="text-center">
          <h2 className="text-[18px] font-semibold text-text">
            콘텐츠를 양산하고 있어요
          </h2>
          <p className="text-[12.5px] text-text-2 mt-1">
            보통 47초 정도 걸려요
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
          {STEPS.map((s, i) => {
            const isActive = active === i + 1;
            const done = active > i + 1;
            return (
              <div
                key={s.id}
                className={`p-2.5 rounded-md border text-[11.5px] flex flex-col gap-1 ${
                  isActive
                    ? "border-accent bg-accent-soft text-accent"
                    : done
                      ? "border-border bg-surface text-text"
                      : "border-border bg-surface text-text-3"
                }`}
              >
                <span className="text-[10px] font-mono">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{s.label}</span>
              </div>
            );
          })}
        </div>

        <div className="w-full bg-text rounded-md p-3 max-h-48 overflow-auto font-mono text-[11px] text-white/80">
          {logs.map((l, i) => (
            <div key={i} className="leading-relaxed">
              {l}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
