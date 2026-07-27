"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import generatePromptPayPayload from "promptpay-qr";
import QRCode from "qrcode";
import { supabase } from "../../lib/supabaseClient";
import { todayISO, daysBetween, money, formatDate, formatTime, shiftTime, calcRentalTotalWithTime, dateISO, buildMonthGrid } from "../../lib/utils";
import { SHOP_PROMPTPAY_ID, SHOP_DEPOSIT_AMOUNT, SHOP_LOGO_URL, SHOP_ADDRESS } from "../../lib/shopConfig";
import { t, useLang, localeFor } from "../../lib/i18n";
import LangSwitcher from "../../components/LangSwitcher";
import PhotoThumb from "../../components/PhotoThumb";
import { Phone, User, Clock, MapPin, Loader2, CheckCircle2, Car as CarIcon, QrCode, Upload, Users, DoorClosed, Settings2, Briefcase } from "lucide-react";

const INK = "#262626";
const RED = "#C0392B";
const RED_DARK = "#8E2A1E";
const PAPER = "#F2F2F0";

function Plate({ plate, province }) {
  return (
    <div
      className="relative inline-flex flex-col items-center rounded-[3px] px-3 py-1.5 select-none"
      style={{
        background: `linear-gradient(180deg, ${RED} 0%, ${RED_DARK} 100%)`,
        border: "2px solid white",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
        minWidth: 120,
      }}
    >
      <span className="absolute -top-[7px] rounded-sm bg-white px-1 text-[7px] font-bold tracking-wide" style={{ color: INK }}>
        รถเช่า
      </span>
      <span className="mt-1 font-semibold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, letterSpacing: 1 }}>
        {plate}
      </span>
      <span className="text-[9px] text-white/85">{province}</span>
    </div>
  );
}

