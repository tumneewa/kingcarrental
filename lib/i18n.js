"use client";

import { useState, useEffect } from "react";

// ============================================================
// คำแปล 3 ภาษาสำหรับหน้าที่ลูกค้าเห็น (หน้าแรก + หน้าจอง)
// หน้าพนักงาน (/staff) ไม่ใช้ไฟล์นี้ ยังคงเป็นภาษาไทยเสมอ
// ============================================================
export const translations = {
  settingsBtn: { th: "ตั้งค่าร้าน", en: "Store Settings", zh: "店铺设置" },
  staffLogin: { th: "พนักงานเข้าสู่ระบบ", en: "Staff Login", zh: "员工登录" },
  bookNow: { th: "จองรถเลย", en: "Book Now", zh: "立即预订" },
  ctaSeeAvailable: { th: "ดูรถที่ว่างตอนนี้", en: "See Available Cars", zh: "查看现有车辆" },
  ctaSeeAll: { th: "ดูรถทั้งหมด", en: "View All Cars", zh: "查看所有车辆" },
  trustInspected: { th: "รถตรวจสภาพสม่ำเสมอ", en: "Regularly inspected cars", zh: "车辆定期检查" },
  trustPricing: { th: "ราคาชัดเจน ไม่มีค่าแอบแฝง", en: "Clear pricing, no hidden fees", zh: "价格透明，无隐藏费用" },
  trustOnline: { th: "จองออนไลน์ได้ตลอด 24 ชม.", en: "Book online 24/7", zh: "全天24小时在线预订" },
  fleetTitle: { th: "รถที่พร้อมให้เช่า", en: "Cars Available for Rent", zh: "可租车辆" },
  fleetSub: { th: "เลือกรถที่ใช่ แล้วกดจองได้เลย", en: "Pick the right car and book instantly", zh: "选择合适的车辆，立即预订" },
  noCarsSoon: { th: "ยังไม่มีรถเปิดให้จองในขณะนี้ — เร็วๆ นี้", en: "No cars available right now — coming soon", zh: "目前没有可预订的车辆——敬请期待" },
  noCars: { th: "ยังไม่มีรถเปิดให้จองในขณะนี้", en: "No cars available for booking right now", zh: "目前没有可预订的车辆" },
  perDay: { th: "/ วัน", en: "/ day", zh: "/天" },
  bookThisCar: { th: "จองคันนี้", en: "Book This Car", zh: "预订这辆车" },
  aboutUs: { th: "เกี่ยวกับเรา", en: "About Us", zh: "关于我们" },
  contactShop: { th: "ติดต่อร้าน", en: "Contact Us", zh: "联系我们" },
  backHome: { th: "‹ กลับหน้าแรก", en: "‹ Back to Home", zh: "‹ 返回首页" },
  bookingPageTitle: { th: "จองรถเช่าออนไลน์", en: "Book a Rental Car Online", zh: "在线预订租车" },
  bookingPageSub: { th: "เลือกรถ เลือกวัน แล้วส่งคำขอจองได้เลย", en: "Choose a car and dates, then submit your request", zh: "选择车辆和日期，即可提交预订请求" },
  selectCarPrompt: { th: "เลือกรถที่ต้องการ", en: "Select a Car", zh: "选择车辆" },
  backToSelect: { th: "‹ กลับไปเลือกรถ", en: "‹ Back to car list", zh: "‹ 返回选车" },
  legendAvailable: { th: "ว่าง", en: "Available", zh: "空闲" },
  legendBooked: { th: "ไม่ว่าง", en: "Booked", zh: "已预订" },
  legendSelected: { th: "ที่เลือก", en: "Selected", zh: "已选择" },
  daysUnit: { th: "วัน", en: "days", zh: "天" },
  pickReturnDate: { th: "— เลือกวันคืนรถ", en: "— select return date", zh: "— 请选择还车日期" },
  clear: { th: "ล้าง", en: "Clear", zh: "清除" },
  namePlaceholder: { th: "ชื่อ-นามสกุล", en: "Full Name", zh: "姓名" },
  phonePlaceholder: { th: "เบอร์โทร", en: "Phone Number", zh: "电话号码" },
  estimatedTotal: { th: "ยอดประมาณ", en: "Estimated Total", zh: "预估总额" },
  submitBooking: { th: "ส่งคำขอจอง", en: "Submit Booking Request", zh: "提交预订请求" },
  submitting: { th: "กำลังส่งคำขอ...", en: "Submitting...", zh: "提交中..." },
  notConfirmedNote: { th: "การจองนี้ยังไม่ยืนยัน — ทางร้านจะติดต่อกลับเพื่อยืนยันอีกครั้ง", en: "This booking is not yet confirmed — we'll contact you to confirm", zh: "此预订尚未确认——我们将联系您确认" },
  pickupTimeLabel: { th: "เวลารับรถ", en: "Pickup time", zh: "取车时间" },
  returnTimeLabel: { th: "เวลาคืนรถ", en: "Return time", zh: "还车时间" },
  pickupLocationLabel: { th: "สถานที่รับรถ (เว้นว่าง = รับที่ร้าน)", en: "Pickup location (leave blank for shop)", zh: "取车地点（留空则为门店）" },
  returnLocationLabel: { th: "สถานที่คืนรถ (เว้นว่าง = คืนที่ร้าน)", en: "Return location (leave blank for shop)", zh: "还车地点（留空则为门店）" },
  sameDayHandoverNote: { th: "จุดแดง = วันนี้มีลูกค้าอีกคนรับ/คืนรถคันนี้ด้วย กรุณาเลือกเวลาให้ไม่ชนกัน", en: "Red dot = another customer picks up/returns this car the same day — please choose a non-overlapping time", zh: "红点=当天还有其他顾客取车/还车——请选择不冲突的时间" },
  hintReturningToday: { th: "รถคันนี้มีคนคืนวันนี้เวลา {time} — กรุณาเลือกเวลารับหลังจากนั้นอย่างน้อย 1 ชม. (เผื่อเตรียมรถ)", en: "This car is being returned today at {time} — please pick a pickup time at least 1 hour after that", zh: "这辆车今天{time}会被归还——请选择至少晚1小时的取车时间" },
  hintPickupSameDay: { th: "รถคันนี้มีคนมารับวันนี้เวลา {time} — กรุณาเลือกเวลาคืนก่อนหน้านั้นอย่างน้อย 1 ชม.", en: "This car is being picked up today at {time} — please choose a return time at least 1 hour before that", zh: "这辆车今天{time}会被取走——请选择至少提前1小时的还车时间" },
  overtimeSurchargeNote: { th: "รวมค่าปรับคืนรถช้า {hours} ชม. ({amount})", en: "Includes late return surcharge for {hours} hrs ({amount})", zh: "含逾期还车附加费 {hours} 小时（{amount}）" },
  priceTiersTitle: { th: "ราคาตามระยะเวลาเช่า", en: "Rates by rental duration", zh: "按租期计价" },
  priceTier1: { th: "1-2 วัน", en: "1-2 days", zh: "1-2天" },
  priceTier3: { th: "3-6 วัน", en: "3-6 days", zh: "3-6天" },
  priceTier7: { th: "7-29 วัน", en: "7-29 days", zh: "7-29天" },
  priceTierMonthly: { th: "รายเดือน (30 วัน+)", en: "Monthly (30+ days)", zh: "包月（30天以上）" },
  viewReceipt: { th: "ดู / พิมพ์ใบจองนี้", en: "View / Print this receipt", zh: "查看/打印预订单" },
  myBookings: { th: "ตรวจสอบการจอง", en: "My Bookings", zh: "查询预订" },
  tooltipAvailableFrom: { th: "รับรถได้ตั้งแต่ {time} น. เป็นต้นไป", en: "Available for pickup from {time} onwards", zh: "{time}起可取车" },
  tooltipReturnBy: { th: "ต้องคืนรถภายใน {time} น.", en: "Must be returned by {time}", zh: "须于{time}前还车" },
  submitErrorGeneric: { th: "ขออภัย ช่วงวันที่นี้เพิ่งถูกจองไปหรือเกิดข้อผิดพลาด กรุณาเลือกวันใหม่", en: "Sorry, these dates were just booked or an error occurred. Please pick new dates.", zh: "抱歉，该日期刚被预订或发生错误，请重新选择日期" },
  loading: { th: "กำลังโหลด...", en: "Loading...", zh: "加载中..." },
  bookingSent: { th: "ส่งคำขอจองแล้ว", en: "Booking Request Sent", zh: "预订请求已发送" },
  bookingSentSub: { th: "ทางร้านจะติดต่อกลับเพื่อยืนยันการจองเร็วๆ นี้", en: "We'll contact you shortly to confirm your booking", zh: "我们将尽快与您联系确认预订" },
  scanPay: { th: "สแกนจ่ายมัดจำผ่านพร้อมเพย์", en: "Scan to pay deposit (Thai PromptPay QR)", zh: "扫码支付定金（泰国 PromptPay 二维码）" },
  depositNote: { th: "ค่ามัดจำจองล่วงหน้า (เท่ากันทุกคัน/ทุกจำนวนวัน)", en: "Advance booking deposit (same for every car and duration)", zh: "预订定金（所有车型/租期统一金额）" },
  depositPaidNow: { th: "ค่ามัดจำที่จ่ายแล้ว", en: "Deposit paid now", zh: "已支付定金" },
  dueAtPickup: { th: "ยอดที่ต้องจ่ายวันรับรถ", en: "Amount due at pickup", zh: "取车时需支付" },
  damageInsuranceLabel: { th: "ค่าประกันความเสียหาย", en: "Damage insurance", zh: "损坏险" },
  licenseConfirmLabel: { th: "ฉันมีใบขับขี่รถยนต์ที่ยังไม่หมดอายุ และยินยอมแสดงใบขับขี่ตัวจริงในวันรับรถ", en: "I have a valid driver's license and agree to present it at pickup", zh: "我持有有效驾照，并同意在取车时出示" },
  licenseRequiredHint: { th: "กรุณาติ๊กยืนยันว่าคุณมีใบขับขี่ก่อนส่งคำขอจอง", en: "Please confirm you have a driver's license before submitting", zh: "请先确认您持有驾照后再提交预订" },
  damageInsuranceNote: { th: "* รถคันนี้มีค่าประกันความเสียหาย {amount} เรียกเก็บ ณ วันรับรถ และจะได้รับคืนเต็มจำนวนในวันคืนรถ หากไม่พบความเสียหายเพิ่มเติมกับตัวรถ", en: "* This car has a damage insurance of {amount}, collected at pickup and fully refunded at return if no additional damage is found", zh: "* 此车需缴纳损坏险 {amount}，取车时收取，还车时如无额外损坏将全额退还" },
  paymentNotifiedDone: { th: "แจ้งชำระเงินแล้ว — รอพนักงานตรวจสอบ", en: "Payment reported — awaiting staff verification", zh: "已提交付款——等待工作人员核实" },
  attachSlip: { th: "แนบรูปสลิปโอนเงิน (จำเป็น)", en: "Attach transfer slip (required)", zh: "上传转账单（必填）" },
  slipRequiredHint: { th: "กรุณาแนบรูปสลิปโอนเงินก่อน จึงจะกดแจ้งชำระเงินได้", en: "Please attach the transfer slip before you can confirm payment", zh: "请先上传转账单后才能提交付款确认" },
  uploadingSlip: { th: "กำลังอัปโหลดสลิป...", en: "Uploading slip...", zh: "正在上传转账单..." },
  notifying: { th: "กำลังแจ้ง...", en: "Sending...", zh: "发送中..." },
  notifyPayment: { th: "แจ้งว่าชำระเงินแล้ว", en: "I've Paid", zh: "我已付款" },
  afterPayHint: { th: "หลังโอนเงิน กรุณาแนบรูปสลิป แล้วกดปุ่มด้านบนเพื่อแจ้งให้ร้านทราบ พนักงานจะตรวจสอบและยืนยันอีกครั้ง", en: "After transferring, please attach the slip and press the button above to notify us. Staff will verify and confirm.", zh: "转账后，请上传转账单并点击上方按钮通知我们，工作人员将核实并确认" },
  bookAnotherCar: { th: "จองรถคันอื่นเพิ่ม", en: "Book Another Car", zh: "预订其他车辆" },
  weekdays: { th: ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"], en: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"], zh: ["日", "一", "二", "三", "四", "五", "六"] },
};

