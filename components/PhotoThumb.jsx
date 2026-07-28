"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Car as CarIcon, ZoomIn } from "lucide-react";

const RED = "#C0392B";
const SWIPE_RATIO = 0.22; // ต้องลากเกิน 22% ของความกว้าง ถึงจะเปลี่ยนรูป ไม่งั้นเด้งกลับที่เดิม
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.2;

// คืนรายการรูปของรถคันหนึ่ง รองรับทั้งข้อมูลใหม่ (photos array) และข้อมูลเก่า (photo_url เดี่ยว)
export function carPhotos(car) {
  if (!car) return [];
  if (Array.isArray(car.photos) && car.photos.length > 0) return car.photos;
  if (car.photo_url) return [car.photo_url];
  return [];
}

// แถบรูปเลื่อนตามนิ้วแบบลื่นๆ (drag ตามตำแหน่งจริง) แล้วค่อย snap เข้ารูปถัดไป/ก่อนหน้าตอนปล่อยนิ้ว
// disabled=true ตอนกำลังซูมรูปอยู่ (ปิดสวิ่งเปลี่ยนรูป ปล่อยให้ลากซูมแทน)
function SwipeTrack({ photos, index, setIndex, renderSlide, heightClass = "", disabled = false }) {
  const containerRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, width: 0 });

  const onTouchStart = (e) => {
    if (disabled) return;
    start.current = { x: e.touches[0].clientX, width: containerRef.current?.offsetWidth || 1 };
    setDragging(true);
  };
  const onTouchMove = (e) => {
    if (disabled || !dragging) return;
    const dx = e.touches[0].clientX - start.current.x;
    const atStart = index === 0 && dx > 0;
    const atEnd = index === photos.length - 1 && dx < 0;
    setDragX(atStart || atEnd ? dx * 0.35 : dx);
  };
  const onTouchEnd = () => {
    if (disabled) return;
    const width = start.current.width || 1;
    const ratio = dragX / width;
    if (ratio <= -SWIPE_RATIO && index < photos.length - 1) setIndex(index + 1);
    else if (ratio >= SWIPE_RATIO && index > 0) setIndex(index - 1);
    setDragX(0);
    setDragging(false);
  };

  return (
    <div ref={containerRef} className={`relative touch-pan-y overflow-hidden ${heightClass}`} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex h-full"
        style={{
          width: `${photos.length * 100}%`,
          transform: `translateX(calc(${-index * (100 / photos.length)}% + ${dragX}px))`,
          transition: dragging ? "none" : "transform 300ms ease-out",
        }}
      >
        {photos.map((p, i) => (
          <div key={i} className="h-full shrink-0" style={{ width: `${100 / photos.length}%` }}>
            {renderSlide(p, i)}
          </div>
        ))}
      </div>
    </div>
  );
}

