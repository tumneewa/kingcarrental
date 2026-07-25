"use client";

import { useState } from "react";
import { Images, X, ChevronLeft, ChevronRight, Car as CarIcon } from "lucide-react";

const RED = "#C0392B";

// คืนรายการรูปของรถคันหนึ่ง รองรับทั้งข้อมูลใหม่ (photos array) และข้อมูลเก่า (photo_url เดี่ยว)
export function carPhotos(car) {
  if (!car) return [];
  if (Array.isArray(car.photos) && car.photos.length > 0) return car.photos;
  if (car.photo_url) return [car.photo_url];
  return [];
}

// รูปตัวอย่างรถ พร้อมป้าย "+N" ถ้ามีมากกว่า 1 รูป กดแล้วเปิดแกลเลอรีดูรูปขยายได้
export default function PhotoThumb({ car, className = "h-28 w-full" }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const photos = carPhotos(car);

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
  const prev = () => setIndex((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIndex((i) => (i + 1) % photos.length);

  return (
    <>
      <div className={`relative overflow-hidden ${className}`}>
        <img
          src={photos[0]}
          alt={car?.brand ? `${car.brand} ${car.model}` : "รูปรถ"}
          className="h-full w-full cursor-pointer object-cover"
          onClick={(e) => {
            e.stopPropagation();
            openAt(0);
          }}
        />
        {photos.length > 1 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openAt(0);
            }}
            className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white"
          >
            <Images size={10} /> +{photos.length - 1}
          </button>
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
            <div className="relative flex w-full items-center justify-center">
              {photos.length > 1 && (
                <button onClick={prev} className="absolute left-1 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70">
                  <ChevronLeft size={20} />
                </button>
              )}
              <img src={photos[index]} alt={`รูปที่ ${index + 1}`} className="max-h-[70vh] w-full rounded-lg object-contain" />
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