export default function PublicBookingPage() {
  return (
    <Suspense fallback={null}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const searchParams = useSearchParams();
  const preselectCarId = searchParams.get("car");
  const [lang, setLang] = useLang();

  const [cars, setCars] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]); // { car_id, start_date, end_date }
  const [loaded, setLoaded] = useState(false);

  const [selectedCarId, setSelectedCarId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pickupTime, setPickupTime] = useState("10:00");
  const [hasLicense, setHasLicense] = useState(false);
  const [pickupLocation, setPickupLocation] = useState("");
  const [returnLocation, setReturnLocation] = useState("");
  const [returnTime, setReturnTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [done, setDone] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [confirmedDeposit, setConfirmedDeposit] = useState(0);
  const [confirmedInsurance, setConfirmedInsurance] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [paymentNotified, setPaymentNotified] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [uploadingSlip, setUploadingSlip] = useState(false);

  useEffect(() => {
    (async () => {
      const [carsRes, availRes] = await Promise.all([
        supabase.from("cars").select("*").neq("status", "maintenance"),
        supabase.from("public_bookings_availability").select("*"),
      ]);
      setCars(carsRes.data || []);
      setBookedRanges(availRes.data || []);
      setLoaded(true);
      if (preselectCarId) setSelectedCarId(preselectCarId);
    })();
  }, [preselectCarId]);

  const selectedCar = cars.find((c) => c.id === selectedCarId);
  const depositAmount = SHOP_DEPOSIT_AMOUNT; // ค่ามัดจำจ่ายผ่าน QR ตอนจอง — คงที่เสมอ ไม่ว่ารถคันไหน/กี่วัน
  const damageInsuranceAmount = selectedCar?.deposit_amount > 0 ? Number(selectedCar.deposit_amount) : 0; // ค่าประกันความเสียหาย แยกต่างหาก เรียกเก็บวันรับรถ

  // สร้าง QR พร้อมเพย์ใหม่ทุกครั้งที่เปลี่ยนรถที่เลือก เพราะแต่ละคันอาจตั้งค่ามัดจำไม่เท่ากัน
  useEffect(() => {
    if (!SHOP_PROMPTPAY_ID) return;
    (async () => {
      try {
        const payload = generatePromptPayPayload(SHOP_PROMPTPAY_ID, { amount: depositAmount });
        const url = await QRCode.toDataURL(payload, { margin: 1, width: 240 });
        setQrDataUrl(url);
      } catch (qrErr) {
        console.error("สร้างคิวอาร์โค้ดไม่สำเร็จ", qrErr);
      }
    })();
  }, []);

  const todayStr = todayISO();

  // เช็กเฉพาะวันที่อยู่ "ระหว่างกลาง" ของการจองอื่น (ไม่รวมวันรับ-วันคืนของเขา)
  // เพื่อให้ลูกค้าใหม่จองวันรับรถ/คืนรถชนกับวันคืน/รับของคนอื่นได้ แล้วไปเช็กเวลาจริงตอนส่งคำขอ
  const bookingOnDate = (carId, iso) =>
    bookedRanges.find((b) => b.car_id === carId && iso > b.start_date && iso < b.end_date);

  const isRangeConflict = (carId, startIso, endIso) => {
    let d = new Date(startIso);
    const endD = new Date(endIso);
    while (d <= endD) {
      if (bookingOnDate(carId, dateISO(d))) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  };

  const openCar = (carId) => {
    setSelectedCarId(carId);
    setCalendarMonth(new Date());
    setRangeStart(null);
    setRangeEnd(null);
    setSubmitError("");
  };

  const handleDayClick = (iso, disabled) => {
    if (disabled) return;
    if (!rangeStart || rangeEnd) { setRangeStart(iso); setRangeEnd(null); return; }
    if (iso < rangeStart) { setRangeStart(iso); setRangeEnd(null); return; }
    if (iso === rangeStart) return;
    if (isRangeConflict(selectedCarId, rangeStart, iso)) { setRangeStart(iso); setRangeEnd(null); }
    else setRangeEnd(iso);
  };

  const rentalCalc = selectedCar && rangeStart && rangeEnd
    ? calcRentalTotalWithTime(selectedCar, rangeStart, pickupTime, rangeEnd, returnTime)
    : { total: 0, days: 0, extraHours: 0, surcharge: 0 };
  const nDaysSel = rentalCalc.days;
  const totalSel = rentalCalc.total;

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!selectedCar || !rangeStart || !rangeEnd || !name.trim() || !phone.trim()) return;
    if (!hasLicense) {
      setSubmitError(t(lang, "licenseRequiredHint"));
      return;
    }
    if (SHOP_PROMPTPAY_ID && !slipFile) {
      setSubmitError(t(lang, "slipRequiredHint"));
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    const { data, error } = await supabase.rpc("request_booking", {
      p_car_id: selectedCar.id,
      p_customer_name: name.trim(),
      p_customer_phone: phone.trim(),
      p_start_date: rangeStart,
      p_end_date: rangeEnd,
      p_start_time: pickupTime,
      p_end_time: returnTime,
      p_rental_subtotal: rentalCalc.total - rentalCalc.surcharge,
      p_overtime_surcharge: rentalCalc.surcharge,
      p_deposit_amount: depositAmount,
      p_damage_insurance_amount: damageInsuranceAmount,
      p_pickup_location: pickupLocation.trim() || SHOP_ADDRESS,
      p_return_location: returnLocation.trim() || SHOP_ADDRESS,
    });
    if (error) {
      setSubmitting(false);
      setSubmitError(t(lang, "submitErrorGeneric"));
      return;
    }
    const newBookingId = data;
    setBookingId(newBookingId);
    setConfirmedTotal(totalSel);
    setConfirmedDeposit(depositAmount);
    setConfirmedInsurance(damageInsuranceAmount);

    // อัปโหลดสลิปและแจ้งชำระเงินทันที เพราะบังคับแนบมาตั้งแต่ตอนกดจองแล้ว
    if (slipFile) {
      setUploadingSlip(true);
      const ext = slipFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("payment-slips").upload(path, slipFile);
      let slipUrl = null;
      if (!uploadError) {
        const { data: pub } = supabase.storage.from("payment-slips").getPublicUrl(path);
        slipUrl = pub.publicUrl;
      }
      setUploadingSlip(false);
      await supabase.rpc("notify_payment", { p_booking_id: newBookingId, p_slip_url: slipUrl });
      setPaymentNotified(true);
    }

    setSubmitting(false);
    setDone(true);
  };

  const notifyPayment = async () => {
    if (!bookingId || !slipFile) return;
    setNotifying(true);
    let slipUrl = null;
    if (slipFile) {
      setUploadingSlip(true);
      const ext = slipFile.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("payment-slips").upload(path, slipFile);
      if (!uploadError) {
        const { data: pub } = supabase.storage.from("payment-slips").getPublicUrl(path);
        slipUrl = pub.publicUrl;
      }
      setUploadingSlip(false);
    }
    await supabase.rpc("notify_payment", { p_booking_id: bookingId, p_slip_url: slipUrl });
    setNotifying(false);
    setPaymentNotified(true);
  };

  if (!loaded) {
    return (
      <div className="paper-bg flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-stone-500"><Loader2 size={16} className="animate-spin" /> {t(lang, "loading")}</div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="paper-bg flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-sm">
          <CheckCircle2 size={36} style={{ color: RED }} className="mx-auto" />
          <p className="mt-3 text-sm font-bold" style={{ color: INK }}>{t(lang, "bookingSent")}</p>
          <p className="mt-1 text-xs text-stone-500">{t(lang, "bookingSentSub")}</p>

          {qrDataUrl && (
            <div className="mt-5 rounded-lg border border-black/5 p-4" style={{ background: PAPER }}>
              <p className="flex items-center justify-center gap-1.5 text-xs font-semibold" style={{ color: INK }}>
                <QrCode size={14} /> {t(lang, "scanPay")}
              </p>
              <img src={qrDataUrl} alt="พร้อมเพย์ QR" className="mx-auto mt-3 h-48 w-48" />
              <p className="mt-2 text-lg font-bold" style={{ color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(confirmedDeposit)}</p>
              <p className="text-[11px] text-stone-400">{t(lang, "depositNote")}</p>

              <div className="mt-2 rounded-lg bg-white/60 px-2.5 py-2 text-left text-[11px]">
                <div className="flex justify-between text-stone-500">
                  <span>{t(lang, "estimatedTotal")}</span>
                  <span style={{ color: INK }}>{money(confirmedTotal)}</span>
                </div>
                {confirmedInsurance > 0 && (
                  <div className="flex justify-between text-stone-500">
                    <span>{t(lang, "damageInsuranceLabel")}</span>
                    <span style={{ color: INK }}>+ {money(confirmedInsurance)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-500">
                  <span>{t(lang, "depositPaidNow")}</span>
                  <span style={{ color: INK }}>− {money(confirmedDeposit)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-dashed border-black/10 pt-1 font-semibold">
                  <span style={{ color: INK }}>{t(lang, "dueAtPickup")}</span>
                  <span style={{ color: RED }}>{money(Math.max(0, confirmedTotal + confirmedInsurance - confirmedDeposit))}</span>
                </div>
              </div>

              {confirmedInsurance > 0 && (
                <p className="mt-2 text-[10px] text-stone-400">{t(lang, "damageInsuranceNote", { amount: money(confirmedInsurance) })}</p>
              )}

              {paymentNotified ? (
                <p className="mt-3 text-xs font-semibold" style={{ color: RED }}>{t(lang, "paymentNotifiedDone")}</p>
              ) : (
                <>
                  <div className="mt-3">
                    <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/15 bg-white px-3 py-2.5 text-xs font-semibold" style={{ color: INK }}>
                      <Upload size={13} />
                      {slipFile ? slipFile.name : t(lang, "attachSlip")}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                  <button
                    onClick={notifyPayment}
                    disabled={notifying || uploadingSlip || !slipFile}
                    className="mt-2 w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: RED }}
                  >
                    {uploadingSlip ? t(lang, "uploadingSlip") : notifying ? t(lang, "notifying") : t(lang, "notifyPayment")}
                  </button>
                  {!slipFile && <p className="mt-1.5 text-[10px] text-stone-400">{t(lang, "slipRequiredHint")}</p>}
                </>
              )}
              <p className="mt-2 text-[10px] text-stone-400">{t(lang, "afterPayHint")}</p>
            </div>
          )}

          {bookingId && (
            <a
              href={`/booking/${bookingId}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block rounded-lg border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold"
              style={{ color: INK }}
            >
              {t(lang, "viewReceipt")}
            </a>
          )}

          <button
            onClick={() => { setDone(false); setSelectedCarId(null); setName(""); setPhone(""); setRangeStart(null); setRangeEnd(null); setSlipFile(null); setPaymentNotified(false); setBookingId(null); setSubmitError(""); setHasLicense(false); setPickupLocation(""); setReturnLocation(""); }}
            className="mt-2 rounded-lg px-4 py-2 text-xs font-semibold text-white"
            style={{ background: RED }}
          >
            {t(lang, "bookAnotherCar")}
          </button>
        </div>
      </div>
    );
  }

  const grid = selectedCarId ? buildMonthGrid(calendarMonth) : [];

  return (
    <div className="paper-bg min-h-screen w-full" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          {SHOP_LOGO_URL ? (
            <img src={SHOP_LOGO_URL} alt="โลโก้ร้าน" className="h-9 w-auto rounded-[3px] object-contain" />
          ) : (
            <div
              className="flex h-8 w-11 items-center justify-center rounded-[3px] border-2 border-white text-[9px] font-bold text-white"
              style={{ background: `linear-gradient(180deg, ${RED} 0%, ${RED_DARK} 100%)`, fontFamily: "'IBM Plex Mono', monospace", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)" }}
            >
              รถเช่า
            </div>
          )}
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: INK }}>{t(lang, "bookingPageTitle")}</p>
            <p className="text-[11px] leading-tight text-stone-400">{t(lang, "bookingPageSub")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LangSwitcher lang={lang} setLang={setLang} />
          <a href="/my-bookings" className="text-xs font-semibold text-stone-400 hover:text-stone-600">{t(lang, "myBookings")}</a>
          <a href="/" className="text-xs font-semibold text-stone-400 hover:text-stone-600">{t(lang, "backHome")}</a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-10">
        {!selectedCarId ? (
          <>
            <p className="mb-3 text-sm font-bold" style={{ color: INK }}>{t(lang, "selectCarPrompt")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {cars.map((c) => (
                <button key={c.id} onClick={() => openCar(c.id)} className="overflow-hidden rounded-xl border border-black/5 bg-white text-left shadow-sm transition-shadow hover:shadow-md">
                  <PhotoThumb car={c} className="aspect-square w-full" />
                  <div className="p-4">
                    <Plate plate={c.plate} province={c.province} />
                    <p className="mt-3 text-sm font-bold" style={{ color: INK }}>{c.brand} {c.model}</p>
                    <p className="text-xs text-stone-500">{c.type} · {c.seats || 5} {t(lang, "seatsUnit")} · {c.transmission || "อัตโนมัติ"}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-lg font-bold" style={{ color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(c.price_per_day)}</span>
                      <span className="text-xs text-stone-400">{t(lang, "perDay")}</span>
                    </div>
                  </div>
                </button>
              ))}
              {cars.length === 0 && <p className="text-sm text-stone-400">{t(lang, "noCars")}</p>}
            </div>
          </>
        ) : (
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <PhotoThumb car={selectedCar} className="aspect-square w-full" />
            <div className="p-5">
            <button onClick={() => setSelectedCarId(null)} className="mb-3 text-xs font-semibold text-stone-400 hover:text-stone-600">{t(lang, "backToSelect")}</button>

            <div className="flex items-center gap-3">
              <Plate plate={selectedCar.plate} province={selectedCar.province} />
              <div>
                <p className="text-sm font-bold" style={{ color: INK }}>{selectedCar.brand} {selectedCar.model}</p>
                <p className="text-xs text-stone-500">{money(selectedCar.price_per_day)} {t(lang, "perDay")}</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-black/5 py-2" style={{ background: PAPER }}>
                <Users size={16} className="mx-auto text-stone-400" />
                <p className="mt-1 text-[11px] font-semibold" style={{ color: INK }}>{selectedCar.seats || 5} {t(lang, "seatsUnit")}</p>
              </div>
              <div className="rounded-lg border border-black/5 py-2" style={{ background: PAPER }}>
                <DoorClosed size={16} className="mx-auto text-stone-400" />
                <p className="mt-1 text-[11px] font-semibold" style={{ color: INK }}>{selectedCar.doors || 4} {t(lang, "doorsUnit")}</p>
              </div>
              <div className="rounded-lg border border-black/5 py-2" style={{ background: PAPER }}>
                <Settings2 size={16} className="mx-auto text-stone-400" />
                <p className="mt-1 text-[11px] font-semibold" style={{ color: INK }}>{selectedCar.transmission || "อัตโนมัติ"}</p>
              </div>
              {(selectedCar.luggage_large > 0 || selectedCar.luggage_small > 0) && (
                <div className="col-span-3 rounded-lg border border-black/5 py-2" style={{ background: PAPER }}>
                  <Briefcase size={16} className="mx-auto text-stone-400" />
                  <p className="mt-1 text-[11px] font-semibold" style={{ color: INK }}>
                    {selectedCar.luggage_large > 0 && `${t(lang, "luggageLarge")} ${selectedCar.luggage_large}`}
                    {selectedCar.luggage_large > 0 && selectedCar.luggage_small > 0 && " · "}
                    {selectedCar.luggage_small > 0 && `${t(lang, "luggageSmall")} ${selectedCar.luggage_small}`}
                  </p>
                </div>
              )}
            </div>

            {Array.isArray(selectedCar.features) && selectedCar.features.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {selectedCar.features.map((f) => (
                  <span key={f} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] text-stone-600">
                    {f}
                  </span>
                ))}
              </div>
            )}

            {(selectedCar.price_3days > 0 || selectedCar.price_7days > 0 || selectedCar.price_monthly > 0) && (
              <div className="mt-3 rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
                <p className="text-[11px] font-semibold" style={{ color: INK }}>{t(lang, "priceTiersTitle")}</p>
                <div className="mt-1.5 space-y-1 text-[11px] text-stone-500">
                  <div className="flex justify-between"><span>{t(lang, "priceTier1")}</span><span className="font-medium" style={{ color: INK }}>{money(selectedCar.price_per_day)}/{t(lang, "daysUnit")}</span></div>
                  {selectedCar.price_3days > 0 && (
                    <div className="flex justify-between"><span>{t(lang, "priceTier3")}</span><span className="font-medium" style={{ color: INK }}>{money(selectedCar.price_3days)}/{t(lang, "daysUnit")}</span></div>
                  )}
                  {selectedCar.price_7days > 0 && (
                    <div className="flex justify-between"><span>{t(lang, "priceTier7")}</span><span className="font-medium" style={{ color: INK }}>{money(selectedCar.price_7days)}/{t(lang, "daysUnit")}</span></div>
                  )}
                  {selectedCar.price_monthly > 0 && (
                    <div className="flex justify-between"><span>{t(lang, "priceTierMonthly")}</span><span className="font-medium" style={{ color: INK }}>{money(selectedCar.price_monthly)}</span></div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100">‹</button>
              <p className="text-sm font-bold" style={{ color: INK }}>{calendarMonth.toLocaleDateString(localeFor(lang), { month: "long", year: "numeric" })}</p>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100">›</button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-stone-400">
              {t(lang, "weekdays").map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {grid.map((d, i) => {
                if (!d) return <div key={i} />;
                const iso = dateISO(d);
                const isPast = iso < todayStr;
                const booking = bookingOnDate(selectedCarId, iso);
                const endingHere = bookedRanges.find((b) => b.car_id === selectedCarId && b.end_date === iso);
                const startingHere = bookedRanges.find((b) => b.car_id === selectedCarId && b.start_date === iso);
                const boundaryBooking = endingHere || startingHere;
                const disabled = isPast || !!booking;
                const inRange = rangeStart && (rangeEnd ? iso >= rangeStart && iso <= rangeEnd : iso === rangeStart);
                let bg = "#EDEDEA", color = "#6B6B66";
                if (isPast) { bg = "#F1F1EE"; color = "#B4B4AC"; }
                else if (booking) { bg = "#FBE4E1"; color = "#C0392B"; }
                if (inRange) { bg = RED; color = "white"; }
                const tooltipParts = [];
                if (endingHere && !disabled) tooltipParts.push(t(lang, "tooltipAvailableFrom", { time: shiftTime(endingHere.end_time, 1) }));
                if (startingHere && !disabled) tooltipParts.push(t(lang, "tooltipReturnBy", { time: shiftTime(startingHere.start_time, -1) }));
                return (
                  <button key={i} type="button" onClick={() => handleDayClick(iso, disabled)} disabled={disabled}
                    title={tooltipParts.length > 0 ? tooltipParts.join(" · ") : undefined}
                    className="relative flex h-9 items-center justify-center rounded-md text-xs font-semibold disabled:cursor-not-allowed"
                    style={{ background: bg, color, cursor: disabled ? "not-allowed" : "pointer" }}>
                    {d.getDate()}
                    {boundaryBooking && !disabled && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full" style={{ background: inRange ? "white" : RED }} />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-4 text-[11px] text-stone-500">
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#EDEDEA" }} />{t(lang, "legendAvailable")}</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#FBE4E1" }} />{t(lang, "legendBooked")}</span>
              <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: RED }} />{t(lang, "legendSelected")}</span>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-stone-400">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: RED }} /> {t(lang, "sameDayHandoverNote")}
            </p>

            {rangeStart && (
              <div className="mt-4 rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold" style={{ color: INK }}>
                    {rangeEnd ? `${formatDate(rangeStart)} – ${formatDate(rangeEnd)} (${nDaysSel} ${t(lang, "daysUnit")})` : `${formatDate(rangeStart)} ${t(lang, "pickReturnDate")}`}
                  </p>
                  <button onClick={() => { setRangeStart(null); setRangeEnd(null); }} className="text-[11px] text-stone-400 hover:text-stone-600">{t(lang, "clear")}</button>
                </div>

                {rangeEnd && (() => {
                  // มีคันอื่นคืนรถวันเดียวกับที่เราจะรับรถไหม (ต้องรับหลังเวลานั้น + เผื่อ 1 ชม.)
                  const returningToday = bookedRanges.find((b) => b.car_id === selectedCarId && b.end_date === rangeStart);
                  // มีคันอื่นมารับรถวันเดียวกับที่เราจะคืนรถไหม (ต้องคืนก่อนเวลานั้น อย่างน้อย 1 ชม.)
                  const pickingUpSameDay = bookedRanges.find((b) => b.car_id === selectedCarId && b.start_date === rangeEnd);
                  if (!returningToday && !pickingUpSameDay) return null;
                  return (
                    <div className="mt-2 rounded-lg border border-dashed p-2.5 text-[11px]" style={{ borderColor: RED, color: RED, background: "#FBE4E1" }}>
                      {returningToday && <p>{t(lang, "hintReturningToday", { time: formatTime(returningToday.end_time) })}</p>}
                      {pickingUpSameDay && <p className={returningToday ? "mt-1" : ""}>{t(lang, "hintPickupSameDay", { time: formatTime(pickingUpSameDay.start_time) })}</p>}
                    </div>
                  );
                })()}

                {rangeEnd && (
                  <form onSubmit={submitRequest} className="mt-3 space-y-2.5">
                    <div className="flex gap-2">
                      <div className="flex flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
                        <Clock size={14} className="text-stone-400" />
                        <div className="w-full">
                          <label className="block text-[10px] text-stone-400">{t(lang, "pickupTimeLabel")}</label>
                          <input type="time" required value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-full text-sm outline-none" />
                        </div>
                      </div>
                      <div className="flex flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
                        <Clock size={14} className="text-stone-400" />
                        <div className="w-full">
                          <label className="block text-[10px] text-stone-400">{t(lang, "returnTimeLabel")}</label>
                          <input type="time" required value={returnTime} onChange={(e) => setReturnTime(e.target.value)} className="w-full text-sm outline-none" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" />
                      <div className="w-full">
                        <label className="block text-[10px] text-stone-400">{t(lang, "pickupLocationLabel")}</label>
                        <input
                          value={pickupLocation}
                          onChange={(e) => setPickupLocation(e.target.value)}
                          placeholder={SHOP_ADDRESS}
                          className="w-full text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex flex-1 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
                      <MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" />
                      <div className="w-full">
                        <label className="block text-[10px] text-stone-400">{t(lang, "returnLocationLabel")}</label>
                        <input
                          value={returnLocation}
                          onChange={(e) => setReturnLocation(e.target.value)}
                          placeholder={SHOP_ADDRESS}
                          className="w-full text-sm outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
                      <User size={14} className="text-stone-400" />
                      <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t(lang, "namePlaceholder")} className="w-full text-sm outline-none" />
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
                      <Phone size={14} className="text-stone-400" />
                      <input
                        required
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 15))}
                        placeholder={t(lang, "phonePlaceholder")}
                        className="w-full text-sm outline-none"
                      />
                    </div>

                    {SHOP_PROMPTPAY_ID && (
                      <div className="rounded-lg border border-black/10 bg-white p-3 text-center">
                        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold" style={{ color: INK }}>
                          <QrCode size={14} /> {t(lang, "scanPay")}
                        </p>
                        {qrDataUrl ? (
                          <img src={qrDataUrl} alt="พร้อมเพย์ QR" className="mx-auto mt-2 h-40 w-40" />
                        ) : (
                          <div className="mx-auto mt-2 flex h-40 w-40 items-center justify-center text-stone-300">
                            <Loader2 size={20} className="animate-spin" />
                          </div>
                        )}
                        <p className="mt-1.5 text-base font-bold" style={{ color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(depositAmount)}</p>
                        <p className="text-[11px] text-stone-400">{t(lang, "depositNote")}</p>

                        <div className="mt-2 rounded-lg bg-white/60 px-2.5 py-2 text-left text-[11px]">
                          <div className="flex justify-between text-stone-500">
                            <span>{t(lang, "estimatedTotal")}</span>
                            <span style={{ color: INK }}>{money(totalSel)}</span>
                          </div>
                          {damageInsuranceAmount > 0 && (
                            <div className="flex justify-between text-stone-500">
                              <span>{t(lang, "damageInsuranceLabel")}</span>
                              <span style={{ color: INK }}>+ {money(damageInsuranceAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-stone-500">
                            <span>{t(lang, "depositPaidNow")}</span>
                            <span style={{ color: INK }}>− {money(depositAmount)}</span>
                          </div>
                          <div className="mt-1 flex justify-between border-t border-dashed border-black/10 pt-1 font-semibold">
                            <span style={{ color: INK }}>{t(lang, "dueAtPickup")}</span>
                            <span style={{ color: RED }}>{money(Math.max(0, totalSel + damageInsuranceAmount - depositAmount))}</span>
                          </div>
                        </div>

                        {damageInsuranceAmount > 0 && (
                          <p className="mt-2 text-[10px] text-stone-400">
                            {t(lang, "damageInsuranceNote", { amount: money(damageInsuranceAmount) })}
                          </p>
                        )}

                        <label className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/15 bg-white px-3 py-2.5 text-xs font-semibold" style={{ color: INK }}>
                          <Upload size={13} />
                          {slipFile ? slipFile.name : t(lang, "attachSlip")}
                          <input type="file" accept="image/*" required className="hidden" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} />
                        </label>
                        {!slipFile && <p className="mt-1.5 text-[10px] text-stone-400">{t(lang, "slipRequiredHint")}</p>}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-stone-500">{t(lang, "estimatedTotal")}</span>
                      <span className="text-base font-bold" style={{ color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(totalSel)}</span>
                    </div>
                    {rentalCalc.extraHours > 0 && (
                      <p className="text-[10px] text-stone-400">{t(lang, "overtimeSurchargeNote", { hours: Math.round(rentalCalc.extraHours * 10) / 10, amount: money(rentalCalc.surcharge) })}</p>
                    )}

                    <label className="flex items-start gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs">
                      <input
                        type="checkbox"
                        checked={hasLicense}
                        onChange={(e) => setHasLicense(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-current"
                        style={{ color: RED }}
                      />
                      <span style={{ color: INK }}>{t(lang, "licenseConfirmLabel")}</span>
                    </label>

                    {submitError && <p className="text-xs font-medium text-red-600">{submitError}</p>}

                    <button
                      type="submit"
                      disabled={submitting || uploadingSlip || !hasLicense || (!!SHOP_PROMPTPAY_ID && !slipFile)}
                      className="w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: RED }}
                    >
                      {uploadingSlip ? t(lang, "uploadingSlip") : submitting ? t(lang, "submitting") : t(lang, "submitBooking")}
                    </button>
                    <p className="text-center text-[10px] text-stone-400">{t(lang, "notConfirmedNote")}</p>
                  </form>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