export const t = (lang, key, vars) => {
  const entry = translations[key];
  let text = entry ? (entry[lang] ?? entry.th) : key;
  if (vars && typeof text === "string") {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
  }
  return text;
};

const LOCALE_MAP = { th: "th-TH", en: "en-US", zh: "zh-CN" };
export const localeFor = (lang) => LOCALE_MAP[lang] || "th-TH";

// จำภาษาที่ลูกค้าเลือกไว้ (localStorage) เพื่อให้หน้าแรก ↔ หน้าจอง ใช้ภาษาเดียวกันต่อเนื่องกัน
export function useLang() {
  const [lang, setLangState] = useState("th");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("shop_lang");
      if (saved === "th" || saved === "en" || saved === "zh") setLangState(saved);
    } catch (e) {
      // localStorage อาจใช้ไม่ได้ในบางเบราว์เซอร์ — ใช้ค่าเริ่มต้น "th" ต่อไปได้ปกติ
    }
  }, []);

  const setLang = (next) => {
    setLangState(next);
    try {
      window.localStorage.setItem("shop_lang", next);
    } catch (e) {
      // เก็บค่าไม่ได้ก็ไม่เป็นไร ยังใช้งานได้ในหน้านี้ตามปกติ
    }
  };

  return [lang, setLang];
}
