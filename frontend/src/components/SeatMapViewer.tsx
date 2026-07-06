"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Image as KonvaImage } from 'react-konva';

interface Seat {
  id: string;
  name: string;
  displayName?: string;
  x: number;
  y: number;
}

interface SeatMapViewerProps {
  layoutJson: any;
  availableSeats: Seat[];
  selectedSeatId: string | null;
  onSeatSelect: (seatId: string) => void;
}

export default function SeatMapViewer({ layoutJson, availableSeats, selectedSeatId, onSeatSelect }: SeatMapViewerProps) {
  const [elements, setElements] = useState<any[]>([]);
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!layoutJson) return;
    let parsed = typeof layoutJson === 'string' ? JSON.parse(layoutJson) : layoutJson;
    setElements(parsed.elements || []);
    
    if (parsed.canvas?.backgroundImage) {
      const img = new window.Image();
      img.src = parsed.canvas.backgroundImage;
      img.onload = () => setBgImageObj(img);
    }
  }, [layoutJson]);

  // Handle responsive scaling
  useEffect(() => {
    const checkSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        // Default canvas width is usually 1000 in designer
        const canvasWidth = 1000;
        const newScale = Math.min(width / canvasWidth, 1);
        setScale(newScale);
      }
    };
    
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const availableSet = new Set(availableSeats.map(s => s.id));

  const handleSeatClick = (seatId: string) => {
    if (availableSet.has(seatId)) {
      onSeatSelect(seatId);
    }
  };

  const getSeatColor = (seatId: string) => {
    if (selectedSeatId === seatId) return '#3b82f6'; // Blue for selected
    if (availableSet.has(seatId)) return '#22c55e'; // Green for available
    return '#9ca3af'; // Gray for taken/unavailable
  };

  const renderRoundTable = (el: any) => {
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

  const renderRectTable = (el: any) => {
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

  const renderBistro = (el: any) => {
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

  const renderChair = (el: any) => {
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

  const renderStage = (el: any) => {
    const w = el.width || 200;
    const h = el.height || 80;
    return (
      <Group key={el.id} x={el.x} y={el.y} rotation={el.rotation || 0}>
        <Rect width={w} height={h} fill="#1e293b" cornerRadius={8} />
        <Text text={el.label} width={w} y={h/2 - 10} align="center" fontSize={18} fill="white" fontStyle="bold" />
      </Group>
    );
  };

  const renderElement = (el: any) => {
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
    <div ref={containerRef} className="w-full h-[600px] bg-gray-50 border rounded-2xl overflow-hidden relative cursor-grab active:cursor-grabbing shadow-inner">
      {/* Harita Lejantı */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur p-3 rounded-xl shadow-lg z-10 flex flex-col gap-2 border">
        <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full bg-[#22c55e]"></div> Boş</div>
        <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full bg-[#3b82f6]"></div> Seçili</div>
        <div className="flex items-center gap-2 text-sm"><div className="w-4 h-4 rounded-full bg-[#9ca3af]"></div> Dolu</div>
      </div>

      <Stage 
        width={containerRef.current?.offsetWidth || 1000} 
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
  );
}
