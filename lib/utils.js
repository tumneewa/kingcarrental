export const todayISO = () => new Date().toISOString().slice(0, 10);

export const daysBetween = (a, b) => {
  const ms = new Date(b) - new Date(a);
  return Math.max(1, Math.round(ms / 86400000));
};

export const money = (n) => "฿" + Number(n || 0).toLocaleString("th-TH");

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "2-digit" });

export const formatTime = (t) => (t ? `${t} น.` : "");

export const dateISO = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const buildMonthGrid = (monthDate) => {
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

// เช็กว่าช่วงวันที่+เวลาที่จะจองใหม่ ชนกับการจองเดิม (pending/active) ของรถคันเดียวกันหรือไม่
// เว้นช่วงอย่างน้อย 1 ชั่วโมง (bufferMinutes) ระหว่างการจอง 2 รายการเสมอ เพื่อให้มีเวลาเตรียมรถ
// excludeBookingId ใช้ตอนแก้ไขการจองเดิม เพื่อไม่ให้เช็กชนกับตัวมันเอง
export const hasTimeConflict = (bookings, carId, startDate, startTime, endDate, endTime, excludeBookingId = null, bufferMinutes = 60) => {
  const bufferMs = bufferMinutes * 60 * 1000;
  const newStart = new Date(`${startDate}T${startTime || "00:00"}`);
  const newEnd = new Date(`${endDate}T${endTime || "00:00"}`);
  return bookings.some((b) => {
    if (b.car_id !== carId) return false;
    if (b.id === excludeBookingId) return false;
    if (b.status !== "pending" && b.status !== "active") return false;
    const existStart = new Date(`${b.start_date}T${b.start_time || "00:00"}`);
    const existEnd = new Date(`${b.end_date}T${b.end_time || "00:00"}`);
    // ชนกัน ถ้าไม่มีช่วงห่างอย่างน้อย 1 ชั่วโมงคั่นระหว่างสองรายการ (ไม่ว่าอันไหนมาก่อน)
    return existEnd.getTime() + bufferMs > newStart.getTime() && newEnd.getTime() + bufferMs > existStart.getTime();
  });
};

// บวก/ลบชั่วโมงจากเวลารูปแบบ "HH:MM" แล้วคืนค่าเป็น "HH:MM" (วนรอบ 24 ชม. ให้อัตโนมัติ)
export const shiftTime = (timeStr, hours) => {
  const [h, m] = (timeStr || "00:00").split(":").map(Number);
  let total = h * 60 + m + hours * 60;
  total = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

// คำนวณจำนวนวันเช่า โดยนับรวม "เวลา" รับ-คืนรถด้วย (ไม่ใช่แค่วันที่)
// กฎ: ฟรี 60 นาทีแรกที่เกินมา / เกิน 60 นาทีแต่ไม่เกิน 4 ชม. คิดเพิ่มเป็นรายชั่วโมง (1/4 ของราคาต่อวัน) / เกิน 4 ชม. คิดเต็ม 1 วัน
export const getRentalDuration = (startDate, startTime, endDate, endTime) => {
  const start = new Date(`${startDate}T${startTime || "00:00"}`);
  const end = new Date(`${endDate}T${endTime || "00:00"}`);
  const totalHours = Math.max(0, (end - start) / (1000 * 60 * 60));
  const fullDays = Math.floor(totalHours / 24);
  const remainderHours = totalHours - fullDays * 24;

  if (fullDays === 0) {
    return { days: 1, extraHours: 0 };
  }
  if (remainderHours <= 1) {
    return { days: fullDays, extraHours: 0 }; // ฟรี 60 นาที ปัดลง
  }
  if (remainderHours <= 4) {
    return { days: fullDays, extraHours: remainderHours }; // คิดเพิ่มรายชั่วโมง
  }
  return { days: fullDays + 1, extraHours: 0 }; // เกิน 4 ชม. ปัดขึ้นเต็มวัน
};

// คำนวณยอดรวมค่าเช่า ตามจำนวนวันเช่า โดยใช้ราคาขั้นบันได (1 วัน / 3 วัน / 7 วัน / รายเดือน)
// ช่องราคาไหนไม่ได้ตั้งไว้ (เป็น 0) จะไล่ใช้ราคาช่วงที่ใกล้กว่าแทนให้อัตโนมัติ จนถึงราคาต่อวันปกติเป็นค่าฐานสุดท้าย
export const calcRentalTotal = (car, days) => {
  const daily = Number(car?.price_per_day) || 0;
  const p3 = Number(car?.price_3days) > 0 ? Number(car.price_3days) : daily;
  const p7 = Number(car?.price_7days) > 0 ? Number(car.price_7days) : p3;
  const pMonth = Number(car?.price_monthly) > 0 ? Number(car.price_monthly) : p7 * 30;

  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remainder = days % 30;
    return months * pMonth + remainder * p7;
  }
  if (days >= 7) return days * p7;
  if (days >= 3) return days * p3;
  return days * daily;
};

// คำนวณยอดรวมค่าเช่าแบบเต็มรูปแบบ จากวันที่+เวลารับ-คืนจริง (รวมค่าปรับ/ค่าเพิ่มรายชั่วโมงถ้ามี)
// ใช้อัตราค่าปรับรายชั่วโมงที่ร้านตั้งเอง (overtime_hourly_rate) ถ้าไม่ได้ตั้งไว้ จะใช้ 1/4 ของราคาต่อวันแทน
export const calcRentalTotalWithTime = (car, startDate, startTime, endDate, endTime) => {
  const { days, extraHours } = getRentalDuration(startDate, startTime, endDate, endTime);
  const base = calcRentalTotal(car, days);
  const hourlyRate = Number(car?.overtime_hourly_rate) > 0 ? Number(car.overtime_hourly_rate) : (Number(car?.price_per_day) || 0) / 4;
  const surcharge = Math.round(extraHours * hourlyRate);
  return { total: base + surcharge, days, extraHours, surcharge };
};
