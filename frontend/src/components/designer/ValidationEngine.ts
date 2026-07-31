import { DesignerElement, HallLayout } from '../../types/layout';

export interface ValidationIssue {
  elementId: string;
  type: 'error' | 'warning';
  message: string;
}

const PIXEL_PER_METER = 80;

export class ValidationEngine {
  
  static getBoundingBox(el: DesignerElement) {
    const radius = el.radius || 20;
    const width = el.width ?? (radius * 2);
    const height = el.height ?? (radius * 2);
    return {
      x: el.x,
      y: el.y,
      width,
      height,
      right: el.x + width,
      bottom: el.y + height,
    };
  }

  static intersect(b1: ReturnType<typeof ValidationEngine.getBoundingBox>, b2: ReturnType<typeof ValidationEngine.getBoundingBox>) {
    return !(
      b2.x > b1.right ||
      b2.right < b1.x ||
      b2.y > b1.bottom ||
      b2.bottom < b1.y
    );
  }

  static validate(layout: HallLayout): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const elements = layout.elements;

    for (let i = 0; i < elements.length; i++) {
      const el1 = elements[i];
      const box1 = this.getBoundingBox(el1);

      // Check boundary
      if (box1.x < 0 || box1.y < 0 || box1.right > layout.canvas.width || box1.bottom > layout.canvas.height) {
        issues.push({
          elementId: el1.id,
          type: 'warning',
          message: 'Öğe salon sınırları dışında.',
        });
      }

      for (let j = i + 1; j < elements.length; j++) {
        const el2 = elements[j];
        if (el1.id === el2.id) continue;
        
        const box2 = this.getBoundingBox(el2);
        
        if (this.intersect(box1, box2)) {
          if (el1.type === 'emergency_exit' || el2.type === 'emergency_exit') {
            issues.push({
              elementId: el1.id,
              type: 'error',
              message: 'Çıkış engeli: Acil çıkış önü kapanamaz.',
            });
            issues.push({
              elementId: el2.id,
              type: 'error',
              message: 'Çıkış engeli: Acil çıkış önü kapanamaz.',
            });
          } else {
            issues.push({
              elementId: el1.id,
              type: 'error',
              message: 'Çakışma: Öğeler üst üste biniyor.',
            });
            issues.push({
              elementId: el2.id,
              type: 'error',
              message: 'Çakışma: Öğeler üst üste biniyor.',
            });
          }
        }
      }
    }
    
    // Numaralandırma doğrulaması
    const labels = new Set<string>();
    for (const el of elements) {
      if (labels.has(el.label)) {
         issues.push({
           elementId: el.id,
           type: 'warning',
           message: `Aynı numara birden fazla öğede kullanılmış: ${el.label}`,
         });
      }
      labels.add(el.label);
    }

    return issues;
  }
}
