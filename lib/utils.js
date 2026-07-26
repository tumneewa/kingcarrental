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
