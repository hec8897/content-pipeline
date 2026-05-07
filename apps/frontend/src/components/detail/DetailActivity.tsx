import { ACTIVITY_LOG } from "@/lib/mock-data";

const tagColor: Record<string, string> = {
  naver: "text-naver",
  insta: "text-accent",
  n8n: "text-warn",
  api: "text-text-2",
  db: "text-text-2",
  ai: "text-accent",
};

export function DetailActivity() {
  return (
    <div className="px-7 py-6">
      <div className="bg-surface border border-border rounded-[10px] overflow-hidden font-mono">
        <div className="grid grid-cols-[16px_56px_1fr_auto] gap-3 px-3.5 py-2 border-b border-border bg-surface-2 text-[10.5px] uppercase text-text-3 tracking-wide">
          <span />
          <span>tag</span>
          <span>note</span>
          <span>timestamp</span>
        </div>
        {ACTIVITY_LOG.map((e, i) => (
          <div
            key={i}
            className="grid grid-cols-[16px_56px_1fr_auto] gap-3 px-3.5 py-2 border-b border-border last:border-b-0 text-[12px]"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full mt-1.5 ${
                e.state === "ok" ? "bg-success" : "bg-danger"
              }`}
            />
            <span className={`uppercase font-semibold ${tagColor[e.tag] ?? "text-text-2"}`}>
              [{e.tag}]
            </span>
            <span className="text-text font-sans">{e.note}</span>
            <span className="text-text-3">{e.ts}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
