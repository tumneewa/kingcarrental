"use client";

const RED = "#C0392B";
const INK = "#262626";

export default function LangSwitcher({ lang, setLang }) {
  return (
    <div className="flex items-center gap-0.5 rounded-full bg-black/5 p-0.5">
      {[["th", "ไทย"], ["en", "EN"], ["zh", "中"]].map(([code, label]) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className="rounded-full px-2 py-1 text-[11px] font-semibold"
          style={{ background: lang === code ? RED : "transparent", color: lang === code ? "white" : INK }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
