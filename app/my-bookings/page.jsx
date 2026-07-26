"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { SHOP_NAME, SHOP_LOGO_URL } from "../../lib/shopConfig";
import { money, formatDate, formatTime } from "../../lib/utils";
import { Search, Loader2, Phone, ChevronRight, Car as CarIcon } from "lucide-react";

const INK = "#262626";
const RED = "#C0392B";
const RED_DARK = "#8E2A1E";
const PAPER = "#F2F2F0";

const STATUS_LABEL = {
  pending: { label: "รอยืนยัน", bg: "white", color: RED, border: `1px solid ${RED}` },
  active: { label: "กำลังเช่า", bg: "#FBE4E1", color: RED },
  completed: { label: "คืนแล้ว", bg: "#EDEDEA", color: "#6B6B66" },
  cancelled: { label: "ยกเลิก", bg: "#F1F1EE", color: "#8A8A82" },
};

export default function MyBookingsPage() {
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSearching(true);
    setSearched(true);
    const { data, error } = await supabase.rpc("get_bookings_by_phone", { p_phone: phone.trim() });
    setResults(error ? [] : data || []);
    setSearching(false);
  };

  return (
    <div className="paper-bg min-h-screen w-full" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
      <header className="mx-auto flex max-w-lg items-center gap-2 px-5 py-5">
        {SHOP_LOGO_URL ? (
          <img src={SHOP_LOGO_URL} alt={SHOP_NAME} className="h-9 w-auto rounded-[3px] object-contain" />
        ) : (
          <div
            className="flex h-8 w-11 items-center justify-center rounded-[3px] border-2 border-white text-[9px] font-bold text-white"
            style={{ background: `linear-gradient(180deg, ${RED} 0%, ${RED_DARK} 100%)`, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            รถเช่า
          </div>
        )}
        <p className="text-sm font-bold" style={{ color: INK }}>{SHOP_NAME}</p>
      </header>

      <main className="mx-auto max-w-lg px-5 pb-16">
        <h1 className="text-xl font-bold" style={{ color: INK }}>ตรวจสอบการจองของฉัน</h1>
        <p className="mt-1 text-sm text-stone-500">กรอกเบอร์โทรที่ใช้ตอนจอง เพื่อดูรายการจองทั้งหมดของคุณ</p>

        <form onSubmit={handleSearch} className="mt-5 flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5">
            <Phone size={15} className="text-stone-400" />
            <input
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="เบอร์โทรศัพท์"
              className="w-full text-sm outline-none"
            />
          </div>
          <button type="submit" disabled={searching} className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: RED }}>
            {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            ค้นหา
          </button>
        </form>

        {searched && !searching && (
          <div className="mt-6">
            {results && results.length > 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-stone-400">พบ {results.length} รายการ</p>
                {results.map((b) => {
                  const s = STATUS_LABEL[b.status] || STATUS_LABEL.pending;
                  return (
                    <a
                      key={b.id}
                      href={`/booking/${b.id}`}
                      className="flex items-center justify-between rounded-xl border border-black/5 bg-white p-4 shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: PAPER }}>
                          <CarIcon size={18} className="text-stone-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: INK }}>{b.car_brand} {b.car_model}</p>
                          <p className="text-xs text-stone-500">
                            {formatDate(b.start_date)} {formatTime(b.start_time)} – {formatDate(b.end_date)} {formatTime(b.end_time)}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                              style={{ background: s.bg, color: s.color, border: s.border }}
                            >
                              {s.label}
                            </span>
                            <span className="text-xs font-bold" style={{ color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(b.total)}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-stone-300" />
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-black/10 bg-white p-8 text-center">
                <p className="text-sm text-stone-400">ไม่พบการจองที่ใช้เบอร์นี้</p>
                <p className="mt-1 text-xs text-stone-400">เช็กว่ากรอกเบอร์ถูกต้องตรงกับตอนจองหรือไม่</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