// รูปเดี่ยวที่บีบนิ้วซูมได้ / แตะสองครั้งเพื่อซูม / ลากดูตอนซูมอยู่
// active=false (ไม่ใช่รูปที่กำลังดูอยู่) จะรีเซ็ตซูมกลับเป็นปกติอัตโนมัติ
function ZoomableImage({ src, alt, active, onZoomChange }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const pinch = useRef({ active: false, startDist: 0, startScale: 1 });
  const pan = useRef({ active: false, startX: 0, startY: 0, startTranslate: { x: 0, y: 0 } });
  const lastTap = useRef(0);

  useEffect(() => {
    if (!active) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      onZoomChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const clamp = (s) => Math.min(MAX_ZOOM, Math.max(1, s));

  const applyZoom = (newScale, newTranslate = { x: 0, y: 0 }) => {
    const s = clamp(newScale);
    setScale(s);
    setTranslate(s === 1 ? { x: 0, y: 0 } : newTranslate);
    onZoomChange?.(s > 1.02);
  };

  const toggleDoubleTapZoom = () => applyZoom(scale > 1 ? 1 : DOUBLE_TAP_ZOOM);

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      pinch.current = { active: true, startDist: dist(e.touches), startScale: scale };
      pan.current.active = false;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        toggleDoubleTapZoom();
      }
      lastTap.current = now;
      if (scale > 1) {
        pan.current = { active: true, startX: e.touches[0].clientX, startY: e.touches[0].clientY, startTranslate: translate };
      }
    }
  };
  const onTouchMove = (e) => {
    if (pinch.current.active && e.touches.length === 2) {
      const newDist = dist(e.touches);
      const newScale = clamp(pinch.current.startScale * (newDist / pinch.current.startDist));
      setScale(newScale);
      onZoomChange?.(newScale > 1.02);
    } else if (pan.current.active && e.touches.length === 1) {
      const dx = e.touches[0].clientX - pan.current.startX;
      const dy = e.touches[0].clientY - pan.current.startY;
      setTranslate({ x: pan.current.startTranslate.x + dx, y: pan.current.startTranslate.y + dy });
    }
  };
  const onTouchEnd = (e) => {
    if (e.touches.length === 0) {
      pinch.current.active = false;
      pan.current.active = false;
      if (scale <= 1.02) applyZoom(1);
    }
  };

  const isInteracting = pinch.current.active || pan.current.active;

  return (
    <div className="flex h-full w-full items-center justify-center overflow-hidden" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <img
        src={src}
        alt={alt}
        draggable={false}
        onDoubleClick={toggleDoubleTapZoom}
        className="h-full w-full select-none rounded-lg object-contain"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transition: isInteracting ? "none" : "transform 200ms ease-out",
          cursor: scale > 1 ? "grab" : "zoom-in",
        }}
      />
    </div>
  );
}

// รูปตัวอย่างรถ ลากนิ้วเลื่อนดูรูปได้ลื่นๆ ทันทีโดยไม่ต้องกดเข้าไปก่อน
// กดที่รูปเพื่อเปิดดูแบบขยาย บีบนิ้ว/แตะสองครั้งเพื่อซูมได้ในหน้าขยาย
export default function PhotoThumb({ car, className = "h-28 w-full" }) {
  const [open, setOpen] = useState(false);
  const [mainIndex, setMainIndex] = useState(0);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
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
    setZoomed(false);
    setOpen(true);
  };

  return (
    <>
      <div className={`relative ${className}`}>
        <SwipeTrack
          photos={photos}
          index={mainIndex}
          setIndex={setMainIndex}
          heightClass="h-full w-full"
          renderSlide={(p) => (
            <img
              src={p}
              alt={car?.brand ? `${car.brand} ${car.model}` : "รูปรถ"}
              className="h-full w-full cursor-pointer select-none object-cover"
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
                openAt(mainIndex);
              }}
            />
          )}
        />
        {photos.length > 1 && (
          <div className="pointer-events-none absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1">
            {photos.map((_, i) => (
              <span
                key={i}
                className="h-1 rounded-full transition-all"
                style={{ width: i === mainIndex ? 12 : 5, background: i === mainIndex ? "white" : "rgba(255,255,255,0.55)" }}
              />
            ))}
          </div>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => !zoomed && setOpen(false)}>
          <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X size={20} />
          </button>
          <div className="flex w-full max-w-lg flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-white/70">
              {index + 1}/{photos.length}
              {!zoomed && (
                <span className="ml-1 flex items-center gap-0.5 text-white/40">
                  <ZoomIn size={11} /> บีบนิ้ว/แตะ 2 ครั้งเพื่อซูม
                </span>
              )}
            </p>
            <div className="relative flex w-full items-center justify-center">
              {photos.length > 1 && !zoomed && (
                <button
                  onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                  className="absolute left-1 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <SwipeTrack
                photos={photos}
                index={index}
                setIndex={setIndex}
                heightClass="h-[65vh] w-full"
                disabled={zoomed}
                renderSlide={(p, i) => (
                  <ZoomableImage src={p} alt={`รูปที่ ${i + 1}`} active={i === index} onZoomChange={setZoomed} />
                )}
              />
              {photos.length > 1 && !zoomed && (
                <button
                  onClick={() => setIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-1 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
                >
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
