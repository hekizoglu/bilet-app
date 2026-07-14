"use client";

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Image as KonvaImage, Line } from 'react-konva';
import { useSearchParams, useRouter } from 'next/navigation';
import { Trash2, Save, Plus, Settings, Copy, MousePointer2, Image as ImageIcon } from 'lucide-react';

type ElementType = "round_table" | "rect_table" | "bistro" | "chair" | "stage" | "dance_floor" | "emergency_exit" | "entrance";
type NumberingType = "table_only" | "table_and_seats" | "seats_only" | "none";

interface DesignerElement {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  width?: number; 
  height?: number; 
  radius?: number; 
  rotation?: number; 
  seatCount?: number; 
  numberingType?: NumberingType;
}

interface HallLayout {
  canvas: { width: number; height: number };
  elements: DesignerElement[];
}

export interface AutoGenerateConfig {
  hallLengthM: number;
  hallWidthM: number;
  tableRadiusCm: number;
  chairsPerTable: number;
  tableCount?: number;
  minSpacingCm: number;
  stageLengthM: number;
  stageWidthM: number;
  stageCount?: number;
  stageCapacity: number;
  bistroCount?: number;
  totalCapacity?: number;
  numberingType: 'table_only' | 'table_and_seats' | 'seats_only' | 'none';
  chairNumbering?: boolean;
  [key: string]: unknown;
}

interface HallDesignerCanvasProps {
  onAutoGenerate?: (config: AutoGenerateConfig) => void;
}

interface HallDesignerCanvasHandle {
  autoGenerateLayout: (config: AutoGenerateConfig) => void;
}

type ResizeHandle = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const MIN_ELEMENT_SIZE = 30;
const MIN_RADIUS = 20;

