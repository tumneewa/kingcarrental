"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

const INK = "#262626";
const RED = "#C0392B";
const PAPER = "#F2F2F0";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }
    router.push("/staff");
    router.refresh();
  };

  return (
    <div
      className="flex min-h-screen w-full items-center justify-center"
      style={{ background: PAPER, fontFamily: "'Noto Sans Thai', sans-serif" }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <div
            className="flex h-8 w-11 items-center justify-center rounded-[3px] border-2 border-white text-[9px] font-bold text-white"
            style={{
              background: `linear-gradient(180deg, ${RED} 0%, #8E2A1E 100%)`,
              fontFamily: "'IBM Plex Mono', monospace",
              boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
            }}
          >
            รถเช่า
          </div>
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: INK }}>
              จัดการรถเช่า
            </p>
            <p className="text-[11px] leading-tight text-stone-400">เข้าสู่ระบบสำหรับพนักงาน</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="text-xs text-stone-500">อีเมล</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@rentalshop.com"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-stone-500">รหัสผ่าน</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none"
            />
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: RED }}
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-stone-400">
          ยังไม่มีบัญชี? ติดต่อผู้ดูแลร้านเพื่อขอให้สร้างบัญชีให้
        </p>
      </div>
    </div>
  );
}
