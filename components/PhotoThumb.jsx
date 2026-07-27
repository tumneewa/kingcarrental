"use client";

import { useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Car as CarIcon } from "lucide-react";

const RED = "#C0392B";
const SWIPE_THRESHOLD = 40; // ระยะปัดขั้นต่ำ (px) ก่อนถือว่าเป็นการปัดเปลี่ยนรูป

// คืนรายการรูปของรถคันหนึ่ง รองรับทั้งข้อมูลใหม่ (photos array) และข้อมูลเก่า (photo_url เดี่ยว)
export function carPhotos(car) {
  if (!car) return [];
  if (Array.isArray(car.photos) && car.photos.length > 0) return car.photos;
  if (car.photo_url) return [car.photo_url];
  return [];
}

// รูปตัวอย่างรถ ปัดซ้าย-ขวาด้วยนิ้วเปลี่ยนรูปได้เลยโดยไม่ต้องกดเข้าไปก่อน
// กดที่รูปเพื่อเปิดดูแบบขยาย ก็ปัดเปลี่ยนรูปในหน้าขยายได้เช่นกัน
export default function PhotoThumb({ car, className = "h-28 w-full" }) {
  const [open, setOpen] = useState(false);
  const [mainIndex, setMainIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const photos = carPhotos(car);
  const touchRef = useRef({ x: 0, y: 0 });

  if (photos.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-[#EDEDEA] ${className}`}>
        <CarIcon size={28} className="text-[#B4B4AC]" />
      </div>
    );
  }

  const openAt = (i) => {
    setIndex(i);
    setOpen(true);
  };
  const mainPrev = () => setMainIndex((i) => (i - 1 + photos.length) % photos.length);
  const mainNext = () => setMainIndex((i) => (i + 1) % photos.length);
  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  // ---- จับการปัดด้วยนิ้ว (touch swipe) ----
  const onTouchStart = (e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const makeTouchEnd = (onLeft, onRight) => (e) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    const dy = e.changedTouches[0].clientY - touchRef.current.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) onLeft();
      else onRight();
    }
  };

  return (
    <>
      <div
        className={`relative touch-pan-y overflow-hidden ${className}`}
        onTouchStart={onTouchStart}
        onTouchEnd={makeTouchEnd(mainNext, mainPrev)}
      >
        <img
          src={photos[mainIndex]}
          alt={car?.brand ? `${car.brand} ${car.model}` : "รูปรถ"}
          className="h-full w-full cursor-pointer select-none object-cover"
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            openAt(mainIndex);
          }}
        />
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                mainPrev();
              }}
              className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity hover:opacity-100 sm:flex sm:group-hover:opacity-100"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                mainNext();
              }}
              className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity hover:opacity-100 sm:flex sm:group-hover:opacity-100"
            >
              <ChevronRight size={14} />
            </button>
            <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1">
              {photos.map((_, i) => (
                <span
                  key={i}
                  className="h-1 rounded-full transition-all"
                  style={{ width: i === mainIndex ? 12 : 5, background: i === mainIndex ? "white" : "rgba(255,255,255,0.55)" }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <div className="flex w-full max-w-lg flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 text-xs font-semibold text-white/70">
              {index + 1}/{photos.length}
            </p>
            <div
              className="relative flex w-full touch-pan-y items-center justify-center"
              onTouchStart={onTouchStart}
              onTouchEnd={makeTouchEnd(next, prev)}
            >
              {photos.length > 1 && (
                <button onClick={prev} className="absolute left-1 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                  <ChevronLeft size={20} />
                </button>
              )}
              <img src={photos[index]} alt={`รูปที่ ${index + 1}`} className="max-h-[70vh] w-full select-none rounded-lg object-contain" draggable={false} />
              {photos.length > 1 && (
                <button onClick={next} className="absolute right-1 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
            {photos.length > 1 && (
              <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    onClick={() => setIndex(i)}
                    className="h-12 w-12 shrink-0 cursor-pointer rounded-md object-cover"
                    style={{ outline: i === index ? `2px solid ${RED}` : "2px solid transparent" }}
                    alt={`thumb ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
