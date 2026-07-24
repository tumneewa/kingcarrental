-- ============================================================
-- สคีมาสำหรับระบบจัดการรถเช่า
-- วิธีใช้: เปิด Supabase Dashboard > SQL Editor > New query
-- แล้ววางไฟล์นี้ทั้งหมด กด Run
-- ============================================================

-- ตารางโปรไฟล์พนักงาน (ผูกกับ auth.users ของ Supabase)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  created_at timestamptz default now()
);

-- ตารางรถ
create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  plate text not null,
  province text not null default 'กรุงเทพมหานคร',
  brand text not null,
  model text not null,
  type text not null default 'รถเล็ก',
  price_per_day numeric not null default 0,
  status text not null default 'available', -- available | rented | maintenance
  photo_url text,
  created_at timestamptz default now()
);

-- ถ้าตาราง cars มีอยู่แล้วจากเวอร์ชันก่อนหน้า ให้เพิ่มคอลัมน์นี้ (รันได้ปลอดภัยแม้มีอยู่แล้ว)
alter table cars add column if not exists photo_url text;

-- ตารางลูกค้า/สมาชิก
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  created_at timestamptz default now()
);

-- ตารางการจอง
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  car_id uuid references cars (id) on delete set null,
  member_id uuid references members (id) on delete set null,
  start_date date not null,
  end_date date not null,
  total numeric not null default 0,
  status text not null default 'active', -- pending | active | completed | cancelled
  source text not null default 'staff', -- staff | customer
  payment_status text not null default 'unpaid', -- unpaid | awaiting_verification | paid
  payment_slip_url text,
  created_by uuid references profiles (id),
  created_at timestamptz default now()
);

-- ถ้าตาราง bookings มีอยู่แล้วจากเวอร์ชันก่อนหน้า ให้เพิ่มคอลัมน์นี้ (รันได้ปลอดภัยแม้มีอยู่แล้ว)
alter table bookings add column if not exists payment_status text not null default 'unpaid';
alter table bookings add column if not exists payment_slip_url text;

-- ============================================================
-- เปิด Row Level Security (RLS) — จำเป็นเพื่อความปลอดภัย
-- ============================================================
alter table profiles enable row level security;
alter table cars enable row level security;
alter table members enable row level security;
alter table bookings enable row level security;

-- พนักงานที่ล็อกอินแล้ว (authenticated) ทุกคนอ่าน/แก้ไขข้อมูลร่วมกันได้
-- (เหมาะกับทีมเล็กที่ไว้ใจกัน ถ้าต้องการแบ่งสิทธิ์ละเอียดกว่านี้ค่อยปรับเพิ่มทีหลัง)
create policy "staff can read profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "staff can update own profile" on profiles for insert with check (auth.uid() = id);
create policy "staff can upsert own profile" on profiles for update using (auth.uid() = id);

create policy "staff can read cars" on cars for select using (auth.role() = 'authenticated');
create policy "staff can write cars" on cars for insert with check (auth.role() = 'authenticated');
create policy "staff can update cars" on cars for update using (auth.role() = 'authenticated');

create policy "staff can read members" on members for select using (auth.role() = 'authenticated');
create policy "staff can write members" on members for insert with check (auth.role() = 'authenticated');
create policy "staff can update members" on members for update using (auth.role() = 'authenticated');

create policy "staff can read bookings" on bookings for select using (auth.role() = 'authenticated');
create policy "staff can write bookings" on bookings for insert with check (auth.role() = 'authenticated');
create policy "staff can update bookings" on bookings for update using (auth.role() = 'authenticated');

-- ============================================================
-- ให้ลูกค้าทั่วไป (ยังไม่ล็อกอิน) จองรถเองผ่านหน้า /book ได้
-- ============================================================

-- ลูกค้าดูรายการรถได้ (จำเป็นเพื่อเลือกรถ/ดูราคา) แต่ดูตาราง members/bookings ตรงๆไม่ได้
create policy "public can read cars" on cars for select using (true);

-- มุมมองที่ปลอดภัยสำหรับแสดง "วันไหนถูกจองแล้ว" โดยไม่เผยข้อมูลลูกค้า/ยอดเงินอื่นๆ
create or replace view public_bookings_availability as
  select car_id, start_date, end_date, status
  from bookings
  where status in ('pending', 'active');

grant select on public_bookings_availability to anon;
grant select on cars to anon;

