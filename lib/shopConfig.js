// ============================================================
// แก้ข้อมูลร้านของคุณได้ตรงนี้ — ไฟล์เดียว ใช้ทั้งหน้าแรกและหน้าจอง
// ============================================================
export const SHOP_NAME = "รถเช่าเชียงใหม่ KING CAR RENT";
export const SHOP_TAGLINE = "เช่าง่าย ได้รถไว เที่ยวเชียงใหม่สบายใจ";
export const SHOP_ABOUT =
  "บริการรถเช่าขับเอง ราคาถูก สะอาด ประหยัด ปลอดภัย รับรถได้ที่เมืองเชียงใหม่ ดูแลรถทุกคันอย่างสม่ำเสมอ";
export const SHOP_ADDRESS = "อำเภอเมือง จังหวัดเชียงใหม่";
export const SHOP_PHONE = "081-494-5989";
export const SHOP_HOURS = "เปิดทุกวัน 08:00–20:00";
// วางลิงก์รูปโลโก้/แบนเนอร์ตรงนี้ (อัปโหลดผ่าน Supabase → Storage → site-assets แล้ว copy public URL มาวาง)
// เว้นว่างไว้ได้ถ้ายังไม่มีรูป ระบบจะใช้ตราสัญลักษณ์ป้ายทะเบียนเริ่มต้นให้แทน
export const SHOP_LOGO_URL = "https://myywjwskbmxlrxvcyrgp.supabase.co/storage/v1/object/public/site-assets/706337635_122265942998159913_8632815950140721053_n.jpg";
export const SHOP_HERO_IMAGE_URL = "https://myywjwskbmxlrxvcyrgp.supabase.co/storage/v1/object/public/site-assets/messageImage_1785136307649.jpg";

// ใส่รูปพื้นหลัง Hero ได้หลายรูป จะสไลด์โชว์เปลี่ยนภาพอัตโนมัติทุก 5 วินาที
// ใส่แค่รูปเดียวก็ได้ (จะไม่สไลด์ แสดงรูปเดียวนิ่งๆ เหมือนเดิม) เว้นว่างเป็น [] ถ้าไม่ใช้ จะไปใช้ SHOP_HERO_IMAGE_URL ด้านบนแทน
// ตัวอย่าง: ["https://.../hero1.jpg", "https://.../hero2.jpg", "https://.../hero3.jpg"]
export const SHOP_HERO_IMAGES = [];

// ---- ช่องทางติดต่อโซเชียล (ไม่บังคับ) ----
// LINE Official Account: ใส่ LINE ID ของร้าน (ใส่ @ นำหน้าด้วยถ้าเป็น Official Account) เช่น "@kingcarrent"
// เว้นว่างไว้ = ไม่แสดงปุ่ม LINE
export const SHOP_LINE_ID = "";
// รูป QR Code สำหรับแอด WeChat ของร้าน (อัปโหลดผ่าน Supabase → Storage → site-assets แล้ว copy public URL มาวาง)
// ไปที่แอป WeChat ของร้าน → โปรไฟล์ → กด "My QR Code" → บันทึกรูป → เอามาอัปโหลด
// เว้นว่างไว้ = ไม่แสดงปุ่ม WeChat
export const SHOP_WECHAT_QR_URL = "";

// ---- รับชำระเงินผ่านพร้อมเพย์ ----
// ใส่หมายเลขพร้อมเพย์ของร้าน (เบอร์โทรที่ผูกพร้อมเพย์ไว้ หรือเลขบัตรประชาชน 13 หลัก)
// เว้นว่างไว้ = ปิดการแสดงคิวอาร์โค้ดชำระเงิน (ลูกค้าจะจองได้ปกติ แต่ไม่มีขั้นตอนจ่ายเงิน)
export const SHOP_PROMPTPAY_ID = "0814945989";

// จำนวนเงินมัดจำที่ต้องโอนเพื่อยืนยันการจอง (บาท) — ส่วนที่เหลือมักเก็บตอนรับรถ
export const SHOP_DEPOSIT_AMOUNT = 1000;
// ============================================================
