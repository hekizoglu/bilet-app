"use client";

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Image as KonvaImage } from 'react-konva';

interface Seat {
  id: string;
  name: string;
  displayName?: string;
  x: number;
  y: number;
}

/** Tasarımcı elemanı (Konva çizimleri için gerekli alanlar) */
export interface LayoutElement {
  id: string;
  type: string;
  label?: string;
  x: number;
  y: number;
  rotation?: number;
  width?: number;
  height?: number;
  radius?: number;
  seatCount?: number;
  numberingType?: string;
}

interface SeatMapViewerProps {
  layoutJson: string | object;
  availableSeats: Seat[];
  selectedSeatId?: string | null;
  selectedSeatIds?: string[];
  onSeatSelect: (seatId: string) => void;
}

export default function SeatMapViewer({ layoutJson, availableSeats, selectedSeatId, selectedSeatIds, onSeatSelect }: SeatMapViewerProps) {
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [stageWidth, setStageWidth] = useState(1000);

  // Layout parse'ı render sırasında yapılır (state güncellemesi gerekmez → set-state-in-effect hatası yok)
  const elements = useMemo<LayoutElement[]>(() => {
    if (!layoutJson) return [];
    try {
      const parsed = typeof layoutJson === 'string' ? JSON.parse(layoutJson) : layoutJson;
      return parsed?.elements || [];
    } catch {
      return [];
    }
  }, [layoutJson]);

  // Arka plan görseli (asenkron — yalnızca yükleme bitince state güncellenir)
  useEffect(() => {
    if (!layoutJson) return;
    let parsed: { elements?: LayoutElement[]; canvas?: { backgroundImage?: string } };
    try {
      parsed = typeof layoutJson === 'string' ? JSON.parse(layoutJson) : layoutJson;
    } catch {
      return;
    }
    if (parsed?.canvas?.backgroundImage) {
      const img = new window.Image();
      img.src = parsed.canvas.backgroundImage;
      img.onload = () => setBgImageObj(img);
    }
  }, [layoutJson]);

  // Responsive genişlik: ref'i render sırasında okumak yerine ResizeObserver ile state'e yaz
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setStageWidth(el.offsetWidth || 1000);
      // Default canvas width is usually 1000 in designer
      const newScale = Math.min(el.offsetWidth / 1000, 1);
      setScale(newScale);
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const availableSet = new Set(availableSeats.map(s => s.id));

  const handleSeatClick = (seatId: string) => {
    if (availableSet.has(seatId)) {
      onSeatSelect(seatId);
    }
  };

  const getSeatColor = (seatId: string) => {
    const isSelected = selectedSeatIds 
      ? selectedSeatIds.includes(seatId)
      : selectedSeatId === seatId;
      
    if (isSelected) return '#3b82f6'; // Blue for selected
    if (availableSet.has(seatId)) return '#22c55e'; // Green for available
    return '#9ca3af'; // Gray for taken/unavailable
  };

  const renderRoundTable = (el: LayoutElement) => {
    const r = el.radius || 40;
    const sCount = el.seatCount || 8;
    const showSeatNums = el.numberingType === 'table_and_seats' || el.numberingType === 'seats_only';
    const seats = [];
    
    for(let i=0; i<sCount; i++) {
      const angle = (i * (360 / sCount)) * (Math.PI / 180);
      const sx = Math.cos(angle) * (r + 15);
      const sy = Math.sin(angle) * (r + 15);
      const seatLabel = el.numberingType === 'table_and_seats'
        ? String.fromCharCode(65 + i)
        : String(i + 1);
      
      const seatId = `${el.id}-seat-${i}`;
      const color = getSeatColor(seatId);
      const isAvailable = availableSet.has(seatId);

      seats.push(
        <Group 
          key={seatId} 
          x={sx} 
          y={sy}
          onClick={() => handleSeatClick(seatId)}
          onTap={() => handleSeatClick(seatId)}
        >
          <Circle radius={12} fill={color} stroke={isAvailable ? "#16a34a" : "#6b7280"} strokeWidth={1} />
          {showSeatNums && (
            <Text x={-8} y={-5} width={16} text={seatLabel} fontSize={8} fill="white" align="center" fontStyle="bold" />
          )}
        </Group>
      );
    }

    return (
      <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation || 0}>
        <Circle radius={r} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} />
        <Text text={el.label} offsetX={r} offsetY={6} width={r*2} align="center" fontSize={14} fill="#1e293b" fontStyle="bold" />
        {seats}
      </Group>
    );
  };

  const renderRectTable = (el: LayoutElement) => {
    const w = el.width || 120;
    const h = el.height || 60;
    const sCount = el.seatCount || 6;
    const seats = [];
    const topBottomCount = Math.floor(sCount / 2);
    const spacing = w / (topBottomCount + 1);
    
    // Add top seats
    for(let i=0; i<topBottomCount; i++) {
      const seatId = `${el.id}-seat-${i}`;
      const color = getSeatColor(seatId);
      const isAvailable = availableSet.has(seatId);
      
      seats.push(
        <Rect 
          key={seatId} 
          x={spacing * (i+1) - 10} 
          y={-25} 
          width={20} 
          height={20} 
          fill={color} 
          stroke={isAvailable ? "#16a34a" : "#6b7280"} 
          strokeWidth={1} 
          cornerRadius={4}
          onClick={() => handleSeatClick(seatId)}
          onTap={() => handleSeatClick(seatId)}
        />
      );
    }
    
    // Add bottom seats
    for(let i=0; i<topBottomCount; i++) {
      const seatId = `${el.id}-seat-${topBottomCount + i}`;
      const color = getSeatColor(seatId);
      const isAvailable = availableSet.has(seatId);

      seats.push(
        <Rect 
          key={seatId} 
          x={spacing * (i+1) - 10} 
          y={h + 5} 
          width={20} 
          height={20} 
          fill={color} 
          stroke={isAvailable ? "#16a34a" : "#6b7280"} 
          strokeWidth={1} 
          cornerRadius={4}
          onClick={() => handleSeatClick(seatId)}
          onTap={() => handleSeatClick(seatId)}
        />
      );
    }

    return (
      <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation || 0}>
        <Rect width={w} height={h} fill="#f8fafc" stroke="#cbd5e1" strokeWidth={2} cornerRadius={4} />
        <Text text={el.label} width={w} y={h/2 - 7} align="center" fontSize={14} fill="#1e293b" fontStyle="bold" />
        {seats}
      </Group>
    );
  };

  const renderBistro = (el: LayoutElement) => {
    const r = el.radius || 25;
    const sCount = el.seatCount || 4;
    const seats = [];
    
    for(let i=0; i<sCount; i++) {
      const angle = (i * (360 / sCount)) * (Math.PI / 180);
      const sx = Math.cos(angle) * (r + 15);
      const sy = Math.sin(angle) * (r + 15);
      const seatId = `${el.id}-seat-${i}`;
      const color = getSeatColor(seatId);
      const isAvailable = availableSet.has(seatId);

      seats.push(
        <Circle 
          key={seatId} 
          x={sx} 
          y={sy} 
          radius={8} 
          fill={color} 
          stroke={isAvailable ? "#16a34a" : "#6b7280"} 
          strokeWidth={1}
          onClick={() => handleSeatClick(seatId)}
          onTap={() => handleSeatClick(seatId)}
        />
      );
    }

    return (
      <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation || 0}>
        <Circle radius={r} fill="#fef3c7" stroke="#fcd34d" strokeWidth={2} />
        <Text text={el.label} offsetX={r} offsetY={6} width={r*2} align="center" fontSize={12} fill="#92400e" fontStyle="bold" />
        {seats}
      </Group>
    );
  };

  const renderChair = (el: LayoutElement) => {
    const seatId = el.id;
    const color = getSeatColor(seatId);
    const isAvailable = availableSet.has(seatId);

    return (
      <Group 
        key={el.id} 
        x={el.x} 
        y={el.y} 
        rotation={el.rotation || 0}
        onClick={() => handleSeatClick(seatId)}
        onTap={() => handleSeatClick(seatId)}
      >
        <Rect width={30} height={30} fill={color} stroke={isAvailable ? "#16a34a" : "#6b7280"} cornerRadius={4} />
        <Text text={el.label} width={30} y={10} align="center" fontSize={10} fill="white" fontStyle="bold" />
      </Group>
    );
  };

  const renderStage = (el: LayoutElement) => {
    const w = el.width || 200;
    const h = el.height || 80;
    return (
      <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation || 0}>
        <Rect width={w} height={h} fill="#1e293b" cornerRadius={8} />
        <Text text={el.label} width={w} y={h/2 - 10} align="center" fontSize={18} fill="white" fontStyle="bold" />
      </Group>
    );
  };

  const renderElement = (el: LayoutElement) => {
    switch(el.type) {
      case 'round_table': return renderRoundTable(el);
      case 'rect_table': return renderRectTable(el);
      case 'bistro': return renderBistro(el);
      case 'chair': return renderChair(el);
      case 'stage': return renderStage(el);
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Mobile Hint Banner */}
      <div className="sm:hidden bg-blue-50 border border-blue-100 text-blue-800 text-xs px-3 py-2 rounded-lg flex items-center justify-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 9l-3 3 3 3"/><path d="M19 9l3 3-3 3"/><path d="M2 12h20"/></svg>
        Haritayı parmağınızla sürükleyerek gezinebilirsiniz
      </div>

      <div ref={containerRef} className="w-full h-[600px] bg-gray-50 border rounded-2xl overflow-hidden relative cursor-grab active:cursor-grabbing shadow-inner">
        {/* Harita Lejantı */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg z-10 flex flex-col gap-2 border">
        <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full bg-[#22c55e]"></div> Boş</div>
        <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full bg-[#3b82f6]"></div> Seçili</div>
        <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full bg-[#9ca3af]"></div> Dolu</div>
      </div>

      <Stage 
        width={stageWidth} 
        height={600}
        scaleX={scale}
        scaleY={scale}
        draggable
      >
        <Layer>
          {bgImageObj && (
            <KonvaImage 
              image={bgImageObj} 
              x={0} 
              y={0} 
              width={1000} 
              height={800} 
              opacity={0.3} 
            />
          )}
          {elements.map(renderElement)}
        </Layer>
      </Stage>
      </div>
    </div>
  );
}
