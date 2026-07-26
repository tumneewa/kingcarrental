"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { todayISO, daysBetween, money, formatDate, formatTime, dateISO, buildMonthGrid } from "../../lib/utils";
import { SHOP_LOGO_URL, SHOP_NAME } from "../../lib/shopConfig";
import PhotoThumb, { carPhotos } from "../../components/PhotoThumb";
import {
  LayoutDashboard,
  Car,
  CalendarPlus,
  ClipboardList,
  Users,
  Plus,
  X,
  Phone,
  Wrench,
  Clock,
  ChevronRight,
  Undo2,
  Search,
  Check,
  LogOut,
  Loader2,
  Pencil,
  Trash2,
  CalendarDays,
  ArrowRightCircle,
  ArrowLeftCircle,
} from "lucide-react";

// ---------- palette / tokens ----------
const INK = "#262626";
const PLATE_RED = "#C0392B";
const PLATE_RED_DARK = "#8E2A1E";
const PAPER = "#F2F2F0";

const STATUS = {
  available: { label: "ว่าง", bg: "#EDEDEA", text: "#6B6B66", dot: "#6B6B66" },
  rented: { label: "ถูกเช่า", bg: "#FBE4E1", text: "#C0392B", dot: "#C0392B" },
  maintenance: { label: "ซ่อมบำรุง", bg: "#E2E2DE", text: "#3F3F3D", dot: "#3F3F3D" },
};