-- ฟังก์ชันสำหรับให้ลูกค้าส่งคำขอจอง (ตรวจสอบวันชนกันและสร้าง/หาลูกค้าให้อัตโนมัติ)
-- ทำงานแบบ SECURITY DEFINER เพื่อให้เขียนข้อมูลได้อย่างปลอดภัยโดยไม่ต้องเปิดสิทธิ์เขียนตรงให้ผู้ใช้ทั่วไป
create or replace function public.request_booking(
  p_car_id uuid,
  p_customer_name text,
  p_customer_phone text,
  p_start_date date,
  p_end_date date
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_price numeric;
  v_total numeric;
  v_booking_id uuid;
  v_conflict boolean;
begin
  if p_end_date < p_start_date then
    raise exception 'วันคืนรถต้องอยู่หลังวันรับรถ';
  end if;

  select exists (
    select 1 from bookings
    where car_id = p_car_id
      and status in ('pending', 'active')
      and not (p_end_date < start_date or p_start_date > end_date)
  ) into v_conflict;

  if v_conflict then
    raise exception 'รถไม่ว่างในช่วงวันที่เลือก';
  end if;

  select id into v_member_id from members where phone = p_customer_phone limit 1;
  if v_member_id is null then
    insert into members (name, phone) values (p_customer_name, p_customer_phone) returning id into v_member_id;
  end if;

  select price_per_day into v_price from cars where id = p_car_id;
  v_total := coalesce(v_price, 0) * greatest(p_end_date - p_start_date, 1);

  insert into bookings (car_id, member_id, start_date, end_date, total, status, source)
  values (p_car_id, v_member_id, p_start_date, p_end_date, v_total, 'pending', 'customer')
  returning id into v_booking_id;

  return v_booking_id;
end;
$$;

grant execute on function public.request_booking(uuid, text, text, date, date) to anon;

-- ฟังก์ชันให้ลูกค้าแจ้งว่าโอนเงินแล้ว (เปลี่ยนสถานะเป็น "รอตรวจสอบ" ให้พนักงานเช็คและยืนยันอีกที)
-- p_slip_url: ลิงก์รูปสลิปโอนเงินที่อัปโหลดไว้ (ไม่บังคับ)
create or replace function public.notify_payment(p_booking_id uuid, p_slip_url text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update bookings
  set payment_status = 'awaiting_verification',
      payment_slip_url = coalesce(p_slip_url, payment_slip_url)
  where id = p_booking_id and payment_status = 'unpaid';
end;
$$;

grant execute on function public.notify_payment(uuid, text) to anon;

-- ที่เก็บรูปสลิปโอนเงิน — ลูกค้าอัปโหลดได้ (ไม่ต้องล็อกอิน) แต่ดูรายการไฟล์ทั้งหมดได้แค่พนักงาน
insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', true)
on conflict (id) do nothing;

create policy "public can view payment slips" on storage.objects
  for select using (bucket_id = 'payment-slips');

create policy "anyone can upload payment slips" on storage.objects
  for insert with check (bucket_id = 'payment-slips');

-- ============================================================
-- ที่เก็บรูปภาพรถ (Supabase Storage) — ใช้แสดงในเว็บสาธารณะและหน้าจองของลูกค้า
-- ============================================================
insert into storage.buckets (id, name, public)
values ('car-photos', 'car-photos', true)
on conflict (id) do nothing;

-- ทุกคนดูรูปได้ (จำเป็นสำหรับหน้าเว็บสาธารณะ/หน้าจองลูกค้า)
create policy "public can view car photos" on storage.objects
  for select using (bucket_id = 'car-photos');

-- พนักงานที่ล็อกอินแล้วอัปโหลด/แก้ไข/ลบรูปได้
create policy "staff can upload car photos" on storage.objects
  for insert with check (bucket_id = 'car-photos' and auth.role() = 'authenticated');

create policy "staff can update car photos" on storage.objects
  for update using (bucket_id = 'car-photos' and auth.role() = 'authenticated');

create policy "staff can delete car photos" on storage.objects
  for delete using (bucket_id = 'car-photos' and auth.role() = 'authenticated');

-- ที่เก็บรูปตกแต่งเว็บ เช่น โลโก้ร้าน และรูปพื้นหลัง hero
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

create policy "public can view site assets" on storage.objects
  for select using (bucket_id = 'site-assets');

create policy "staff can upload site assets" on storage.objects
  for insert with check (bucket_id = 'site-assets' and auth.role() = 'authenticated');

create policy "staff can update site assets" on storage.objects
  for update using (bucket_id = 'site-assets' and auth.role() = 'authenticated');

-- ============================================================
-- (ไม่บังคับ) ข้อมูลตัวอย่าง — ลบ comment (--) ด้านหน้าถ้าต้องการข้อมูลทดลอง
-- ============================================================
-- insert into cars (plate, province, brand, model, type, price_per_day, status) values
--   ('1กก 4521', 'กรุงเทพมหานคร', 'Toyota', 'Yaris Ativ', 'รถเล็ก', 900, 'available'),
--   ('2ขค 7732', 'กรุงเทพมหานคร', 'Honda', 'City', 'รถเล็ก', 1000, 'available'),
--   ('1งจ 9010', 'นนทบุรี', 'Toyota', 'Fortuner', 'SUV', 2200, 'available');
