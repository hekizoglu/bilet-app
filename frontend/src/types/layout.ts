export type ElementType = "round_table" | "rect_table" | "bistro" | "chair" | "stage" | "dance_floor" | "emergency_exit" | "entrance";
export type NumberingType = "table_only" | "table_and_seats" | "seats_only" | "none";

export interface DesignerElement {
  id: string;
  type: ElementType;
  label: string;
  
  // Logical / Pixel Coordinates
  x: number;
  y: number;
  width?: number; 
  height?: number; 
  radius?: number; 
  
  // Real World Coordinates (Meters)
  xM?: number;
  yM?: number;
  widthM?: number;
  heightM?: number;
  radiusM?: number;

  rotation?: number; 
  seatCount?: number; 
  numberingType?: NumberingType;
  
  locked?: boolean;
  hidden?: boolean;
  layerId?: string;
  zIndex?: number;
  notes?: string;
}

export interface HallLayout {
  canvas: { width: number; height: number };
  elements: DesignerElement[];
}
