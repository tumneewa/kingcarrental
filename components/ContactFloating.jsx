"use client";

import { useState } from "react";
import { SHOP_LINE_ID, SHOP_WECHAT_QR_URL } from "../lib/shopConfig";
import { X } from "lucide-react";

export default function ContactFloating() {
  const [showWechat, setShowWechat] = useState(false);

  if (!SHOP_LINE_ID && !SHOP_WECHAT_QR_URL) return null;

  const lineUrl = SHOP_LINE_ID ? `https://line.me/R/ti/p/${encodeURIComponent(SHOP_LINE_ID)}` : null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5">
      {showWechat && SHOP_WECHAT_QR_URL && (
        <div className="w-60 rounded-xl bg-white p-4 text-center shadow-lg" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold" style={{ color: "#262626" }}>สแกนเพื่อแอด WeChat</p>
            <button onClick={() => setShowWechat(false)}>
              <X size={15} className="text-stone-400" />
            </button>
          </div>
          <img src={SHOP_WECHAT_QR_URL} alt="WeChat QR Code" className="mx-auto mt-3 h-44 w-44 rounded-lg object-contain" />
          <p className="mt-2 text-[11px] text-stone-400">เปิดแอป WeChat แล้วสแกน QR นี้เพื่อแอดเป็นเพื่อน</p>
        </div>
      )}

      {SHOP_WECHAT_QR_URL && (
        <button
          onClick={() => setShowWechat((v) => !v)}
          className="flex items-center justify-center rounded-full text-white shadow-lg"
          style={{ background: "#07C160", width: 52, height: 52, boxShadow: "0 4px 14px rgba(7,193,96,0.4)" }}
          title="ติดต่อทาง WeChat"
        >
          <span className="text-[9px] font-bold leading-tight">微信<br />WeChat</span>
        </button>
      )}

      {lineUrl && (
        <a
          href={lineUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center rounded-full text-white shadow-lg"
          style={{ background: "#06C755", width: 52, height: 52, boxShadow: "0 4px 14px rgba(6,199,85,0.4)" }}
          title="ติดต่อทาง LINE"
        >
          <span className="text-sm font-bold">LINE</span>
        </a>
      )}
    </div>
  );
}
