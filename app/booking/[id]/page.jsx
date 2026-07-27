"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { SHOP_NAME, SHOP_LOGO_URL, SHOP_ADDRESS, SHOP_PHONE } from "../../../lib/shopConfig";
import { money, formatDate, formatTime } from "../../../lib/utils";
import { Printer, CheckCircle2, Clock, XCircle, Loader2, AlertTriangle } from "lucide-react";

const INK = "#262626";
const RED = "#C0392B";
const RED_DARK = "#8E2A1E";
const PAPER = "#F2F2F0";

const STATUS_INFO = {
  pending: { label: "รอพนักงานยืนยัน", bg: "#FBE4E1", color: RED, icon: Clock },
  active: { label: "ยืนยันแล้ว — กำลังเช่า", bg: "#E7F3EC", color: "#3F7A4E", icon: CheckCircle2 },
  completed: { label: "คืนรถเรียบร้อยแล้ว", bg: "#EDEDEA", color: "#6B6B66", icon: CheckCircle2 },
  cancelled: { label: "ยกเลิกแล้ว", bg: "#F1F1EE", color: "#8A8A82", icon: XCircle },
};

export default function BookingReceiptPage() {
  const params = useParams();
  const [booking, setBooking] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_booking_details", { p_booking_id: params.id });
      if (error || !data || data.length === 0) {
        setNotFound(true);
      } else {
        setBooking(data[0]);
      }
      setLoaded(true);
    })();
  }, [params.id]);

  if (!loaded) {
    return (
      <div className="paper-bg flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 size={16} className="animate-spin" /> กำลังโหลด...
        </div>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="paper-bg flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-sm">
          <XCircle size={32} className="mx-auto text-stone-300" />
          <p className="mt-3 text-sm font-bold" style={{ color: INK }}>ไม่พบข้อมูลใบจองนี้</p>
          <p className="mt-1 text-xs text-stone-400">ลิงก์อาจไม่ถูกต้อง หรือใบจองถูกลบไปแล้ว</p>
        </div>
      </div>
    );
  }

  const nDays = Math.max(1, Math.round((new Date(booking.end_date) - new Date(booking.start_date)) / 86400000) || 1);
  const status = STATUS_INFO[booking.status] || STATUS_INFO.pending;
  const StatusIcon = status.icon;

  return (
    <div className="paper-bg min-h-screen w-full py-8 print:bg-white" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
      <div className="mx-auto max-w-md px-4">
        <div className="rounded-xl bg-white p-6 shadow-sm print:shadow-none">
          {/* header */}
          <div className="flex items-center gap-2 border-b border-dashed border-black/10 pb-4">
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
            <div>
              <p className="text-sm font-bold" style={{ color: INK }}>{SHOP_NAME}</p>
              <p className="text-[11px] text-stone-400">ใบยืนยันการจองรถเช่า</p>
            </div>
          </div>

          {/* status */}
          <div className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ background: status.bg }}>
            <StatusIcon size={16} style={{ color: status.color }} />
            <span className="text-sm font-semibold" style={{ color: status.color }}>{status.label}</span>
          </div>

          {/* booking id */}
          <p className="mt-3 text-center text-[11px] text-stone-400">
            เลขที่การจอง: <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{booking.id.slice(0, 8).toUpperCase()}</span>
          </p>

          {/* car info */}
          <div className="mt-4 rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
            <p className="text-[11px] font-semibold text-stone-500">รถที่จอง</p>
            <p className="mt-0.5 text-sm font-bold" style={{ color: INK }}>{booking.car_brand} {booking.car_model}</p>
            <p className="text-xs text-stone-500" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {booking.car_plate} {booking.car_province}
            </p>
          </div>

          {/* customer info */}
          <div className="mt-3 rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
            <p className="text-[11px] font-semibold text-stone-500">ผู้เช่า</p>
            <p className="mt-0.5 text-sm font-bold" style={{ color: INK }}>{booking.member_name}</p>
            <p className="text-xs text-stone-500">{booking.member_phone}</p>
          </div>

          {/* dates */}
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
              <p className="text-[11px] font-semibold text-stone-500">วันรับรถ</p>
              <p className="mt-0.5 text-sm font-bold" style={{ color: INK }}>{formatDate(booking.start_date)}</p>
              <p className="text-xs text-stone-500">{formatTime(booking.start_time)}</p>
            </div>
            <div className="rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
              <p className="text-[11px] font-semibold text-stone-500">วันคืนรถ</p>
              <p className="mt-0.5 text-sm font-bold" style={{ color: INK }}>{formatDate(booking.end_date)}</p>
              <p className="text-xs text-stone-500">{formatTime(booking.end_time)}</p>
            </div>
          </div>

          {/* price breakdown */}
          <div className="mt-3 rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
            <p className="text-[11px] font-semibold text-stone-500">รายละเอียดค่าใช้จ่าย</p>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">ค่าเช่ารถ ({nDays} วัน)</span>
                <span style={{ color: INK }}>{money(booking.rental_subtotal || booking.total)}</span>
              </div>
              {booking.overtime_surcharge > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">ค่าปรับคืนรถช้า</span>
                  <span style={{ color: INK }}>{money(booking.overtime_surcharge)}</span>
                </div>
              )}
              {booking.damage_insurance_amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">ค่าประกันความเสียหาย</span>
                  <span style={{ color: INK }}>{money(booking.damage_insurance_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-dashed border-black/10 pt-1.5">
                <span className="text-stone-500">รวมทั้งหมด</span>
                <span style={{ color: INK }}>{money(booking.total + (booking.damage_insurance_amount || 0))}</span>
              </div>
              {booking.deposit_amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">หัก ค่ามัดจำที่จ่ายแล้ว</span>
                  <span style={{ color: INK }}>− {money(booking.deposit_amount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-dashed border-black/10 pt-1.5 font-semibold">
                <span style={{ color: INK }}>ยอดที่ต้องชำระวันรับรถ</span>
                <span style={{ color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {money(Math.max(0, booking.total + (booking.damage_insurance_amount || 0) - (booking.deposit_amount || 0)))}
                </span>
              </div>
            </div>
            {booking.damage_insurance_amount > 0 && (
              <p className="mt-2 text-[10px] text-stone-400">
                * ค่าประกันความเสียหาย {money(booking.damage_insurance_amount)} จะ<span className="font-semibold">ได้รับคืนเต็มจำนวนในวันคืนรถ</span> หากไม่พบความเสียหายเพิ่มเติมกับตัวรถ
              </p>
            )}
          </div>

          {/* driving license notice */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-dashed p-3" style={{ borderColor: "#D9C48A", background: "#FBF6E9" }}>
            <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: "#8A6D1F" }} />
            <p className="text-[11px]" style={{ color: "#6B5416" }}>
              กรุณาเตรียม<span className="font-semibold">ใบขับขี่รถยนต์ตัวจริง (ที่ยังไม่หมดอายุ)</span> มาแสดงในวันรับรถ หากไม่มีใบขับขี่ ทางร้านขออนุญาตปฏิเสธการให้บริการ
            </p>
          </div>

          {/* payment status */}
          <div className="mt-3 flex items-center justify-between rounded-lg px-3 py-2.5" style={{ background: PAPER }}>
            <span className="text-xs text-stone-500">สถานะการชำระเงิน</span>
            <span className="text-xs font-semibold" style={{ color: booking.payment_status === "paid" ? "#3F7A4E" : RED }}>
              {booking.payment_status === "paid" ? "ชำระเงินแล้ว" : booking.payment_status === "awaiting_verification" ? "รอตรวจสอบการชำระเงิน" : "ยังไม่ได้ชำระเงิน"}
            </span>
          </div>

          {/* shop contact */}
          <div className="mt-4 border-t border-dashed border-black/10 pt-3 text-center text-[11px] text-stone-400">
            <p>{SHOP_ADDRESS}</p>
            <p className="mt-0.5">โทร {SHOP_PHONE}</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white print:hidden"
          style={{ background: RED }}
        >
          <Printer size={15} /> พิมพ์ / บันทึกเป็น PDF
        </button>
      </div>
    </div>
  );
}
