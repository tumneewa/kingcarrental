"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { money } from "../lib/utils";
import { SHOP_NAME, SHOP_TAGLINE, SHOP_ABOUT, SHOP_ADDRESS, SHOP_PHONE, SHOP_HOURS, SHOP_LOGO_URL, SHOP_HERO_IMAGE_URL } from "../lib/shopConfig";
import { t, useLang } from "../lib/i18n";
import LangSwitcher from "../components/LangSwitcher";
import { MapPin, Phone as PhoneIcon, Clock, Car as CarIcon, ShieldCheck, BadgeCheck } from "lucide-react";

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

export default function HomePage() {
  const [cars, setCars] = useState([]);
  const [lang, setLang] = useLang();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cars").select("*").neq("status", "maintenance").limit(6);
      setCars(data || []);
    })();
  }, []);

  return (
    <div style={{ background: PAPER, fontFamily: "'Noto Sans Thai', sans-serif" }}>
      {/* ---------- header ---------- */}
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          {SHOP_LOGO_URL ? (
            <img src={SHOP_LOGO_URL} alt={SHOP_NAME} className="h-9 w-auto rounded-[3px]" />
          ) : (
            <div
              className="flex h-8 w-11 items-center justify-center rounded-[3px] border-2 border-white text-[9px] font-bold text-white"
              style={{ background: `linear-gradient(180deg, ${RED} 0%, ${RED_DARK} 100%)`, fontFamily: "'IBM Plex Mono', monospace", boxShadow: "0 0 0 1px rgba(0,0,0,0.15)" }}
            >
              รถเช่า
            </div>
          )}
          <p className="text-sm font-bold" style={{ color: INK }}>{SHOP_NAME}</p>
        </div>
        <div className="flex items-center gap-4">
          <LangSwitcher lang={lang} setLang={setLang} />
          <a href="/staff/login" className="text-xs font-medium text-stone-400 hover:text-stone-600">{t(lang, "staffLogin")}</a>
          <a href="/book" className="rounded-lg px-4 py-2 text-xs font-bold text-white" style={{ background: RED }}>{t(lang, "bookNow")}</a>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section
        className="relative mx-auto max-w-5xl px-5 pb-14 pt-8 sm:pt-16"
        style={
          SHOP_HERO_IMAGE_URL
            ? { backgroundImage: `linear-gradient(rgba(38,38,38,0.55), rgba(38,38,38,0.55)), url(${SHOP_HERO_IMAGE_URL})`, backgroundSize: "cover", backgroundPosition: "center", borderRadius: 16 }
            : {}
        }
      >
        <div className="max-w-2xl">
          <h1
            className="text-3xl font-extrabold leading-tight sm:text-4xl"
            style={{ color: SHOP_HERO_IMAGE_URL ? "white" : INK }}
          >
            {SHOP_TAGLINE}
          </h1>
          <p className="mt-4 text-sm sm:text-base" style={{ color: SHOP_HERO_IMAGE_URL ? "rgba(255,255,255,0.85)" : "#78716c" }}>{SHOP_ABOUT}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="/book" className="rounded-lg px-5 py-3 text-sm font-bold text-white" style={{ background: RED }}>
              {t(lang, "ctaSeeAvailable")}
            </a>
            <a href="#fleet" className="rounded-lg border border-black/10 bg-white px-5 py-3 text-sm font-bold" style={{ color: INK }}>
              {t(lang, "ctaSeeAll")}
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-6 text-xs" style={{ color: SHOP_HERO_IMAGE_URL ? "rgba(255,255,255,0.85)" : "#78716c" }}>
            <span className="flex items-center gap-1.5"><ShieldCheck size={15} style={{ color: SHOP_HERO_IMAGE_URL ? "white" : RED }} /> {t(lang, "trustInspected")}</span>
            <span className="flex items-center gap-1.5"><BadgeCheck size={15} style={{ color: SHOP_HERO_IMAGE_URL ? "white" : RED }} /> {t(lang, "trustPricing")}</span>
            <span className="flex items-center gap-1.5"><Clock size={15} style={{ color: SHOP_HERO_IMAGE_URL ? "white" : RED }} /> {t(lang, "trustOnline")}</span>
          </div>
        </div>
      </section>

      {/* ---------- fleet gallery ---------- */}
      <section id="fleet" className="mx-auto max-w-5xl px-5 pb-16">
        <h2 className="text-xl font-bold" style={{ color: INK }}>{t(lang, "fleetTitle")}</h2>
        <p className="mt-1 text-sm text-stone-500">{t(lang, "fleetSub")}</p>

        {cars.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
            <CarIcon size={28} className="mx-auto text-stone-300" />
            <p className="mt-2 text-sm text-stone-400">{t(lang, "noCarsSoon")}</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
                {c.photo_url ? (
                  <img src={c.photo_url} alt={`${c.brand} ${c.model}`} className="h-36 w-full object-cover" />
                ) : (
                  <div className="flex h-36 w-full items-center justify-center bg-[#EDEDEA]">
                    <CarIcon size={30} className="text-[#B4B4AC]" />
                  </div>
                )}
                <div className="p-4">
                  <Plate plate={c.plate} province={c.province} />
                  <p className="mt-3 text-sm font-bold" style={{ color: INK }}>{c.brand} {c.model}</p>
                  <p className="text-xs text-stone-500">{c.type}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold" style={{ color: RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(c.price_per_day)}</span>
                      <span className="text-xs text-stone-400">{t(lang, "perDay")}</span>
                    </div>
                    <a href={`/book?car=${c.id}`} className="rounded-lg px-3 py-1.5 text-xs font-bold text-white" style={{ background: RED }}>
                      {t(lang, "bookThisCar")}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- about + contact ---------- */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-black/5 bg-white p-6">
            <h2 className="text-sm font-bold" style={{ color: INK }}>{t(lang, "aboutUs")}</h2>
            <p className="mt-2 text-sm text-stone-500">{SHOP_ABOUT}</p>
          </div>
          <div className="rounded-xl border border-black/5 bg-white p-6">
            <h2 className="text-sm font-bold" style={{ color: INK }}>{t(lang, "contactShop")}</h2>
            <div className="mt-3 space-y-2 text-sm text-stone-600">
              <p className="flex items-start gap-2"><MapPin size={15} className="mt-0.5 flex-shrink-0" style={{ color: RED }} /> {SHOP_ADDRESS}</p>
              <p className="flex items-center gap-2"><PhoneIcon size={15} style={{ color: RED }} /> {SHOP_PHONE}</p>
              <p className="flex items-center gap-2"><Clock size={15} style={{ color: RED }} /> {SHOP_HOURS}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-black/5 px-5 py-6 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} {SHOP_NAME}
      </footer>
    </div>
  );
}