// ---------- small UI atoms ----------
function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.available;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: s.bg, color: s.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function Plate({ plate, province }) {
  return (
    <div
      className="relative inline-flex flex-col items-center rounded-[3px] px-3 py-1.5 select-none"
      style={{
        background: `linear-gradient(180deg, ${PLATE_RED} 0%, ${PLATE_RED_DARK} 100%)`,
        border: "2px solid white",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.15)",
        minWidth: 132,
      }}
    >
      <span
        className="absolute -top-[7px] rounded-sm bg-white px-1 text-[7px] font-bold tracking-wide"
        style={{ color: INK }}
      >
        รถเช่า
      </span>
      <span
        className="mt-1 font-semibold text-white"
        style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, letterSpacing: 1 }}
      >
        {plate}
      </span>
      <span className="text-[9px] text-white/85">{province}</span>
    </div>
  );
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1.5 text-2xl font-bold" style={{ color: accent || INK, fontFamily: "'IBM Plex Mono', monospace" }}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-stone-400">{sub}</p>}
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, count }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
      style={{ background: active ? PLATE_RED : "transparent", color: active ? "white" : "rgba(246,245,241,0.75)" }}
    >
      <Icon size={17} strokeWidth={2.1} />
      <span className="flex-1 text-left">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
          style={{ background: active ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ---------- main app ----------
export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = loading, null = no session
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [nameInput, setNameInput] = useState("");

  const [cars, setCars] = useState([]);
  const [members, setMembers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [tab, setTab] = useState("overview");

  // ---- auth guard ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      if (!data.session) router.push("/staff/login");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) router.push("/staff/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // ---- load profile ----
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", session.user.id).maybeSingle();
      setProfile(data || null);
      setProfileLoaded(true);
    })();
  }, [session]);

  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const saveProfileName = async (e) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSavingProfile(true);
    setProfileError("");
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: session.user.id, email: session.user.email, full_name: nameInput.trim() })
      .select()
      .maybeSingle();
    setSavingProfile(false);
    if (error) {
      setProfileError(error.message || "บันทึกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      return;
    }
    setProfile(data);
  };

  // ---- fetch shared data ----
  const fetchAll = useCallback(async () => {
    const [carsRes, membersRes, bookingsRes, profilesRes] = await Promise.all([
      supabase.from("cars").select("*").order("created_at", { ascending: true }),
      supabase.from("members").select("*").order("created_at", { ascending: true }),
      supabase.from("bookings").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*"),
    ]);
    setCars(carsRes.data || []);
    setMembers(membersRes.data || []);
    setBookings(bookingsRes.data || []);
    setProfiles(profilesRes.data || []);
    setDataLoaded(true);
  }, []);

  useEffect(() => {
    if (session && profile) fetchAll();
  }, [session, profile, fetchAll]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/staff/login");
  };

  // ---- add car ----
  const [showAddCar, setShowAddCar] = useState(false);
  const [carForm, setCarForm] = useState({ plate: "", province: "กรุงเทพมหานคร", brand: "", model: "", type: "รถเล็ก", price_per_day: "" });
  const [carPhotoFiles, setCarPhotoFiles] = useState([]); // สูงสุด 10 ไฟล์
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const uploadCarPhotos = async (files) => {
    const urls = [];
    for (const file of files) {
      const ext = file.name.split(".").pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("car-photos").upload(path, file);
      if (!uploadError) {
        const { data } = supabase.storage.from("car-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  };

  const submitCar = async (e) => {
    e.preventDefault();
    if (!carForm.plate || !carForm.brand || !carForm.model || !carForm.price_per_day) return;

    let photos = [];
    if (carPhotoFiles.length > 0) {
      setUploadingPhoto(true);
      photos = await uploadCarPhotos(carPhotoFiles);
      setUploadingPhoto(false);
    }

    await supabase.from("cars").insert({ ...carForm, price_per_day: Number(carForm.price_per_day), status: "available", photos });
    setCarForm({ plate: "", province: "กรุงเทพมหานคร", brand: "", model: "", type: "รถเล็ก", price_per_day: "" });
    setCarPhotoFiles([]);
    setShowAddCar(false);
    fetchAll();
  };

  const setCarStatus = async (carId, status) => {
    setCars((cs) => cs.map((c) => (c.id === carId ? { ...c, status } : c)));
    await supabase.from("cars").update({ status }).eq("id", carId);
  };

  const [addingPhotosTo, setAddingPhotosTo] = useState(false);

  const addPhotosToCar = async (car, files) => {
    if (!files || files.length === 0) return;
    setAddingPhotosTo(true);
    const existing = carPhotos(car);
    const room = Math.max(0, 10 - existing.length);
    const toUpload = Array.from(files).slice(0, room);
    const newUrls = await uploadCarPhotos(toUpload);
    const updated = [...existing, ...newUrls];
    await supabase.from("cars").update({ photos: updated }).eq("id", car.id);
    setAddingPhotosTo(false);
    fetchAll();
  };

  const removePhotoFromCar = async (car, url) => {
    const updated = carPhotos(car).filter((p) => p !== url);
    await supabase.from("cars").update({ photos: updated }).eq("id", car.id);
    fetchAll();
  };

  // ---- car availability calendar ----
  const [detailCarId, setDetailCarId] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [calMemberId, setCalMemberId] = useState("");
  const [calMemberQuery, setCalMemberQuery] = useState("");
  const [calStartTime, setCalStartTime] = useState("10:00");
  const [calEndTime, setCalEndTime] = useState("10:00");
  const [editingCarDetails, setEditingCarDetails] = useState(false);
  const [editCarForm, setEditCarForm] = useState(null);
  const [savingCarEdit, setSavingCarEdit] = useState(false);
  const [deletingCar, setDeletingCar] = useState(false);

  const startEditCar = (car) => {
    setEditCarForm({
      plate: car.plate,
      province: car.province,
      brand: car.brand,
      model: car.model,
      type: car.type,
      price_per_day: String(car.price_per_day),
    });
    setEditingCarDetails(true);
  };

  const saveCarEdit = async (carId) => {
    if (!editCarForm.plate || !editCarForm.brand || !editCarForm.model || !editCarForm.price_per_day) return;
    setSavingCarEdit(true);
    await supabase
      .from("cars")
      .update({ ...editCarForm, price_per_day: Number(editCarForm.price_per_day) })
      .eq("id", carId);
    setSavingCarEdit(false);
    setEditingCarDetails(false);
    fetchAll();
  };

  const deleteCar = async (carId) => {
    if (!window.confirm("ยืนยันลบรถคันนี้ออกจากระบบ? ประวัติการจองเดิมจะยังอยู่ แต่จะไม่มีรถให้อ้างอิงอีก")) return;
    setDeletingCar(true);
    await supabase.from("cars").delete().eq("id", carId);
    setDeletingCar(false);
    closeCarDetail();
    fetchAll();
  };

  const openCarDetail = (carId) => {
    setDetailCarId(carId);
    setCalendarMonth(new Date());
    setRangeStart(null);
    setRangeEnd(null);
    setCalMemberId("");
    setCalMemberQuery("");
    setCalStartTime("10:00");
    setCalEndTime("10:00");
    setEditingCarDetails(false);
    setEditCarForm(null);
  };
  const closeCarDetail = () => {
    setDetailCarId(null);
    setRangeStart(null);
    setRangeEnd(null);
    setCalMemberId("");
    setCalMemberQuery("");
    setCalStartTime("10:00");
    setCalEndTime("10:00");
    setEditingCarDetails(false);
    setEditCarForm(null);
  };

  const buildMonthGrid = (monthDate) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const bookingOnDate = (carId, iso) =>
    bookings.find((b) => b.car_id === carId && (b.status === "active" || b.status === "pending") && iso >= b.start_date && iso <= b.end_date);

  // ---- add member ----
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ name: "", phone: "" });

  const submitMember = async (e) => {
    e.preventDefault();
    if (!memberForm.name || !memberForm.phone) return null;
    const { data } = await supabase.from("members").insert(memberForm).select().maybeSingle();
    setMemberForm({ name: "", phone: "" });
    setShowAddMember(false);
    await fetchAll();
    return data;
  };

  // ---- booking form (from "จองรถใหม่" tab) ----
  const [bookingMemberId, setBookingMemberId] = useState("");
  const [bookingCarId, setBookingCarId] = useState("");
  const [bookingStart, setBookingStart] = useState(todayISO());
  const [bookingEnd, setBookingEnd] = useState(todayISO());
  const [bookingStartTime, setBookingStartTime] = useState("10:00");
  const [bookingEndTime, setBookingEndTime] = useState("10:00");
  const [memberQuery, setMemberQuery] = useState("");

  const availableCars = cars.filter((c) => c.status === "available");
  const nDays = daysBetween(bookingStart, bookingEnd);
  const selectedCar = cars.find((c) => c.id === bookingCarId);
  const total = selectedCar ? selectedCar.price_per_day * nDays : 0;

  const filteredMembers = members.filter(
    (m) => m.name.toLowerCase().includes(memberQuery.toLowerCase()) || m.phone.includes(memberQuery)
  );

  const createBooking = async () => {
    if (!bookingMemberId || !bookingCarId || !selectedCar) return;
    await supabase.from("bookings").insert({
      car_id: bookingCarId,
      member_id: bookingMemberId,
      start_date: bookingStart,
      end_date: bookingEnd,
      start_time: bookingStartTime,
      end_time: bookingEndTime,
      total,
      status: "active",
      source: "staff",
      created_by: session.user.id,
    });
    await supabase.from("cars").update({ status: "rented" }).eq("id", bookingCarId);
    setBookingCarId("");
    setBookingMemberId("");
    setBookingStart(todayISO());
    setBookingEnd(todayISO());
    setBookingStartTime("10:00");
    setBookingEndTime("10:00");
    setTab("bookings");
    fetchAll();
  };

  const returnCar = async (booking) => {
    await supabase.from("bookings").update({ status: "completed" }).eq("id", booking.id);
    await supabase.from("cars").update({ status: "available" }).eq("id", booking.car_id);
    fetchAll();
  };

  const cancelBooking = async (booking) => {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    await supabase.from("cars").update({ status: "available" }).eq("id", booking.car_id);
    fetchAll();
  };

  const confirmBooking = async (booking) => {
    await supabase.from("bookings").update({ status: "active" }).eq("id", booking.id);
    if (booking.start_date <= todayISO()) {
      await supabase.from("cars").update({ status: "rented" }).eq("id", booking.car_id);
    }
    fetchAll();
  };

  const rejectBooking = async (booking) => {
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", booking.id);
    fetchAll();
  };

  const confirmPayment = async (booking) => {
    await supabase.from("bookings").update({ payment_status: "paid" }).eq("id", booking.id);
    fetchAll();
  };

  // ---- derived stats ----
  const stats = useMemo(() => {
    const total = cars.length;
    const avail = cars.filter((c) => c.status === "available").length;
    const rented = cars.filter((c) => c.status === "rented").length;
    const maint = cars.filter((c) => c.status === "maintenance").length;
    const revenue = bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + Number(b.total), 0);
    const activeBookings = bookings
      .filter((b) => b.status === "active")
      .sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
    const pendingBookings = bookings
      .filter((b) => b.status === "pending")
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    return { total, avail, rented, maint, revenue, activeBookings, pendingBookings };
  }, [cars, bookings]);

  // ---- สรุปรับ-คืนรถรายวัน ----
  const [scheduleDate, setScheduleDate] = useState(todayISO());

  const pickupsOnDate = useMemo(
    () =>
      bookings
        .filter((b) => b.start_date === scheduleDate && (b.status === "active" || b.status === "pending"))
        .sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")),
    [bookings, scheduleDate]
  );
  const returnsOnDate = useMemo(
    () =>
      bookings
        .filter((b) => b.end_date === scheduleDate && b.status === "active")
        .sort((a, b) => (a.end_time || "").localeCompare(b.end_time || "")),
    [bookings, scheduleDate]
  );

  const todaySummaryCount = useMemo(() => {
    const today = todayISO();
    const p = bookings.filter((b) => b.start_date === today && (b.status === "active" || b.status === "pending")).length;
    const r = bookings.filter((b) => b.end_date === today && b.status === "active").length;
    return p + r;
  }, [bookings]);

  const shiftScheduleDate = (deltaDays) => {
    const d = new Date(scheduleDate);
    d.setDate(d.getDate() + deltaDays);
    setScheduleDate(dateISO(d));
  };

  const memberName = (id) => members.find((m) => m.id === id)?.name || "—";
  const carLabel = (id) => {
    const c = cars.find((c) => c.id === id);
    return c ? `${c.brand} ${c.model}` : "—";
  };
  const carPlate = (id) => cars.find((c) => c.id === id)?.plate || "—";
  const staffName = (id) => profiles.find((p) => p.id === id)?.full_name || "—";

  const memberStats = (memberId) => {
    const mb = bookings.filter((b) => b.member_id === memberId);
    const spent = mb.filter((b) => b.status !== "cancelled").reduce((s, b) => s + Number(b.total), 0);
    return { count: mb.length, spent, bookings: mb };
  };

  // ---- loading / auth gates ----
  if (session === undefined) {
    return (
      <div className="paper-bg flex min-h-screen w-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 size={16} className="animate-spin" /> กำลังโหลด...
        </div>
      </div>
    );
  }
  if (!session) return null; // redirecting to /login

  if (!profileLoaded) {
    return (
      <div className="paper-bg flex min-h-screen w-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 size={16} className="animate-spin" /> กำลังโหลด...
        </div>
      </div>
    );
  }

  if (profile === null || (profile && !profile.full_name)) {
    return (
      <div className="paper-bg flex min-h-screen w-full items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
          <p className="text-sm font-bold" style={{ color: INK }}>ยินดีต้อนรับ 👋</p>
          <p className="mt-1 text-xs text-stone-500">กรอกชื่อของคุณ เพื่อให้ทีมรู้ว่าใครทำรายการอะไรบ้าง</p>
          <form onSubmit={saveProfileName} className="mt-3 space-y-2">
            <input
              required
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="ชื่อของคุณ"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none"
            />
            {profileError && (
              <p className="text-xs font-medium text-red-600">เกิดข้อผิดพลาด: {profileError}</p>
            )}
            <button type="submit" disabled={savingProfile} className="w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: PLATE_RED }}>
              {savingProfile ? "กำลังบันทึก..." : "เริ่มใช้งาน"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!dataLoaded) {
    return (
      <div className="paper-bg flex min-h-screen w-full items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Loader2 size={16} className="animate-spin" /> กำลังโหลด...
        </div>
      </div>
    );
  }

  return (
    <div className="paper-bg flex min-h-screen w-full" style={{ fontFamily: "'Noto Sans Thai', sans-serif" }}>
      {/* ---------- sidebar ---------- */}
      <aside className="flex w-60 flex-shrink-0 flex-col gap-1 px-4 py-6" style={{ background: INK }}>
        <div className="mb-6 flex items-center gap-2 px-1">
          {SHOP_LOGO_URL ? (
            <img src={SHOP_LOGO_URL} alt={SHOP_NAME} className="h-9 w-auto rounded-[3px] object-contain" />
          ) : (
            <div
              className="flex h-8 w-11 items-center justify-center rounded-[3px] border-2 border-white text-[9px] font-bold text-white"
              style={{ background: `linear-gradient(180deg, ${PLATE_RED} 0%, ${PLATE_RED_DARK} 100%)`, fontFamily: "'IBM Plex Mono', monospace" }}
            >
              รถเช่า
            </div>
          )}
          <div>
            <p className="text-sm font-bold leading-tight text-white">{SHOP_NAME || "จัดการรถเช่า"}</p>
            <p className="text-[10px] leading-tight text-white/50">ระบบหลังร้าน</p>
          </div>
        </div>

        <NavItem icon={LayoutDashboard} label="ภาพรวม" active={tab === "overview"} onClick={() => setTab("overview")} />
        <NavItem icon={Car} label="รถทั้งหมด" active={tab === "fleet"} onClick={() => setTab("fleet")} count={stats.total} />
        <NavItem icon={CalendarPlus} label="จองรถใหม่" active={tab === "newbooking"} onClick={() => setTab("newbooking")} />
        <NavItem icon={CalendarDays} label="สรุปรับ-คืนรถ" active={tab === "schedule"} onClick={() => setTab("schedule")} count={todaySummaryCount} />
        <NavItem icon={ClipboardList} label="ประวัติการจอง" active={tab === "bookings"} onClick={() => setTab("bookings")} count={stats.activeBookings.length + stats.pendingBookings.length} />
        <NavItem icon={Users} label="สมาชิก" active={tab === "members"} onClick={() => setTab("members")} count={members.length} />

        <div className="mt-auto rounded-lg px-3 py-3" style={{ background: "rgba(255,255,255,0.06)" }}>
          <p className="text-[11px] text-white/50">รายได้สะสม</p>
          <p className="text-lg font-bold text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(stats.revenue)}</p>
        </div>

        <div className="mt-2 flex items-center justify-between px-1">
          <span className="text-[11px] text-white/60">{profile.full_name}</span>
          <button onClick={handleLogout} className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70">
            <LogOut size={11} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <main className="flex-1 overflow-y-auto px-8 py-7">
        {tab === "overview" && (
          <div>
            <h1 className="text-xl font-bold" style={{ color: INK }}>ภาพรวมร้าน</h1>
            <p className="mt-0.5 text-sm text-stone-500">สรุปสถานะรถและการจองวันนี้</p>

            <div className="mt-5 grid grid-cols-4 gap-3">
              <StatCard label="รถทั้งหมด" value={stats.total} />
              <StatCard label="รถว่าง" value={stats.avail} accent="#6B6B66" />
              <StatCard label="ถูกเช่าอยู่" value={stats.rented} accent={PLATE_RED} />
              <StatCard label="ซ่อมบำรุง" value={stats.maint} accent="#3F3F3D" />
            </div>

            {stats.pendingBookings.length > 0 && (
              <div className="mt-6 rounded-xl border p-5 shadow-sm" style={{ background: "#FBE4E1", borderColor: "#F2C6C0" }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold" style={{ color: "#8E2A1E" }}>คำขอจองจากลูกค้า — รอยืนยัน ({stats.pendingBookings.length})</h2>
                </div>
                <div className="mt-3 divide-y divide-black/5">
                  {stats.pendingBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <Plate plate={carPlate(b.car_id)} province="" />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: INK }}>{carLabel(b.car_id)}</p>
                          <p className="text-xs text-stone-500">
                            {memberName(b.member_id)} · {formatDate(b.start_date)} {formatTime(b.start_time)} – {formatDate(b.end_date)} {formatTime(b.end_time)}
                          </p>
                          <p className="mt-0.5 text-[11px] font-semibold" style={{ color: b.payment_status === "paid" ? "#3F7A4E" : b.payment_status === "awaiting_verification" ? PLATE_RED : "#8A8A82" }}>
                            {b.payment_status === "paid" ? "ชำระเงินแล้ว" : b.payment_status === "awaiting_verification" ? "ลูกค้าแจ้งโอนแล้ว — รอตรวจสอบ" : "ยังไม่ชำระเงิน"}
                            {b.payment_slip_url && (
                              <a href={b.payment_slip_url} target="_blank" rel="noreferrer" className="ml-1.5 underline" style={{ color: PLATE_RED }}>ดูสลิป</a>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {b.payment_status !== "paid" && (
                          <button onClick={() => confirmPayment(b)} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "white", color: "#3F7A4E", border: "1px solid #3F7A4E" }}>
                            ได้รับเงินแล้ว
                          </button>
                        )}
                        <button onClick={() => confirmBooking(b)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: PLATE_RED }}>ยืนยัน</button>
                        <button onClick={() => rejectBooking(b)} className="rounded-lg px-3 py-1.5 text-xs font-semibold" style={{ background: "white", color: "#8E2A1E" }}>ปฏิเสธ</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold" style={{ color: INK }}>รถที่ต้องคืนเร็วๆ นี้</h2>
                <button onClick={() => setTab("bookings")} className="flex items-center gap-1 text-xs font-semibold" style={{ color: PLATE_RED }}>
                  ดูทั้งหมด <ChevronRight size={13} />
                </button>
              </div>
              <div className="mt-3 divide-y divide-black/5">
                {cars.length === 0 && (
                  <p className="py-6 text-center text-sm text-stone-400">ยังไม่มีรถในระบบ ไปที่ "รถทั้งหมด" เพื่อเพิ่มรถคันแรก</p>
                )}
                {cars.length > 0 && stats.activeBookings.length === 0 && (
                  <p className="py-6 text-center text-sm text-stone-400">ยังไม่มีรถที่ถูกเช่าอยู่ในตอนนี้</p>
                )}
                {stats.activeBookings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <Plate plate={carPlate(b.car_id)} province="" />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: INK }}>{carLabel(b.car_id)}</p>
                        <p className="text-xs text-stone-500">ผู้เช่า: {memberName(b.member_id)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center gap-1 justify-end text-xs font-semibold" style={{ color: PLATE_RED }}>
                        <Clock size={12} /> คืน {formatDate(b.end_date)} {formatTime(b.end_time)}
                      </p>
                      <button onClick={() => returnCar(b)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-stone-500 hover:text-stone-700">
                        <Undo2 size={12} /> คืนรถแล้ว
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "fleet" && (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold" style={{ color: INK }}>รถทั้งหมด</h1>
                <p className="mt-0.5 text-sm text-stone-500">จัดการสต็อกรถและสถานะ</p>
              </div>
              <button onClick={() => setShowAddCar(true)} className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white" style={{ background: PLATE_RED }}>
                <Plus size={15} /> เพิ่มรถ
              </button>
            </div>

            {cars.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
                <p className="text-sm text-stone-500">ยังไม่มีรถในระบบ</p>
                <p className="mt-1 text-xs text-stone-400">กดปุ่ม "เพิ่มรถ" ด้านบนเพื่อเริ่มเพิ่มรถคันแรกของร้าน</p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-4">
                {cars.map((c) => (
                  <div key={c.id} onClick={() => openCarDetail(c.id)} className="cursor-pointer overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm transition-shadow hover:shadow-md">
                    <PhotoThumb car={c} className="h-28 w-full" />
                    <div className="p-4">
                    <div className="flex items-start justify-between">
                      <Plate plate={c.plate} province={c.province} />
                      <StatusPill status={c.status} />
                    </div>
                    <p className="mt-3 text-sm font-bold" style={{ color: INK }}>{c.brand} {c.model}</p>
                    <p className="text-xs text-stone-500">{c.type}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-lg font-bold" style={{ color: PLATE_RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(c.price_per_day)}</span>
                      <span className="text-xs text-stone-400">/ วัน</span>
                    </div>

                    <button onClick={(e) => { e.stopPropagation(); openCarDetail(c.id); }} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold" style={{ background: PAPER, color: INK }}>
                      <CalendarPlus size={12} /> ดูวันว่าง
                    </button>

                    <div className="mt-2 flex gap-2">
                      {c.status !== "maintenance" ? (
                        <button onClick={(e) => { e.stopPropagation(); setCarStatus(c.id, "maintenance"); }} disabled={c.status === "rented"} className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold disabled:opacity-40" style={{ background: "#E2E2DE", color: "#3F3F3D" }}>
                          <Wrench size={12} /> ส่งซ่อม
                        </button>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); setCarStatus(c.id, "available"); }} className="flex flex-1 items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-semibold" style={{ background: "#EDEDEA", color: "#6B6B66" }}>
                          <Check size={12} /> ซ่อมเสร็จแล้ว
                        </button>
                      )}
                    </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "newbooking" && (
          <div className="max-w-3xl">
            <h1 className="text-xl font-bold" style={{ color: INK }}>จองรถใหม่</h1>
            <p className="mt-0.5 text-sm text-stone-500">เลือกลูกค้า เลือกรถ และกำหนดวันเช่า</p>

            <div className="mt-5 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold" style={{ color: INK }}>1. เลือกลูกค้า</h2>
                <button onClick={() => setShowAddMember(true)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: PLATE_RED }}>
                  <Plus size={13} /> เพิ่มลูกค้าใหม่
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2">
                <Search size={14} className="text-stone-400" />
                <input value={memberQuery} onChange={(e) => setMemberQuery(e.target.value)} placeholder="ค้นหาชื่อหรือเบอร์โทร" className="w-full text-sm outline-none" />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {filteredMembers.map((m) => (
                  <button key={m.id} onClick={() => setBookingMemberId(m.id)} className="rounded-lg border px-3 py-2 text-left text-xs" style={{ borderColor: bookingMemberId === m.id ? PLATE_RED : "rgba(0,0,0,0.1)", background: bookingMemberId === m.id ? "#FBE4E1" : "white" }}>
                    <p className="font-semibold" style={{ color: INK }}>{m.name}</p>
                    <p className="text-stone-500">{m.phone}</p>
                  </button>
                ))}
                {members.length === 0 && <p className="text-xs text-stone-400 py-2">ยังไม่มีลูกค้าในระบบ กด "เพิ่มลูกค้าใหม่"</p>}
                {members.length > 0 && filteredMembers.length === 0 && <p className="text-xs text-stone-400 py-2">ไม่พบลูกค้า</p>}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold" style={{ color: INK }}>2. เลือกรถที่ว่าง</h2>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {availableCars.map((c) => (
                  <button key={c.id} onClick={() => setBookingCarId(c.id)} className="flex items-center gap-3 rounded-lg border p-2.5 text-left" style={{ borderColor: bookingCarId === c.id ? PLATE_RED : "rgba(0,0,0,0.1)", background: bookingCarId === c.id ? "#FBE4E1" : "white" }}>
                    <Plate plate={c.plate} province="" />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: INK }}>{c.brand} {c.model}</p>
                      <p className="text-[11px] text-stone-500">{money(c.price_per_day)}/วัน</p>
                    </div>
                  </button>
                ))}
                {availableCars.length === 0 && <p className="text-xs text-stone-400 py-2 col-span-2">ไม่มีรถว่างในตอนนี้</p>}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold" style={{ color: INK }}>3. กำหนดวันเช่า</h2>
              <div className="mt-3 flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-stone-500">วันรับรถ</label>
                  <input type="date" value={bookingStart} onChange={(e) => setBookingStart(e.target.value)} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-stone-500">วันคืนรถ</label>
                  <input type="date" value={bookingEnd} min={bookingStart} onChange={(e) => setBookingEnd(e.target.value)} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="mt-2 flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-stone-500">เวลารับรถ</label>
                  <input type="time" value={bookingStartTime} onChange={(e) => setBookingStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-stone-500">เวลาคืนรถ</label>
                  <input type="time" value={bookingEndTime} onChange={(e) => setBookingEndTime(e.target.value)} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg p-3" style={{ background: PAPER }}>
                <div className="text-xs text-stone-500">{selectedCar ? `${nDays} วัน × ${money(selectedCar.price_per_day)}` : "เลือกรถเพื่อคำนวณราคา"}</div>
                <div className="text-lg font-bold" style={{ color: PLATE_RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(total)}</div>
              </div>

              <button onClick={createBooking} disabled={!bookingMemberId || !bookingCarId} className="mt-4 w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: PLATE_RED }}>
                ยืนยันการจอง
              </button>
            </div>
          </div>
        )}

        {tab === "schedule" && (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold" style={{ color: INK }}>สรุปรับ-คืนรถ</h1>
                <p className="mt-0.5 text-sm text-stone-500">ดูว่าวันนี้ต้องส่งมอบ/รับคืนรถคันไหนบ้าง</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => shiftScheduleDate(-1)} className="rounded-lg border border-black/10 bg-white p-2 text-stone-500 hover:bg-stone-50">
                  <ChevronRight size={15} className="rotate-180" />
                </button>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none"
                />
                <button onClick={() => shiftScheduleDate(1)} className="rounded-lg border border-black/10 bg-white p-2 text-stone-500 hover:bg-stone-50">
                  <ChevronRight size={15} />
                </button>
                {scheduleDate !== todayISO() && (
                  <button onClick={() => setScheduleDate(todayISO())} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-stone-500 hover:bg-stone-50">
                    วันนี้
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              {/* ---- รถที่ต้องรับ ---- */}
              <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-1.5 text-sm font-bold" style={{ color: INK }}>
                  <ArrowRightCircle size={16} style={{ color: PLATE_RED }} /> รถที่ต้องส่งมอบ ({pickupsOnDate.length})
                </h2>
                <div className="mt-3 space-y-3">
                  {pickupsOnDate.length === 0 && <p className="py-6 text-center text-sm text-stone-400">ไม่มีรถที่ต้องส่งมอบในวันนี้</p>}
                  {pickupsOnDate.map((b) => (
                    <div key={b.id} className="rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: INK }}>{carLabel(b.car_id)}</p>
                          <p className="text-xs text-stone-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{carPlate(b.car_id)}</p>
                          <p className="mt-1 text-xs text-stone-500">ผู้เช่า: {memberName(b.member_id)}</p>
                        </div>
                        <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ background: "#FBE4E1", color: PLATE_RED, fontFamily: "'IBM Plex Mono', monospace" }}>
                          {formatTime(b.start_time)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        {b.status === "pending" ? (
                          <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold" style={{ borderColor: PLATE_RED, color: PLATE_RED }}>รอยืนยัน</span>
                        ) : (
                          <span className="text-[11px] text-stone-400">ยืนยันแล้ว</span>
                        )}
                        <div className="flex gap-2">
                          {b.status === "pending" && (
                            <>
                              <button onClick={() => confirmBooking(b)} className="text-xs font-semibold" style={{ color: PLATE_RED }}>ยืนยัน</button>
                              <button onClick={() => rejectBooking(b)} className="text-xs font-semibold text-stone-400">ปฏิเสธ</button>
                            </>
                          )}
                          {b.status === "active" && (
                            <button
                              onClick={() => setCarStatus(b.car_id, "rented")}
                              className="text-xs font-semibold"
                              style={{ color: PLATE_RED }}
                            >
                              ส่งมอบรถแล้ว
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ---- รถที่ต้องคืน ---- */}
              <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-1.5 text-sm font-bold" style={{ color: INK }}>
                  <ArrowLeftCircle size={16} style={{ color: "#3F7A4E" }} /> รถที่ต้องรับคืน ({returnsOnDate.length})
                </h2>
                <div className="mt-3 space-y-3">
                  {returnsOnDate.length === 0 && <p className="py-6 text-center text-sm text-stone-400">ไม่มีรถที่ต้องรับคืนในวันนี้</p>}
                  {returnsOnDate.map((b) => (
                    <div key={b.id} className="rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold" style={{ color: INK }}>{carLabel(b.car_id)}</p>
                          <p className="text-xs text-stone-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{carPlate(b.car_id)}</p>
                          <p className="mt-1 text-xs text-stone-500">ผู้เช่า: {memberName(b.member_id)}</p>
                        </div>
                        <span className="rounded-full px-2 py-1 text-xs font-bold" style={{ background: "#E7F3EC", color: "#3F7A4E", fontFamily: "'IBM Plex Mono', monospace" }}>
                          {formatTime(b.end_time)}
                        </span>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button onClick={() => returnCar(b)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#3F7A4E" }}>
                          <Undo2 size={12} /> คืนรถแล้ว
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "bookings" && (
          <div>
            <h1 className="text-xl font-bold" style={{ color: INK }}>ประวัติการจอง</h1>
            <p className="mt-0.5 text-sm text-stone-500">รายการจองทั้งหมด {bookings.length} รายการ</p>

            {bookings.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
                <p className="text-sm text-stone-500">ยังไม่มีการจอง</p>
              </div>
            ) : (
              <div className="mt-5 overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 text-left text-xs text-stone-500">
                      <th className="px-4 py-3 font-medium">รถ</th>
                      <th className="px-4 py-3 font-medium">ลูกค้า</th>
                      <th className="px-4 py-3 font-medium">วันเช่า - คืน</th>
                      <th className="px-4 py-3 font-medium">ยอดรวม</th>
                      <th className="px-4 py-3 font-medium">การชำระเงิน</th>
                      <th className="px-4 py-3 font-medium">จองโดย</th>
                      <th className="px-4 py-3 font-medium">สถานะ</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id} className="border-b border-black/5 last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold" style={{ color: INK }}>{carLabel(b.car_id)}</p>
                          <p className="text-xs text-stone-400" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{carPlate(b.car_id)}</p>
                        </td>
                        <td className="px-4 py-3">
                          {memberName(b.member_id)}
                          {b.source === "customer" && (
                            <span className="ml-1.5 rounded-full bg-[#F1F1EE] px-1.5 py-0.5 text-[9px] font-semibold text-stone-500">ลูกค้าจองเอง</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-500">{formatDate(b.start_date)} {formatTime(b.start_time)} – {formatDate(b.end_date)} {formatTime(b.end_time)}</td>
                        <td className="px-4 py-3 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{money(b.total)}</td>
                        <td className="px-4 py-3">
                          {b.payment_status === "paid" ? (
                            <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: "#E7F3EC", color: "#3F7A4E" }}>ชำระแล้ว</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: b.payment_status === "awaiting_verification" ? "#FBE4E1" : "#F1F1EE", color: b.payment_status === "awaiting_verification" ? "#C0392B" : "#8A8A82" }}>
                                {b.payment_status === "awaiting_verification" ? "รอตรวจสอบ" : "ยังไม่จ่าย"}
                              </span>
                              <button onClick={() => confirmPayment(b)} className="text-[11px] font-semibold" style={{ color: "#3F7A4E" }}>รับแล้ว</button>
                            </div>
                          )}
                          {b.payment_slip_url && (
                            <a href={b.payment_slip_url} target="_blank" rel="noreferrer" className="mt-1 block text-[11px] underline" style={{ color: PLATE_RED }}>ดูสลิป</a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-stone-500">{b.created_by ? staffName(b.created_by) : "—"}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{
                            background: b.status === "pending" ? "white" : b.status === "active" ? "#FBE4E1" : b.status === "completed" ? "#EDEDEA" : "#F1F1EE",
                            color: b.status === "pending" ? "#C0392B" : b.status === "active" ? "#C0392B" : b.status === "completed" ? "#6B6B66" : "#8A8A82",
                            border: b.status === "pending" ? "1px solid #C0392B" : "none",
                          }}>
                            {b.status === "pending" ? "รอยืนยัน" : b.status === "active" ? "กำลังเช่า" : b.status === "completed" ? "คืนแล้ว" : "ยกเลิก"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {b.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => confirmBooking(b)} className="text-xs font-semibold" style={{ color: PLATE_RED }}>ยืนยัน</button>
                              <button onClick={() => rejectBooking(b)} className="text-xs font-semibold text-stone-400">ปฏิเสธ</button>
                            </div>
                          )}
                          {b.status === "active" && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => returnCar(b)} className="text-xs font-semibold" style={{ color: PLATE_RED }}>คืนรถ</button>
                              <button onClick={() => cancelBooking(b)} className="text-xs font-semibold text-stone-400">ยกเลิก</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "members" && (
          <div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold" style={{ color: INK }}>สมาชิก</h1>
                <p className="mt-0.5 text-sm text-stone-500">ลูกค้าทั้งหมด {members.length} คน</p>
              </div>
              <button onClick={() => setShowAddMember(true)} className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white" style={{ background: PLATE_RED }}>
                <Plus size={15} /> เพิ่มลูกค้า
              </button>
            </div>

            {members.length === 0 ? (
              <div className="mt-8 rounded-xl border border-dashed border-black/10 bg-white p-10 text-center">
                <p className="text-sm text-stone-500">ยังไม่มีลูกค้าในระบบ</p>
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-4">
                {members.map((m) => {
                  const ms = memberStats(m.id);
                  return (
                    <div key={m.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold" style={{ color: INK }}>{m.name}</p>
                          <p className="flex items-center gap-1 text-xs text-stone-500"><Phone size={11} />{m.phone}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold" style={{ color: PLATE_RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(ms.spent)}</p>
                          <p className="text-[11px] text-stone-400">{ms.count} ครั้ง</p>
                        </div>
                      </div>
                      {ms.bookings.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-black/5 pt-2.5">
                          {ms.bookings.slice(0, 3).map((b) => (
                            <div key={b.id} className="flex items-center justify-between text-xs">
                              <span className="text-stone-500">{carLabel(b.car_id)} · {formatDate(b.start_date)}</span>
                              <span className="font-medium" style={{ color: INK }}>{money(b.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ---------- add car modal ---------- */}
      {showAddCar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: INK }}>เพิ่มรถใหม่</h3>
              <button onClick={() => setShowAddCar(false)}><X size={18} className="text-stone-400" /></button>
            </div>
            <form onSubmit={submitCar} className="mt-3 space-y-2.5">
              <input required placeholder="ทะเบียนรถ เช่น 1กก 4521" value={carForm.plate} onChange={(e) => setCarForm({ ...carForm, plate: e.target.value })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
              <input required placeholder="จังหวัด" value={carForm.province} onChange={(e) => setCarForm({ ...carForm, province: e.target.value })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
              <div className="flex gap-2">
                <input required placeholder="ยี่ห้อ" value={carForm.brand} onChange={(e) => setCarForm({ ...carForm, brand: e.target.value })} className="w-1/2 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
                <input required placeholder="รุ่น" value={carForm.model} onChange={(e) => setCarForm({ ...carForm, model: e.target.value })} className="w-1/2 rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
              </div>
              <select value={carForm.type} onChange={(e) => setCarForm({ ...carForm, type: e.target.value })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none">
                <option>รถเล็ก</option><option>SUV</option><option>กระบะ</option><option>รถตู้/VIP</option>
              </select>
              <input required type="number" min="0" placeholder="ราคาต่อวัน (บาท)" value={carForm.price_per_day} onChange={(e) => setCarForm({ ...carForm, price_per_day: e.target.value })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
              <div>
                <label className="text-xs text-stone-500">รูปรถ (ไม่บังคับ สูงสุด 10 รูป)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setCarPhotoFiles(Array.from(e.target.files || []).slice(0, 10))}
                  className="mt-1 w-full text-xs text-stone-500"
                />
                {carPhotoFiles.length > 0 && (
                  <p className="mt-1 text-[11px] text-stone-400">เลือกไว้ {carPhotoFiles.length} รูป</p>
                )}
              </div>
              <button type="submit" disabled={uploadingPhoto} className="w-full rounded-lg py-2.5 text-sm font-bold text-white disabled:opacity-50" style={{ background: PLATE_RED }}>
                {uploadingPhoto ? "กำลังอัปโหลดรูป..." : "เพิ่มรถ"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ---------- add member modal ---------- */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: INK }}>เพิ่มลูกค้าใหม่</h3>
              <button onClick={() => setShowAddMember(false)}><X size={18} className="text-stone-400" /></button>
            </div>
            <form onSubmit={submitMember} className="mt-3 space-y-2.5">
              <input required placeholder="ชื่อ-นามสกุล" value={memberForm.name} onChange={(e) => setMemberForm({ ...memberForm, name: e.target.value })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
              <input required placeholder="เบอร์โทร" value={memberForm.phone} onChange={(e) => setMemberForm({ ...memberForm, phone: e.target.value })} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none" />
              <button type="submit" className="w-full rounded-lg py-2.5 text-sm font-bold text-white" style={{ background: PLATE_RED }}>เพิ่มลูกค้า</button>
            </form>
          </div>
        </div>
      )}

      {/* ---------- car availability calendar modal ---------- */}
      {detailCarId && (() => {
        const car = cars.find((c) => c.id === detailCarId);
        if (!car) return null;
        const grid = buildMonthGrid(calendarMonth);
        const todayStr = todayISO();
        const upcoming = bookings.filter((b) => b.car_id === car.id && (b.status === "active" || b.status === "pending") && b.end_date >= todayStr).sort((a, b) => (a.start_date > b.start_date ? 1 : -1));

        const isRangeConflict = (startIso, endIso) => {
          let d = new Date(startIso);
          const endD = new Date(endIso);
          while (d <= endD) {
            if (bookingOnDate(car.id, dateISO(d))) return true;
            d.setDate(d.getDate() + 1);
          }
          return false;
        };

        const handleDayClick = (iso, disabled) => {
          if (disabled) return;
          if (!rangeStart || rangeEnd) { setRangeStart(iso); setRangeEnd(null); return; }
          if (iso < rangeStart) { setRangeStart(iso); setRangeEnd(null); return; }
          if (iso === rangeStart) return;
          if (isRangeConflict(rangeStart, iso)) { setRangeStart(iso); setRangeEnd(null); }
          else setRangeEnd(iso);
        };

        const nDaysSel = rangeStart && rangeEnd ? daysBetween(rangeStart, rangeEnd) : 0;
        const totalSel = nDaysSel * car.price_per_day;
        const calFilteredMembers = members.filter((m) => m.name.toLowerCase().includes(calMemberQuery.toLowerCase()) || m.phone.includes(calMemberQuery));

        const confirmCalendarBooking = async () => {
          if (!rangeStart || !rangeEnd || !calMemberId) return;
          await supabase.from("bookings").insert({
            car_id: car.id,
            member_id: calMemberId,
            start_date: rangeStart,
            end_date: rangeEnd,
            start_time: calStartTime,
            end_time: calEndTime,
            total: totalSel,
            status: "active",
            source: "staff",
            created_by: session.user.id,
          });
          if (rangeStart === todayStr) await supabase.from("cars").update({ status: "rented" }).eq("id", car.id);
          closeCarDetail();
          setTab("bookings");
          fetchAll();
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Plate plate={car.plate} province="" />
                  <div>
                    <p className="text-sm font-bold" style={{ color: INK }}>{car.brand} {car.model}</p>
                    <StatusPill status={car.status} />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!editingCarDetails && (
                    <button onClick={() => startEditCar(car)} title="แก้ไขข้อมูลรถ" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600">
                      <Pencil size={16} />
                    </button>
                  )}
                  <button onClick={() => deleteCar(car.id)} disabled={deletingCar} title="ลบรถคันนี้" className="rounded-lg p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                    <Trash2 size={16} />
                  </button>
                  <button onClick={closeCarDetail}><X size={18} className="text-stone-400" /></button>
                </div>
              </div>

              {editingCarDetails && editCarForm && (
                <div className="mt-4 rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
                  <p className="mb-2 text-xs font-semibold" style={{ color: INK }}>แก้ไขข้อมูลรถ</p>
                  <div className="space-y-2">
                    <input placeholder="ทะเบียนรถ" value={editCarForm.plate} onChange={(e) => setEditCarForm({ ...editCarForm, plate: e.target.value })} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                    <input placeholder="จังหวัด" value={editCarForm.province} onChange={(e) => setEditCarForm({ ...editCarForm, province: e.target.value })} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                    <div className="flex gap-2">
                      <input placeholder="ยี่ห้อ" value={editCarForm.brand} onChange={(e) => setEditCarForm({ ...editCarForm, brand: e.target.value })} className="w-1/2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                      <input placeholder="รุ่น" value={editCarForm.model} onChange={(e) => setEditCarForm({ ...editCarForm, model: e.target.value })} className="w-1/2 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                    </div>
                    <select value={editCarForm.type} onChange={(e) => setEditCarForm({ ...editCarForm, type: e.target.value })} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none">
                      <option>รถเล็ก</option><option>SUV</option><option>กระบะ</option><option>รถตู้/VIP</option>
                    </select>
                    <input type="number" min="0" placeholder="ราคาต่อวัน (บาท)" value={editCarForm.price_per_day} onChange={(e) => setEditCarForm({ ...editCarForm, price_per_day: e.target.value })} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm outline-none" />
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => setEditingCarDetails(false)} className="flex-1 rounded-lg py-2 text-xs font-semibold text-stone-500" style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)" }}>
                        ยกเลิก
                      </button>
                      <button onClick={() => saveCarEdit(car.id)} disabled={savingCarEdit} className="flex-1 rounded-lg py-2 text-xs font-bold text-white disabled:opacity-50" style={{ background: PLATE_RED }}>
                        {savingCarEdit ? "กำลังบันทึก..." : "บันทึก"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
                <p className="mb-1.5 flex items-center justify-between text-xs font-semibold" style={{ color: INK }}>
                  <span>รูปภาพรถคันนี้ ({carPhotos(car).length}/10)</span>
                </p>
                {carPhotos(car).length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {carPhotos(car).map((p, i) => (
                      <div key={i} className="group relative h-14 w-14 overflow-hidden rounded-lg border border-black/10">
                        <img src={p} alt={`รูปที่ ${i + 1}`} className="h-full w-full object-cover" />
                        <button
                          onClick={() => removePhotoFromCar(car, p)}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100"
                          title="ลบรูปนี้"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {carPhotos(car).length < 10 && (
                  <label className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-black/15 bg-white px-3 py-2 text-xs font-semibold" style={{ color: INK }}>
                    {addingPhotosTo ? "กำลังอัปโหลด..." : "+ เพิ่มรูป"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={addingPhotosTo}
                      className="hidden"
                      onChange={(e) => { addPhotosToCar(car, e.target.files); e.target.value = ""; }}
                    />
                  </label>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100">‹</button>
                <p className="text-sm font-bold" style={{ color: INK }}>{calendarMonth.toLocaleDateString("th-TH", { month: "long", year: "numeric" })}</p>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="rounded-lg px-2 py-1 text-sm text-stone-500 hover:bg-stone-100">›</button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-stone-400">
                {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => <div key={d}>{d}</div>)}
              </div>
              <div className="mt-1 grid grid-cols-7 gap-1">
                {grid.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const iso = dateISO(d);
                  const isPast = iso < todayStr;
                  const booking = bookingOnDate(car.id, iso);
                  const disabled = isPast || !!booking;
                  const inRange = rangeStart && (rangeEnd ? iso >= rangeStart && iso <= rangeEnd : iso === rangeStart);
                  let bg = "#EDEDEA", color = "#6B6B66";
                  if (isPast) { bg = "#F1F1EE"; color = "#B4B4AC"; }
                  else if (booking) { bg = "#FBE4E1"; color = "#C0392B"; }
                  if (inRange) { bg = PLATE_RED; color = "white"; }
                  return (
                    <button key={i} type="button" onClick={() => handleDayClick(iso, disabled)} disabled={disabled}
                      title={booking ? `จองโดย ${memberName(booking.member_id)}` : isPast ? "" : "ว่าง — กดเพื่อเลือกวัน"}
                      className="flex h-8 items-center justify-center rounded-md text-xs font-semibold disabled:cursor-not-allowed"
                      style={{ background: bg, color, cursor: disabled ? "not-allowed" : "pointer" }}>
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center gap-4 text-[11px] text-stone-500">
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#EDEDEA" }} />ว่าง</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: "#FBE4E1" }} />ถูกจอง</span>
                <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: PLATE_RED }} />ที่เลือก</span>
              </div>

              {rangeStart && (
                <div className="mt-4 rounded-lg border border-black/5 p-3" style={{ background: PAPER }}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold" style={{ color: INK }}>
                      {rangeEnd ? `${formatDate(rangeStart)} – ${formatDate(rangeEnd)} (${nDaysSel} วัน)` : `${formatDate(rangeStart)} — เลือกวันคืนรถ`}
                    </p>
                    <button onClick={() => { setRangeStart(null); setRangeEnd(null); }} className="text-[11px] text-stone-400 hover:text-stone-600">ล้าง</button>
                  </div>

                  {rangeEnd && (
                    <>
                      <div className="mt-2 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
                        <Search size={13} className="text-stone-400" />
                        <input value={calMemberQuery} onChange={(e) => setCalMemberQuery(e.target.value)} placeholder="ค้นหาลูกค้า" className="w-full text-xs outline-none" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {calFilteredMembers.map((m) => (
                          <button key={m.id} onClick={() => setCalMemberId(m.id)} className="rounded-lg border px-2.5 py-1.5 text-left text-[11px]" style={{ borderColor: calMemberId === m.id ? PLATE_RED : "rgba(0,0,0,0.1)", background: calMemberId === m.id ? "#FBE4E1" : "white" }}>
                            <p className="font-semibold" style={{ color: INK }}>{m.name}</p>
                          </button>
                        ))}
                        {calFilteredMembers.length === 0 && <p className="text-[11px] text-stone-400 py-1">ไม่พบลูกค้า</p>}
                      </div>

                      <div className="mt-2 flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-stone-400">เวลารับรถ</label>
                          <input type="time" value={calStartTime} onChange={(e) => setCalStartTime(e.target.value)} className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-stone-400">เวลาคืนรถ</label>
                          <input type="time" value={calEndTime} onChange={(e) => setCalEndTime(e.target.value)} className="mt-0.5 w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs outline-none" />
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-stone-500">ยอดรวม</span>
                        <span className="text-base font-bold" style={{ color: PLATE_RED, fontFamily: "'IBM Plex Mono', monospace" }}>{money(totalSel)}</span>
                      </div>
                      <button onClick={confirmCalendarBooking} disabled={!calMemberId} className="mt-2 w-full rounded-lg py-2 text-xs font-bold text-white disabled:opacity-40" style={{ background: PLATE_RED }}>
                        ยืนยันการจอง
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="mt-4 border-t border-black/5 pt-3">
                <p className="text-xs font-bold" style={{ color: INK }}>การจองที่กำลังจะมาถึง</p>
                <div className="mt-2 space-y-1.5">
                  {upcoming.length === 0 && <p className="text-xs text-stone-400">ไม่มีการจองล่วงหน้า — รถว่างทั้งหมด</p>}
                  {upcoming.map((b) => (
                    <div key={b.id} className="flex items-center justify-between text-xs">
                      <span className="text-stone-600">
                        {memberName(b.member_id)}
                        {b.status === "pending" && <span className="ml-1.5 rounded-full bg-[#F1F1EE] px-1.5 py-0.5 text-[9px] font-semibold text-stone-500">รอยืนยัน</span>}
                      </span>
                      <span className="font-medium" style={{ color: PLATE_RED, fontFamily: "'IBM Plex Mono', monospace" }}>{formatDate(b.start_date)} {formatTime(b.start_time)} – {formatDate(b.end_date)} {formatTime(b.end_time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