// Inner component - sarılmış function
const HallDesignerCanvasInner = forwardRef<HallDesignerCanvasHandle, HallDesignerCanvasProps>(function HallDesignerCanvas({ onAutoGenerate }, ref) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hallId = searchParams.get('id');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState('');
  
  const [elements, setElements] = useState<DesignerElement[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [elementModalOpen, setElementModalOpen] = useState(false);
  const [pendingElementType, setPendingElementType] = useState<ElementType | null>(null);
  const [elementProps, setElementProps] = useState({ label: '', size: 40, height: 40, seatCount: 8 });
  const [chairCounter, setChairCounter] = useState(1);
  const [selectionBox, setSelectionBox] = useState<{ visible: boolean, x1: number, y1: number, x2: number, y2: number }>({ visible: false, x1: 0, y1: 0, x2: 0, y2: 0 });
  
  const [canvasWidth, setCanvasWidth] = useState(1000);
  const [canvasHeight, setCanvasHeight] = useState(800);

  // Arka plan görseli
  const [bgImageObj, setBgImageObj] = useState<HTMLImageElement | null>(null);

  // 🗺️ Pan & Zoom state
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lastPointerPos = useRef<{ x: number; y: number } | null>(null);
  const dragSelectionOriginRef = useRef<Record<string, { x: number; y: number }>>({});

  const SNAP_GRID = 10;

  useEffect(() => {
    if (hallId) fetchHall(hallId);
  }, [hallId]);

  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      img.src = backgroundImage;
      img.onload = () => setBgImageObj(img);
      img.onerror = () => setBgImageObj(null);
    } else {
      setBgImageObj(null);
    }
  }, [backgroundImage]);

  const fetchHall = async (id: string) => {
    const token = getCookie('token');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    try {
      const res = await fetch(`${API_BASE}/api/halls/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setName(data.name);
        setDescription(data.description || '');
        setAddress(data.address || '');
        setIsGlobal(data.isGlobal || false);
        setBackgroundImage(data.backgroundImage || '');
        if (data.layoutJson) {
          try {
            const layout = JSON.parse(data.layoutJson) as HallLayout;
            if (layout.canvas) {
              setCanvasWidth(layout.canvas.width || 1000);
              setCanvasHeight(layout.canvas.height || 800);
            }
            if (layout.elements) {
              setElements(layout.elements);
            } else {
              // Geriye dönük uyumluluk (eski chairs dizisi)
              interface OldChair { id: string; x: number; y: number; }
              const oldChairs: OldChair[] = JSON.parse(data.layoutJson).chairs || [];
              setElements(oldChairs.map((c) => ({
                id: c.id,
                type: 'chair',
                label: c.id.split('-')[1].slice(-3),
                x: c.x,
                y: c.y,
                numberingType: 'seats_only'
              })));
            }
          } catch (e) {
            console.error("Layout parse error", e);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift();
    return null;
  };

  const handleDragStart = (id: string) => {
    const targetIds = selectedIds.includes(id) ? selectedIds : [id];
    dragSelectionOriginRef.current = Object.fromEntries(
      elements
        .filter((el) => targetIds.includes(el.id))
        .map((el) => [el.id, { x: el.x, y: el.y }])
    );
    if (!selectedIds.includes(id)) {
      setSelectedIds([id]);
    }
  };

  const handleDragMove = (e: { target: { x: () => number; y: () => number } }, id: string) => {
    const targetIds = selectedIds.includes(id) ? selectedIds : [id];
    const origin = dragSelectionOriginRef.current[id];
    if (!origin) return;
    const deltaX = e.target.x() - origin.x;
    const deltaY = e.target.y() - origin.y;

    setElements((prev) =>
      prev.map((el) => {
        if (!targetIds.includes(el.id)) return el;
        const base = dragSelectionOriginRef.current[el.id];
        if (!base) return el;
        return { ...el, x: base.x + deltaX, y: base.y + deltaY };
      })
    );
  };

  const handleDragEnd = (id: string) => {
    const targetIds = selectedIds.includes(id) ? selectedIds : [id];
    setElements((prev) =>
      prev.map((el) => {
        if (!targetIds.includes(el.id)) return el;
        return {
          ...el,
          x: Math.round(el.x / SNAP_GRID) * SNAP_GRID,
          y: Math.round(el.y / SNAP_GRID) * SNAP_GRID,
        };
      })
    );
    dragSelectionOriginRef.current = {};
  };

  const addElement = (type: ElementType) => {
    setPendingElementType(type);
    if (type === 'round_table') {
      setElementProps({ label: 'A01', size: 40, height: 40, seatCount: 8 });
    } else if (type === 'rect_table') {
      setElementProps({ label: 'B01', size: 120, height: 60, seatCount: 6 });
    } else if (type === 'bistro') {
      setElementProps({ label: 'C01', size: 25, height: 25, seatCount: 4 });
    } else if (type === 'chair') {
      setElementProps({ label: 'Sandalye ' + chairCounter.toString().padStart(2, '0'), size: 30, height: 30, seatCount: 0 });
    } else if (type === 'stage') {
      setElementProps({ label: 'Sahne', size: 200, height: 80, seatCount: 0 });
    } else if (type === 'dance_floor') {
      setElementProps({ label: '💃 Dans Pisti', size: 160, height: 160, seatCount: 0 });
    } else if (type === 'emergency_exit') {
      setElementProps({ label: '🆘 Acil Çıkış', size: 50, height: 30, seatCount: 0 });
    } else if (type === 'entrance') {
      setElementProps({ label: '🚪 Ana Giriş', size: 60, height: 30, seatCount: 0 });
    }
    setElementModalOpen(true);
  };

  const confirmAddElement = () => {
    if (!pendingElementType) return;
    const type = pendingElementType;
    const id = type + '-' + Date.now();
    const baseElement = { id, type, label: elementProps.label, x: 100, y: 100, rotation: 0, numberingType: 'none' as const };

    if (type === 'round_table') {
      Object.assign(baseElement, { radius: elementProps.size, seatCount: elementProps.seatCount, numberingType: 'table_and_seats' });
    } else if (type === 'rect_table') {
      Object.assign(baseElement, { width: elementProps.size, height: elementProps.height, seatCount: elementProps.seatCount, numberingType: 'table_and_seats' });
    } else if (type === 'chair') {
      Object.assign(baseElement, { width: elementProps.size, height: elementProps.height, numberingType: 'seats_only' });
      setChairCounter(prev => prev + 1);
    } else if (type === 'bistro') {
      Object.assign(baseElement, { radius: elementProps.size, seatCount: elementProps.seatCount, numberingType: 'table_only' });
    } else {
      Object.assign(baseElement, { width: elementProps.size, height: elementProps.height });
    }
    setElements([...elements, baseElement as any]);
    setSelectedIds([id]);
    setElementModalOpen(false);
    setPendingElementType(null);
  };

  const deleteSelected = () => {
    if (selectedIds.length > 0) {
      setElements(elements.filter(e => !selectedIds.includes(e.id)));
      setSelectedIds([]);
    }
  };

  const duplicateSelected = () => {
    if (selectedIds.length > 0) {
      const newElements: DesignerElement[] = [];
      const newIds: string[] = [];
      selectedIds.forEach(id => {
        const target = elements.find(e => e.id === id);
        if (target) {
          const newEl: DesignerElement = { ...target, id: `${target.type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`, x: target.x + 20, y: target.y + 20 };
          newElements.push(newEl);
          newIds.push(newEl.id);
        }
      });
      setElements([...elements, ...newElements]);
      setSelectedIds(newIds);
    }
  };

  const updateSelected = (key: keyof DesignerElement, value: DesignerElement[keyof DesignerElement]) => {
    if (selectedIds.length > 0) {
      setElements(elements.map(e => selectedIds.includes(e.id) ? { ...e, [key]: value } : e));
    }
  };

  const getTotalSeats = () => {
    return elements.reduce((acc, el) => {
      if (el.type === 'stage') return acc;
      return acc + (el.seatCount || 1);
    }, 0);
  };

  const getElementBounds = (el: DesignerElement) => {
    const radius = el.radius || 0;
    const width = el.width ?? radius * 2;
    const height = el.height ?? radius * 2;
    return { x: el.x, y: el.y, width, height };
  };

  const alignSelected = (mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedIds.length < 2) return;

    const selectedElements = elements.filter((el) => selectedIds.includes(el.id));
    const bounds = selectedElements.map(getElementBounds);

    const minX = Math.min(...bounds.map((b) => b.x));
    const maxX = Math.max(...bounds.map((b) => b.x + b.width));
    const minY = Math.min(...bounds.map((b) => b.y));
    const maxY = Math.max(...bounds.map((b) => b.y + b.height));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setElements((prev) =>
      prev.map((el) => {
        if (!selectedIds.includes(el.id)) return el;
        const box = getElementBounds(el);
        const next = { ...el };

        if (mode === 'left') next.x = minX;
        if (mode === 'right') next.x = maxX - box.width;
        if (mode === 'center') next.x = centerX - box.width / 2;
        if (mode === 'top') next.y = minY;
        if (mode === 'bottom') next.y = maxY - box.height;
        if (mode === 'middle') next.y = centerY - box.height / 2;

        next.x = Math.round(next.x / SNAP_GRID) * SNAP_GRID;
        next.y = Math.round(next.y / SNAP_GRID) * SNAP_GRID;
        return next;
      })
    );
  };

  const distributeSelected = () => {
    if (selectedIds.length < 2) return;
    const selectedElements = elements.filter(el => selectedIds.includes(el.id));
    const sorted = [...selectedElements].sort((a, b) => (a.y - b.y) || (a.x - b.x));
    const startX = sorted[0].x;
    const startY = sorted[0].y;
    
    const cols = Math.ceil(Math.sqrt(sorted.length));
    const padding = 20;
    
    // Find max width and height for uniform grid
    const maxWidth = Math.max(...sorted.map(el => getElementBounds(el).width));
    const maxHeight = Math.max(...sorted.map(el => getElementBounds(el).height));
    
    setElements(prev => prev.map(el => {
      if (!selectedIds.includes(el.id)) return el;
      
      const index = sorted.findIndex(s => s.id === el.id);
      const col = index % cols;
      const row = Math.floor(index / cols);
      
      const next = { ...el };
      next.x = Math.round((startX + col * (maxWidth + padding)) / SNAP_GRID) * SNAP_GRID;
      next.y = Math.round((startY + row * (maxHeight + padding)) / SNAP_GRID) * SNAP_GRID;
      
      return next;
    }));
  };

  const resizeElement = (id: string, handle: ResizeHandle, deltaX: number, deltaY: number) => {
    setElements((prev) =>
      prev.map((el) => {
        if (el.id !== id) return el;

        if (el.radius) {
          const radiusDelta = Math.max(deltaX, deltaY) / 2;
          const nextRadius = Math.max(MIN_RADIUS, Math.round((el.radius + radiusDelta) / 5) * 5);
          return { ...el, radius: nextRadius };
        }

        const width = el.width || MIN_ELEMENT_SIZE;
        const height = el.height || MIN_ELEMENT_SIZE;
        let nextX = el.x;
        let nextY = el.y;
        let nextWidth = width;
        let nextHeight = height;

        if (handle === 'top-left') {
          nextX += deltaX;
          nextY += deltaY;
          nextWidth -= deltaX;
          nextHeight -= deltaY;
        } else if (handle === 'top-right') {
          nextY += deltaY;
          nextWidth += deltaX;
          nextHeight -= deltaY;
        } else if (handle === 'bottom-left') {
          nextX += deltaX;
          nextWidth -= deltaX;
          nextHeight += deltaY;
        } else {
          nextWidth += deltaX;
          nextHeight += deltaY;
        }

        if (nextWidth < MIN_ELEMENT_SIZE) {
          if (handle === 'top-left' || handle === 'bottom-left') {
            nextX -= MIN_ELEMENT_SIZE - nextWidth;
          }
          nextWidth = MIN_ELEMENT_SIZE;
        }

        if (nextHeight < MIN_ELEMENT_SIZE) {
          if (handle === 'top-left' || handle === 'top-right') {
            nextY -= MIN_ELEMENT_SIZE - nextHeight;
          }
          nextHeight = MIN_ELEMENT_SIZE;
        }

        return {
          ...el,
          x: Math.round(nextX / SNAP_GRID) * SNAP_GRID,
          y: Math.round(nextY / SNAP_GRID) * SNAP_GRID,
          width: Math.round(nextWidth / SNAP_GRID) * SNAP_GRID,
          height: Math.round(nextHeight / SNAP_GRID) * SNAP_GRID,
        };
      })
    );
  };

  // 🗺️ Wheel zoom handler
  const handleWheel = (e: { evt: WheelEvent }) => {
    e.evt.preventDefault();
    const scaleBy = 1.08;
    const oldScale = stageScale;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.max(0.2, Math.min(5, newScale));
    setStageScale(clampedScale);
  };

  const handleStageMouseDown = (e: any) => {
    // Middle mouse or space+left for pan
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
      setIsPanning(true);
      const stage = e.target.getStage();
      lastPointerPos.current = stage.getPointerPosition();
    } else {
      const isResizeHandle = typeof e.target.name === 'function' && String(e.target.name()).startsWith('resize-handle');
      if (isResizeHandle) return;
      const isBg = e.target === e.target.getStage?.() || e.target.name?.() === 'bgImage' || e.target.name?.() === 'hallBoundsGroup' || e.target.name?.() === 'hallBoundsRect';
      if (isBg) {
        if (!e.evt.shiftKey && !e.evt.ctrlKey) setSelectedIds([]);
        const stage = e.target.getStage();
        const pos = stage.getPointerPosition();
        if (pos) {
          const scale = stage.scaleX();
          const stagePos = stage.position();
          const logicalX = (pos.x - stagePos.x) / scale;
          const logicalY = (pos.y - stagePos.y) / scale;
          setSelectionBox({ visible: true, x1: logicalX, y1: logicalY, x2: logicalX, y2: logicalY });
        }
      }
    }
  };

  const handleStageMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    
    if (isPanning && lastPointerPos.current) {
      if (!pos) return;
      setStagePos(prev => ({
        x: prev.x + (pos.x - lastPointerPos.current!.x),
        y: prev.y + (pos.y - lastPointerPos.current!.y),
      }));
      lastPointerPos.current = pos;
    } else if (selectionBox.visible) {
      if (!pos) return;
      const scale = stage.scaleX();
      const stagePos = stage.position();
      const logicalX = (pos.x - stagePos.x) / scale;
      const logicalY = (pos.y - stagePos.y) / scale;
      setSelectionBox(prev => ({ ...prev, x2: logicalX, y2: logicalY }));
    }
  };

  const handleStageMouseUp = (e: any) => {
    setIsPanning(false);
    if (selectionBox.visible) {
      setSelectionBox(prev => ({ ...prev, visible: false }));
      
      const xMin = Math.min(selectionBox.x1, selectionBox.x2);
      const xMax = Math.max(selectionBox.x1, selectionBox.x2);
      const yMin = Math.min(selectionBox.y1, selectionBox.y2);
      const yMax = Math.max(selectionBox.y1, selectionBox.y2);

      const newlySelected = elements.filter(el => {
        const radius = el.radius || 25;
        const w = el.width || radius * 2;
        const h = el.height || radius * 2;
        return (el.x + w >= xMin && el.x <= xMax && el.y + h >= yMin && el.y <= yMax);
      }).map(el => el.id);

      if (e.evt.shiftKey || e.evt.ctrlKey) {
        setSelectedIds(prev => Array.from(new Set([...prev, ...newlySelected])));
      } else {
        setSelectedIds(newlySelected);
      }
    }
  };

  // 🎭 Otomatik Sahne Oluştur - Sihirbazdan gelen tam config
  const autoGenerateLayout = useCallback((config: AutoGenerateConfig) => {
    const PIXEL_PER_METER = 80;
    const newCanvasWidth = config.hallLengthM * PIXEL_PER_METER;
    const newCanvasHeight = config.hallWidthM * PIXEL_PER_METER;
    setCanvasWidth(newCanvasWidth);
    setCanvasHeight(newCanvasHeight);

    const TABLE_RADIUS = Math.max(20, (config.tableRadiusCm / 100) * PIXEL_PER_METER / 2);
    const TABLE_SEATS = config.chairsPerTable;
    const MIN_SPACING = Math.max(20, (config.minSpacingCm / 100) * PIXEL_PER_METER);

    const STAGE_W = config.stageLengthM * PIXEL_PER_METER;
    const STAGE_H = config.stageWidthM * PIXEL_PER_METER;
    const stageCount = config.stageCount ?? 1;
    const stagePosition = (config.stagePosition as string) || 'front';

    const MAX_CAPACITY = Math.min(config.totalCapacity ?? 2000, 2000);

    const newElements: DesignerElement[] = [];
    let nextId = Date.now();

    // ─── 1. SAHNE ────────────────────────────────────────────────────────
    let stageTopBoundary = 0;    // sahne alanının alt sınırı (masalar buradan başlar)
    let stageBotBoundary = newCanvasHeight; // alt sahne için üst sınır
    let stageLeftBound  = 0;
    let stageRightBound = newCanvasWidth;

    if (stageCount > 0) {
      let sx = 0, sy = 0;
      if (stagePosition === 'front' || stagePosition === 'back') {
        sx = (newCanvasWidth - STAGE_W) / 2;
        sy = stagePosition === 'front' ? 20 : newCanvasHeight - STAGE_H - 20;
        if (stagePosition === 'front') stageTopBoundary = STAGE_H + 50;
        else stageBotBoundary = newCanvasHeight - STAGE_H - 50;
      } else if (stagePosition === 'side_left') {
        sx = 20;
        sy = (newCanvasHeight - STAGE_H) / 2;
        stageLeftBound = STAGE_W + 50;
      } else if (stagePosition === 'side_right') {
        sx = newCanvasWidth - STAGE_W - 20;
        sy = (newCanvasHeight - STAGE_H) / 2;
        stageRightBound = newCanvasWidth - STAGE_W - 50;
      } else if (stagePosition === 'center') {
        sx = (newCanvasWidth - STAGE_W) / 2;
        sy = (newCanvasHeight - STAGE_H) / 2;
        // Merkez sahne: masalar etrafa yerleştirilir — alt+üst boşluk azalt
        stageTopBoundary = sy - TABLE_RADIUS * 2 - MIN_SPACING;
      }
      newElements.push({
        id: `stage-${nextId++}`,
        type: 'stage',
        label: `🎤 Sahne`,
        x: sx, y: sy,
        width: STAGE_W, height: STAGE_H,
        rotation: 0, seatCount: 0, numberingType: 'none'
      });
    }

    // ─── 2. DANS PİSTİ ────────────────────────────────────────────────────
    const danceFloorM = config.danceFloorM as number | undefined;
    if (config.hasDanceFloor && danceFloorM && danceFloorM > 0) {
      const DW = danceFloorM * PIXEL_PER_METER;
      const DH = danceFloorM * PIXEL_PER_METER;
      const dx = (newCanvasWidth - DW) / 2;
      const dy = stageTopBoundary + 20;
      newElements.push({
        id: `dance_floor-${nextId++}`,
        type: 'dance_floor',
        label: `💃 Dans Pisti`,
        x: dx, y: dy,
        width: DW, height: DH,
        rotation: 0, seatCount: 0, numberingType: 'none'
      });
      stageTopBoundary = dy + DH + 30;
    }

    // ─── 3. MASALAR ───────────────────────────────────────────────────────
    const TABLE_DIAMETER = TABLE_RADIUS * 2;
    const areaLeft   = stageLeftBound + 30;
    const areaTop    = stageTopBoundary + 20;
    const areaRight  = stageRightBound - 30;
    const areaBottom = stageBotBoundary - 20;
    const areaW = areaRight - areaLeft;
    const areaH = areaBottom - areaTop;

    const COLS = Math.max(1, Math.floor(areaW / (TABLE_DIAMETER + MIN_SPACING)));
    const maxRows = Math.max(1, Math.floor(areaH / (TABLE_DIAMETER + MIN_SPACING)));
    const maxTables = Math.floor(MAX_CAPACITY / Math.max(1, TABLE_SEATS));

    let tableCount = 0;
    let totalSeats = 0;
    outer:
    for (let row = 0; row < maxRows; row++) {
      for (let col = 0; col < COLS; col++) {
        if (tableCount >= maxTables) break outer;
        const tx = areaLeft + col * (TABLE_DIAMETER + MIN_SPACING) + TABLE_RADIUS;
        const ty = areaTop  + row * (TABLE_DIAMETER + MIN_SPACING) + TABLE_RADIUS;
        if (tx + TABLE_RADIUS > areaRight || ty + TABLE_RADIUS > areaBottom) continue;
        tableCount++;
        totalSeats += TABLE_SEATS;
        newElements.push({
          id: `round_table-${nextId++}`,
          type: 'round_table',
          label: `T${tableCount}`,
          x: tx - TABLE_RADIUS, y: ty - TABLE_RADIUS,
          radius: TABLE_RADIUS,
          rotation: 0, seatCount: TABLE_SEATS,
          numberingType: config.numberingType
        });
      }
    }

    // ─── 4. BİSTRO / BAR ─────────────────────────────────────────────────
    const bistroCount = config.bistroCount ?? 0;
    for (let i = 0; i < bistroCount; i++) {
      const bx = 30 + i * 70;
      const by = newCanvasHeight - 60;
      newElements.push({
        id: `bistro-${nextId++}`,
        type: 'bistro',
        label: `🍹 Bar ${i + 1}`,
        x: bx, y: by,
        radius: 25, rotation: 0, seatCount: 4, numberingType: 'none'
      });
    }

    // ─── 5. ACİL ÇIKIŞLAR ─────────────────────────────────────────────────
    const exitCount = (config.emergencyExitCount as number | undefined) ?? 0;
    const exits = exitCount + ((config.mainEntranceCount as number | undefined) ?? 0);
    const allExitPositions = [
      { x: 0,             y: newCanvasHeight / 2 - 20 },
      { x: newCanvasWidth - 50, y: newCanvasHeight / 2 - 20 },
      { x: newCanvasWidth / 2 - 25, y: 0 },
      { x: newCanvasWidth / 2 - 25, y: newCanvasHeight - 30 },
      { x: 0,             y: 40 },
      { x: newCanvasWidth - 50, y: newCanvasHeight - 60 },
    ];
    for (let i = 0; i < Math.min(exits, allExitPositions.length); i++) {
      const pos = allExitPositions[i];
      const isMain = i < ((config.mainEntranceCount as number | undefined) ?? 0);
      newElements.push({
        id: `${isMain ? 'entrance' : 'emergency_exit'}-${nextId++}`,
        type: isMain ? 'entrance' : 'emergency_exit',
        label: isMain ? `🚪 Giriş ${i + 1}` : `🆘 Çıkış ${i + 1}`,
        x: pos.x, y: pos.y,
        width: 50, height: 30,
        rotation: 0, seatCount: 0, numberingType: 'none'
      });
    }

    setElements(newElements);
    setSelectedIds([]);
    // Canvas'ı sığacak şekilde zoom reset
    setStageScale(Math.min(900 / newCanvasWidth, 750 / newCanvasHeight, 1));
    setStagePos({ x: 20, y: 20 });

    const summary = [
      `✅ Salon Oluşturuldu!`,
      `• Alan: ${config.hallLengthM}m × ${config.hallWidthM}m`,
      `• Masa: ${tableCount} adet | Kapasite: ${totalSeats} kişi`,
      stageCount > 0 ? `• Sahne: ${stageCount} adet (${config.stageLengthM}×${config.stageWidthM}m)` : '',
      bistroCount > 0 ? `• Bar/Bistro: ${bistroCount} adet` : '',
      exits > 0 ? `• Çıkış/Giriş: ${exits} adet` : '',
    ].filter(Boolean).join('\n');
    alert(summary);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 📊 İstatistik Hesaplayıcı
  const getStatistics = () => {
    const tables = elements.filter(e => e.type !== 'stage' && e.type !== 'chair');
    const chairs = elements.filter(e => e.type === 'chair');
    const stages = elements.filter(e => e.type === 'stage');
    const totalSeats = getTotalSeats();

    return {
      tables: tables.length,
      chairs: chairs.length,
      stages: stages.length,
      totalSeats,
      avgSeatsPerTable: tables.length > 0 ? Math.round(tables.reduce((acc, t) => acc + (t.seatCount || 1), 0) / tables.length) : 0
    };
  };

  const saveLayout = useCallback(async () => {
    if (!name.trim()) {
      alert("Lütfen salon adı giriniz.");
      return;
    }

    const token = getCookie('token');
    
    const payload = {
      name,
      description,
      address,
      seatCount: elements.reduce((acc, el) => acc + (el.seatCount || 1), 0),
      layoutJson: JSON.stringify({ canvas: { width: canvasWidth, height: canvasHeight }, elements }),
      backgroundImage,
      isGlobal
    };

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

    try {
      const url = hallId ? `${API_BASE}/api/halls/${hallId}` : `${API_BASE}/api/halls`;
      const method = hallId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Kayıt Başarılı!");
        router.push('/admin/halls');
      } else {
        const errData = await res.json();
        alert(`Hata: ${errData.error || errData.details}`);
      }
    } catch (e) {
      console.error(e);
      alert("Sunucuya ulaşılamadı.");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, description, address, elements, backgroundImage, isGlobal, hallId, router]);

  // Forward Ref — saveLayout ve autoGenerateLayout expose et
  useImperativeHandle(ref, () => ({
    autoGenerateLayout,
    saveLayout,
  }), [autoGenerateLayout, saveLayout]);

  const selectedElement = selectedIds.length > 0
    ? elements.find(e => e.id === selectedIds[0]) ?? null
    : null;
  const hasSelection = selectedIds.length > 0;

  // --- Çizim Yardımcı Fonksiyonları ---
  const renderRoundTable = (el: DesignerElement, isSelected: boolean) => {
    const r = el.radius || 40;
    const sCount = el.seatCount || 8;
    const showSeatNums = el.numberingType === 'table_and_seats' || el.numberingType === 'seats_only';
    const seats = [];
    
    for(let i=0; i<sCount; i++) {
      const angle = (i * (360 / sCount)) * (Math.PI / 180);
      const sx = Math.cos(angle) * (r + 15);
      const sy = Math.sin(angle) * (r + 15);
      const seatLabel = el.numberingType === 'table_and_seats'
        ? String.fromCharCode(65 + i)       // A, B, C...
        : String(i + 1);                    // 1, 2, 3...
      seats.push(
        <React.Fragment key={`seat-${i}`}>
          <Circle x={sx} y={sy} radius={10} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} perfectDrawEnabled={false} />
          {showSeatNums && (
            <Text x={sx - 8} y={sy - 5} width={16} text={seatLabel} fontSize={7} fill="#374151" align="center" perfectDrawEnabled={false} />
          )}
        </React.Fragment>
      );
    }

    return (
      <Group>
        {seats}
        <Circle radius={r} fill="white" stroke={isSelected ? "#4f46e5" : "#cbd5e1"} strokeWidth={isSelected ? 3 : 2} perfectDrawEnabled={false} />
        <Text text={el.label} offsetX={r} offsetY={6} width={r*2} align="center" fontSize={14} fill="#1e293b" fontStyle="bold" perfectDrawEnabled={false} />
      </Group>
    );
  };

  const renderRectTable = (el: DesignerElement, isSelected: boolean) => {
    const w = el.width || 120;
    const h = el.height || 60;
    const sCount = el.seatCount || 6;
    
    // Basit dağılım: Uzun kenarlara sandalyeler dizilir (örnek amaçlı alt/üst)
    const seats = [];
    const topBottomCount = Math.floor(sCount / 2);
    const spacing = w / (topBottomCount + 1);
    const showSeatNums = el.numberingType === 'table_and_seats' || el.numberingType === 'seats_only';
    
    for(let i=0; i<topBottomCount; i++) {
      const topLabel = String(i + 1);
      const topX = spacing * (i+1) - 10;
      seats.push(
        <React.Fragment key={`t-${i}`}>
          <Rect x={topX} y={-25} width={20} height={20} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} cornerRadius={4} perfectDrawEnabled={false} />
          {showSeatNums && (
            <Text x={topX} y={-19} width={20} text={topLabel} fontSize={8} fill="#374151" align="center" perfectDrawEnabled={false} />
          )}
        </React.Fragment>
      );
      
      const bottomIdx = i + topBottomCount;
      const bottomLabel = String(bottomIdx + 1);
      const bottomX = spacing * (i+1) - 10;
      seats.push(
        <React.Fragment key={`b-${i}`}>
          <Rect x={bottomX} y={h + 5} width={20} height={20} fill="#e5e7eb" stroke="#9ca3af" strokeWidth={1} cornerRadius={4} perfectDrawEnabled={false} />
          {showSeatNums && (
            <Text x={bottomX} y={h + 11} width={20} text={bottomLabel} fontSize={8} fill="#374151" align="center" perfectDrawEnabled={false} />
          )}
        </React.Fragment>
      );
    }

    return (
      <Group>
        {seats}
        <Rect width={w} height={h} fill="white" stroke={isSelected ? "#4f46e5" : "#cbd5e1"} strokeWidth={isSelected ? 3 : 2} cornerRadius={4} perfectDrawEnabled={false} />
        <Text text={el.label} width={w} y={h/2 - 7} align="center" fontSize={14} fill="#1e293b" fontStyle="bold" perfectDrawEnabled={false} />
      </Group>
    );
  };

  const renderStage = (el: DesignerElement, isSelected: boolean) => {
    const w = el.width || 200;
    const h = el.height || 80;
    return (
      <Group>
        <Rect width={w} height={h} fill="#1e293b" stroke={isSelected ? "#fbbf24" : "transparent"} strokeWidth={3} cornerRadius={8} perfectDrawEnabled={false} />
        <Text text={el.label} width={w} y={h/2 - 10} align="center" fontSize={18} fill="white" fontStyle="bold" perfectDrawEnabled={false} />
      </Group>
    );
  };

  const renderBistro = (el: DesignerElement, isSelected: boolean) => {
    const r = el.radius || 25;
    return (
      <Group>
        <Circle radius={r} fill="#fef3c7" stroke={isSelected ? "#d97706" : "#fcd34d"} strokeWidth={isSelected ? 3 : 2} perfectDrawEnabled={false} />
        <Text text={el.label} offsetX={r} offsetY={6} width={r*2} align="center" fontSize={12} fill="#92400e" fontStyle="bold" perfectDrawEnabled={false} />
      </Group>
    );
  };

  const renderDanceFloor = (el: DesignerElement, isSelected: boolean) => {
    const w = el.width || 160;
    const h = el.height || 160;
    return (
      <Group>
        <Rect width={w} height={h} fill="#f0abfc" stroke={isSelected ? "#a21caf" : "#d946ef"} strokeWidth={isSelected ? 3 : 2} cornerRadius={12} opacity={0.7} perfectDrawEnabled={false} />
        <Text text={el.label} width={w} y={h / 2 - 8} align="center" fontSize={15} fill="#581c87" fontStyle="bold" perfectDrawEnabled={false} />
      </Group>
    );
  };

  const renderEmergencyExit = (el: DesignerElement, isSelected: boolean) => {
    const w = el.width || 50;
    const h = el.height || 30;
    return (
      <Group>
        <Rect width={w} height={h} fill="#fef2f2" stroke={isSelected ? "#dc2626" : "#ef4444"} strokeWidth={isSelected ? 3 : 2} cornerRadius={4} perfectDrawEnabled={false} />
        <Text text={el.label} width={w} y={h / 2 - 7} align="center" fontSize={11} fill="#991b1b" fontStyle="bold" perfectDrawEnabled={false} />
      </Group>
    );
  };

  const renderEntrance = (el: DesignerElement, isSelected: boolean) => {
    const w = el.width || 50;
    const h = el.height || 30;
    return (
      <Group>
        <Rect width={w} height={h} fill="#f0fdf4" stroke={isSelected ? "#16a34a" : "#22c55e"} strokeWidth={isSelected ? 3 : 2} cornerRadius={4} perfectDrawEnabled={false} />
        <Text text={el.label} width={w} y={h / 2 - 7} align="center" fontSize={11} fill="#14532d" fontStyle="bold" perfectDrawEnabled={false} />
      </Group>
    );
  };

  const renderChair = (el: DesignerElement, isSelected: boolean) => {
    return (
      <Group>
        <Rect width={30} height={30} fill={isSelected ? "#4f46e5" : "#cbd5e1"} cornerRadius={4} shadowColor="rgba(0,0,0,0.2)" shadowBlur={2} shadowOffsetY={2} perfectDrawEnabled={false} />
        <Text text={el.label} width={30} y={10} align="center" fontSize={10} fill={isSelected ? "white" : "#1e293b"} perfectDrawEnabled={false} />
      </Group>
    );
  };

  const renderResizeHandles = (el: DesignerElement) => {
    const showHandles = selectedIds.length === 1
      ? selectedIds.includes(el.id)
      : hoveredId === el.id;
    if (!showHandles) return null;

    if (el.radius) {
      const radius = el.radius;
      return (
        <Group>
          <Line
            points={[radius * 0.7, radius * 0.7, radius + 18, radius + 18]}
            stroke="#2563eb"
            strokeWidth={2}
            dash={[4, 3]}
            listening={false}
          />
          <Circle
            x={radius + 18}
            y={radius + 18}
            radius={8}
            fill="#2563eb"
            stroke="white"
            strokeWidth={2}
            name="resize-handle-bottom-right"
            draggable
            dragOnTop={false}
            onDragStart={() => {
              setSelectedIds([el.id]);
              setIsResizing(true);
            }}
            onDragMove={(e) => resizeElement(el.id, 'bottom-right', e.target.x() - (radius + 18), e.target.y() - (radius + 18))}
            onDragEnd={(e) => {
              setIsResizing(false);
              e.target.position({ x: radius + 18, y: radius + 18 });
            }}
          />
        </Group>
      );
    }

    const width = el.width || MIN_ELEMENT_SIZE;
    const height = el.height || MIN_ELEMENT_SIZE;
    const handles: Array<{ key: ResizeHandle; x: number; y: number; cursor: string }> = [
      { key: 'top-left', x: 0, y: 0, cursor: 'nwse-resize' },
      { key: 'top-right', x: width, y: 0, cursor: 'nesw-resize' },
      { key: 'bottom-left', x: 0, y: height, cursor: 'nesw-resize' },
      { key: 'bottom-right', x: width, y: height, cursor: 'nwse-resize' },
    ];

    return handles.map((handle) => (
      <Rect
        key={handle.key}
        x={handle.x - 6}
        y={handle.y - 6}
        width={12}
        height={12}
        fill="#2563eb"
        stroke="white"
        strokeWidth={2}
        cornerRadius={3}
        name={`resize-handle-${handle.key}`}
        draggable
        dragOnTop={false}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = handle.cursor;
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'default';
        }}
        onDragStart={() => {
          setSelectedIds([el.id]);
          setIsResizing(true);
        }}
        onDragMove={(e) => resizeElement(el.id, handle.key, e.target.x() - (handle.x - 6), e.target.y() - (handle.y - 6))}
        onDragEnd={(e) => {
          setIsResizing(false);
          e.target.position({ x: handle.x - 6, y: handle.y - 6 });
        }}
      />
    ));
  };

  return (
    <div className="flex h-full gap-0">
      {/* Sol: Canvas - Full Height */}
      <div 
        className="flex-1 bg-gray-200 rounded-lg overflow-auto shadow-inner border border-gray-300 relative"
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedIds([]);
        }}
      >
        {/* 🔍 Zoom Kontrolleri */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
          <button onClick={() => setStageScale(s => Math.min(5, +(s * 1.2).toFixed(2)))} className="w-8 h-8 bg-white rounded shadow text-gray-700 font-bold text-lg hover:bg-gray-100 flex items-center justify-center">+</button>
          <button onClick={() => { setStageScale(1); setStagePos({ x: 0, y: 0 }); }} className="w-8 h-8 bg-white rounded shadow text-gray-500 text-xs font-bold hover:bg-gray-100 flex items-center justify-center">⊙</button>
          <button onClick={() => setStageScale(s => Math.max(0.2, +(s / 1.2).toFixed(2)))} className="w-8 h-8 bg-white rounded shadow text-gray-700 font-bold text-lg hover:bg-gray-100 flex items-center justify-center">−</button>
        </div>
        <div className="absolute bottom-3 left-3 z-10 text-xs text-gray-400 bg-white/70 rounded px-2 py-1">
          Zoom: {Math.round(stageScale * 100)}% | Alt+Sürükle veya tekerlek ile gezin
        </div>

        <div className="min-w-max min-h-max p-4">
          <Stage
            width={canvasWidth}
            height={canvasHeight}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            onWheel={handleWheel}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            style={{ cursor: isPanning ? 'grabbing' : 'default' }}
          >
            <Layer>
              {bgImageObj && (
                <KonvaImage image={bgImageObj} x={0} y={0} width={canvasWidth} height={canvasHeight} opacity={0.5} name="bgImage" />
              )}

              {elements.map(el => {
                const isSelected = selectedIds.includes(el.id);
                return (
                  <Group
                    key={el.id}
                    x={el.x}
                    y={el.y}
                    rotation={el.rotation || 0}
                    draggable={!isPanning && !isResizing}
                    onDragStart={() => handleDragStart(el.id)}
                    onDragMove={(e) => handleDragMove(e, el.id)}
                    onDragEnd={() => handleDragEnd(el.id)}
                    onMouseEnter={() => setHoveredId(el.id)}
                    onMouseLeave={() => setHoveredId((current) => (current === el.id ? null : current))}
                    onClick={(e) => {
                      if (isPanning || isResizing) return;
                      if (e.evt.shiftKey || e.evt.ctrlKey) {
                        setSelectedIds(prev => prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]);
                      } else {
                        setSelectedIds([el.id]);
                      }
                    }}
                    onTap={() => setSelectedIds([el.id])}
                  >
                    {el.type === 'round_table' && renderRoundTable(el, isSelected)}
                    {el.type === 'rect_table' && renderRectTable(el, isSelected)}
                    {el.type === 'stage' && renderStage(el, isSelected)}
                    {el.type === 'bistro' && renderBistro(el, isSelected)}
                    {el.type === 'dance_floor' && renderDanceFloor(el, isSelected)}
                    {el.type === 'emergency_exit' && renderEmergencyExit(el, isSelected)}
                    {el.type === 'entrance' && renderEntrance(el, isSelected)}
                    {el.type === 'chair' && renderChair(el, isSelected)}
                    {renderResizeHandles(el)}
                  </Group>
                );
              })}
              {selectionBox.visible && (
                <Rect
                  x={Math.min(selectionBox.x1, selectionBox.x2)}
                  y={Math.min(selectionBox.y1, selectionBox.y2)}
                  width={Math.abs(selectionBox.x2 - selectionBox.x1)}
                  height={Math.abs(selectionBox.y2 - selectionBox.y1)}
                  fill="rgba(59, 130, 246, 0.15)"
                  stroke="#3b82f6"
                  strokeWidth={1}
                  dash={[6, 4]}
                  listening={false}
                />
              )}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* Sağ: Kontrol Paneli - Collapsible */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-lg">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">⚙️ Salon Ayarları</h2>
          <Settings size={18} className="text-gray-600" />
        </div>
        
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Temel Bilgiler - Compact */}
          <div className="space-y-2">
            <input type="text" placeholder="Salon Adı" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" />
            <textarea 
              placeholder="Adres..."
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded text-xs h-12 resize-none"
            />
            <div className="flex gap-2">
              <input type="number" placeholder="Genişlik (px)" value={canvasWidth} onChange={e => setCanvasWidth(Number(e.target.value))} className="w-1/2 p-2 border border-gray-300 rounded text-xs" />
              <input type="number" placeholder="Yükseklik (px)" value={canvasHeight} onChange={e => setCanvasHeight(Number(e.target.value))} className="w-1/2 p-2 border border-gray-300 rounded text-xs" />
            </div>
            <input type="text" placeholder="Arkaplan Resmi URL" value={backgroundImage} onChange={(e) => setBackgroundImage(e.target.value)} className="w-full p-2 border border-gray-300 rounded text-sm" />
          </div>

          {/* Eleman Ekleme - Compact Grid */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">➕ Eleman Ekle</p>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => addElement('round_table')} className="text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded border border-gray-200 font-medium text-gray-700">🔴 Yuvarlak</button>
              <button onClick={() => addElement('rect_table')} className="text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded border border-gray-200 font-medium text-gray-700">▭ Dikdörtgen</button>
              <button onClick={() => addElement('bistro')} className="text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded border border-gray-200 font-medium text-gray-700">🍹 Bistro</button>
              <button onClick={() => addElement('chair')} className="text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded border border-gray-200 font-medium text-gray-700">🪑 Sandalye</button>
              <button onClick={() => addElement('stage')} className="text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded border border-gray-200 font-medium text-gray-700 col-span-2">🎤 Sahne</button>
              <button onClick={() => addElement('dance_floor')} className="text-xs bg-purple-50 hover:bg-purple-100 p-1.5 rounded border border-purple-200 font-medium text-purple-700">💃 Dans Pisti</button>
              <button onClick={() => addElement('emergency_exit')} className="text-xs bg-red-50 hover:bg-red-100 p-1.5 rounded border border-red-200 font-medium text-red-700">🆘 Acil Çıkış</button>
              <button onClick={() => addElement('entrance')} className="text-xs bg-green-50 hover:bg-green-100 p-1.5 rounded border border-green-200 font-medium text-green-700 col-span-2">🚪 Ana Giriş</button>
            </div>
          </div>

          {/* Otomatik Oluştur */}
          <div className="bg-purple-50 p-3 rounded border border-purple-200">
            <p className="text-xs font-bold text-purple-900 mb-2">⚡ Otomatik Oluştur</p>
            <button 
              onClick={() => autoGenerateLayout({
                hallLengthM: 12,
                hallWidthM: 8,
                tableRadiusCm: 120,
                chairsPerTable: 8,
                minSpacingCm: 100,
                stageLengthM: 6,
                stageWidthM: 2,
                stageCapacity: 150,
                numberingType: 'table_and_seats'
              })}
              className="w-full bg-purple-600 text-white hover:bg-purple-700 font-bold py-2 px-2 rounded text-xs transition"
            >
              ✨ Yerleştir
            </button>
          </div>

          {/* İstatistikler */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Hizalama</p>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => alignSelected('left')} disabled={selectedIds.length < 2} className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-40 p-1.5 rounded border border-slate-200 font-medium text-slate-700">Sol</button>
              <button onClick={() => alignSelected('center')} disabled={selectedIds.length < 2} className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-40 p-1.5 rounded border border-slate-200 font-medium text-slate-700">Orta X</button>
              <button onClick={() => alignSelected('right')} disabled={selectedIds.length < 2} className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-40 p-1.5 rounded border border-slate-200 font-medium text-slate-700">Sağ</button>
              <button onClick={() => alignSelected('top')} disabled={selectedIds.length < 2} className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-40 p-1.5 rounded border border-slate-200 font-medium text-slate-700">Üst</button>
              <button onClick={() => alignSelected('middle')} disabled={selectedIds.length < 2} className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-40 p-1.5 rounded border border-slate-200 font-medium text-slate-700">Orta Y</button>
              <button onClick={() => alignSelected('bottom')} disabled={selectedIds.length < 2} className="text-xs bg-slate-100 hover:bg-slate-200 disabled:opacity-40 p-1.5 rounded border border-slate-200 font-medium text-slate-700">Alt</button>
              <button onClick={distributeSelected} disabled={selectedIds.length < 2} className="text-xs bg-indigo-100 hover:bg-indigo-200 disabled:opacity-40 p-1.5 rounded border border-indigo-200 font-medium text-indigo-700 col-span-3">Izgara Dağıt (Grid)</button>
            </div>
            <p className="mt-2 text-[11px] text-gray-500">Çoklu seçim sonrası elemanları birlikte taşıyabilir ve hizalayabilirsiniz.</p>
          </div>

          {(() => {
            const stats = getStatistics();
            return (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-xs font-bold text-green-900 mb-2">📊 İstatistikler</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-green-800">
                  <div className="bg-white p-1.5 rounded border border-green-100">
                    <p className="text-gray-500 text-xs">Masalar</p>
                    <p className="font-bold text-green-700">{stats.tables}</p>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-green-100">
                    <p className="text-gray-500 text-xs">Kapasite</p>
                    <p className="font-bold text-green-700">{stats.totalSeats}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Seçili Öğe */}
          {selectedElement && (
            <div className="bg-blue-50 p-3 rounded border border-blue-100 space-y-2">
              <p className="text-xs font-bold text-blue-900">🔹 Seçili Öğe: {selectedElement.label}</p>
              <input type="text" value={selectedElement!.label} onChange={(e) => updateSelected('label', e.target.value)} className="w-full p-1.5 border border-blue-200 rounded text-xs" placeholder="Label" />
              {selectedElement!.type !== 'stage' && (
                <input type="number" min="1" value={selectedElement!.seatCount || 1} onChange={(e) => updateSelected('seatCount', parseInt(e.target.value))} className="w-full p-1.5 border border-blue-200 rounded text-xs" placeholder="Kapasite" />
              )}
              <div className="flex gap-1">
                <button onClick={duplicateSelected} className="flex-1 text-xs bg-blue-600 text-white hover:bg-blue-700 p-1 rounded font-medium">📋 Çoğalt</button>
                <button onClick={deleteSelected} className="flex-1 text-xs bg-red-600 text-white hover:bg-red-700 p-1 rounded font-medium">🗑️ Sil</button>
              </div>
            </div>
          )}
        </div>

        {/* Kaydet Butonu */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button onClick={saveLayout} className="w-full bg-blue-600 text-white hover:bg-blue-700 px-4 py-2.5 rounded font-bold flex items-center justify-center gap-2 transition text-sm">
            <Save size={16} /> {hallId ? 'Güncelle' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
});

// useImperativeHandle - ref'e autoGenerateLayout expose et
HallDesignerCanvasInner.displayName = 'HallDesignerCanvas';

export default HallDesignerCanvasInner;
