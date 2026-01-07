import React, { useEffect, useRef, useState } from 'react';
import { ToolType } from './DrawingToolbar';

export interface Stroke {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  size: number;
  tool: ToolType;
  userId: string;
  senderId: string;
  createdAt: number;
  text?: string;
}

export interface Cursor {
  userId: string;
  x: number;
  y: number;
  color: string;
}

interface CanvasProps {
  strokes: Stroke[];
  cursors?: Cursor[];
  currentTool: ToolType;
  currentColor: string;
  currentSize: number;
  canDraw: boolean;
  currentUserId: string;
  onStroke: (stroke: Stroke) => void;
  onUpdateStroke?: (stroke: Stroke) => void;
  onDeleteStroke?: (strokeId: string) => void;
}

export function Canvas({
  strokes,
  cursors = [],
  currentTool,
  currentColor,
  currentSize,
  canDraw,
  currentUserId,
  onStroke,
  onUpdateStroke,
  onDeleteStroke,
}: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<Stroke | null>(null);
  const [textInput, setTextInput] =
    useState<{ x: number; y: number; value: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveStartPoint, setMoveStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [originalStroke, setOriginalStroke] = useState<Stroke | null>(null);
  const [movingStroke, setMovingStroke] = useState<Stroke | null>(null);

  const isDrawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  /* ---------------------------------------------
     Resize
  --------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw(ctx);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    return () => ro.disconnect();
  }, [strokes, draft]);

  /* ---------------------------------------------
     Focus text input when it appears
  --------------------------------------------- */
  useEffect(() => {
    if (textInput && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput]);

  /* ---------------------------------------------
     Clear text input when tool changes
  --------------------------------------------- */
  useEffect(() => {
    if (currentTool !== 'text' && textInput) {
      setTextInput(null);
    }
  }, [currentTool, textInput]);

  /* ---------------------------------------------
     Redraw
  --------------------------------------------- */
  const redraw = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw all strokes except the one being moved
    strokes.forEach((s) => {
      if (movingStroke && s.id === movingStroke.id) {
        return; // Skip - will draw movingStroke instead
      }
      drawStroke(ctx, s, s.id === selectedId);
    });

    // Draw the stroke being moved (with updated position)
    if (movingStroke) drawStroke(ctx, movingStroke, true);
    
    // Draw draft stroke (for new strokes being drawn)
    if (draft) drawStroke(ctx, draft);
  };

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) redraw(ctx);
  }, [strokes, draft, movingStroke]);

  /* ---------------------------------------------
     Stroke Renderer (ALL TOOLS + PREVIEW)
  --------------------------------------------- */
  const drawStroke = (ctx: CanvasRenderingContext2D, s: Stroke, isSelected = false) => {
    const pts = s.points;
    if (!pts.length) return;

    ctx.lineWidth = s.size;
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;

    if (s.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    if (s.tool === 'pen' || s.tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    else if (s.tool === 'line' && pts.length >= 2) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      ctx.stroke();
    }

    else if (s.tool === 'rectangle' && pts.length >= 2) {
      const a = pts[0];
      const b = pts[1];
      ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }

    else if (s.tool === 'circle' && pts.length >= 2) {
      const a = pts[0];
      const b = pts[1];
      const r = Math.hypot(b.x - a.x, b.y - a.y);
      ctx.beginPath();
      ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    else if (s.tool === 'arrow' && pts.length >= 2) {
      const a = pts[0];
      const b = pts[1];
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      const head = s.size * 3;

      // Draw the line
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Draw the arrow head
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(
        b.x - head * Math.cos(angle - Math.PI / 6),
        b.y - head * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        b.x - head * Math.cos(angle + Math.PI / 6),
        b.y - head * Math.sin(angle + Math.PI / 6)
      );
      ctx.lineTo(b.x, b.y);
      ctx.fill();
    }

    else if (s.tool === 'text' && s.text) {
      ctx.font = `${Math.max(s.size * 4, 12)}px Arial`;
      ctx.fillStyle = s.color;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(s.text, pts[0].x, pts[0].y);
    }

    ctx.globalCompositeOperation = 'source-over';

    // Draw selection indicator if selected
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.globalCompositeOperation = 'source-over';

      if (s.tool === 'pen' || s.tool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }

      else if (s.tool === 'line' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();
      }

      else if (s.tool === 'rectangle' && pts.length >= 2) {
        const a = pts[0];
        const b = pts[1];
        ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      }

      else if (s.tool === 'circle' && pts.length >= 2) {
        const a = pts[0];
        const b = pts[1];
        const r = Math.hypot(b.x - a.x, b.y - a.y);
        ctx.beginPath();
        ctx.arc(a.x, a.y, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      else if (s.tool === 'arrow' && pts.length >= 2) {
        const a = pts[0];
        const b = pts[1];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      else if (s.tool === 'text' && s.text) {
        const metrics = ctx.measureText(s.text);
        const textHeight = s.size * 2;
        ctx.strokeRect(pts[0].x - 2, pts[0].y - 2, metrics.width + 4, textHeight + 4);
      }

      ctx.restore();
    }
  };

  /* ---------------------------------------------
     Helpers
  --------------------------------------------- */
  const point = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const hitTest = (x: number, y: number): Stroke | null => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      
      // For shapes, check if point is inside the shape
      if (s.tool === 'rectangle' && s.points.length >= 2) {
        const [a, b] = s.points;
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return s;
        }
      }
      
      else if (s.tool === 'circle' && s.points.length >= 2) {
        const [a, b] = s.points;
        const r = Math.hypot(b.x - a.x, b.y - a.y);
        const dist = Math.hypot(x - a.x, y - a.y);
        
        if (dist <= r + 5) { // 5px tolerance
          return s;
        }
      }
      
      else if (s.tool === 'line' && s.points.length >= 2) {
        const [a, b] = s.points;
        const dist = pointToLineDistance(x, y, a.x, a.y, b.x, b.y);
        
        if (dist <= 10) { // 10px tolerance for lines
          return s;
        }
      }
      
      else if (s.tool === 'arrow' && s.points.length >= 2) {
        const [a, b] = s.points;
        const dist = pointToLineDistance(x, y, a.x, a.y, b.x, b.y);
        
        if (dist <= 10) { // 10px tolerance for arrows
          return s;
        }
      }
      
      else if (s.tool === 'text') {
        // Simple hit test for text - check if near the text position
        const p = s.points[0];
        if (Math.abs(x - p.x) < 100 && Math.abs(y - p.y) < 50) {
          return s;
        }
      }
      
      // For pen and eraser, use the original point-based hit test
      else if (
        s.points.some(
          (p) => Math.abs(p.x - x) < 8 && Math.abs(p.y - y) < 8
        )
      ) {
        return s;
      }
    }
    return null;
  };

  // Helper function to calculate distance from point to line segment
  const pointToLineDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Detect which strokes are intersected by the eraser path
  const detectErasedStrokes = (eraserStroke: Stroke): string[] => {
    const erasedIds: string[] = [];
    const eraserSize = eraserStroke.size;

    strokes.forEach((stroke) => {
      // Don't erase eraser strokes themselves or the current user's own strokes during drawing
      if (stroke.tool === 'eraser' || stroke.userId === currentUserId) return;

      let isErased = false;

      // Check each point in the eraser path against the stroke
      for (const eraserPoint of eraserStroke.points) {
        if (stroke.tool === 'pen') {
          // For pen strokes, check if any point is within eraser radius
          for (const strokePoint of stroke.points) {
            const distance = Math.hypot(
              eraserPoint.x - strokePoint.x,
              eraserPoint.y - strokePoint.y
            );
            if (distance <= eraserSize / 2) {
              isErased = true;
              break;
            }
          }
        } else if (stroke.tool === 'line' && stroke.points.length >= 2) {
          // For lines, check distance to line segment
          const [p1, p2] = stroke.points;
          const distance = pointToLineDistance(
            eraserPoint.x, eraserPoint.y,
            p1.x, p1.y, p2.x, p2.y
          );
          if (distance <= eraserSize / 2) {
            isErased = true;
            break;
          }
        } else if (stroke.tool === 'rectangle' && stroke.points.length >= 2) {
          // For rectangles, check if eraser intersects the rectangle
          const [p1, p2] = stroke.points;
          const minX = Math.min(p1.x, p2.x);
          const maxX = Math.max(p1.x, p2.x);
          const minY = Math.min(p1.y, p2.y);
          const maxY = Math.max(p1.y, p2.y);

          // Check if eraser point is inside expanded rectangle (accounting for stroke width)
          const strokeWidth = stroke.size / 2;
          if (
            eraserPoint.x >= minX - strokeWidth - eraserSize / 2 &&
            eraserPoint.x <= maxX + strokeWidth + eraserSize / 2 &&
            eraserPoint.y >= minY - strokeWidth - eraserSize / 2 &&
            eraserPoint.y <= maxY + strokeWidth + eraserSize / 2
          ) {
            isErased = true;
            break;
          }
        } else if (stroke.tool === 'circle' && stroke.points.length >= 2) {
          // For circles, check distance to center
          const [center, edge] = stroke.points;
          const radius = Math.hypot(edge.x - center.x, edge.y - center.y);
          const distance = Math.hypot(
            eraserPoint.x - center.x,
            eraserPoint.y - center.y
          );
          if (distance <= radius + stroke.size / 2 + eraserSize / 2) {
            isErased = true;
            break;
          }
        } else if (stroke.tool === 'arrow' && stroke.points.length >= 2) {
          // For arrows, check distance to the line
          const [p1, p2] = stroke.points;
          const distance = pointToLineDistance(
            eraserPoint.x, eraserPoint.y,
            p1.x, p1.y, p2.x, p2.y
          );
          if (distance <= eraserSize / 2 + stroke.size / 2) {
            isErased = true;
            break;
          }
        } else if (stroke.tool === 'text' && stroke.points.length > 0) {
          // For text, check if eraser is near the text position
          const textPos = stroke.points[0];
          const distance = Math.hypot(
            eraserPoint.x - textPos.x,
            eraserPoint.y - textPos.y
          );
          // Use a larger radius for text to make it easier to erase
          if (distance <= Math.max(eraserSize / 2, 50)) {
            isErased = true;
            break;
          }
        }

        if (isErased) break;
      }

      if (isErased && !erasedIds.includes(stroke.id)) {
        erasedIds.push(stroke.id);
      }
    });

    return erasedIds;
  };

  /* ---------------------------------------------
     Pointer Events
  --------------------------------------------- */
  const onPointerDown = (e: React.PointerEvent) => {
    const p = point(e);

    // Clear any active text input when using other tools
    if (currentTool !== 'text' && textInput) {
      setTextInput(null);
    }

    // Select tool should work even when canDraw is false (for viewing/selecting)
    if (currentTool === 'select') {
      const hit = hitTest(p.x, p.y);
      if (hit) {
        setSelectedId(hit.id);
        // Only allow moving if canDraw is true
        if (canDraw) {
          setIsMoving(true);
          setMoveStartPoint(p);
          setOriginalStroke(hit); // Store the original stroke for movement calculation
        }
      } else {
        setSelectedId(null);
        setIsMoving(false);
        setOriginalStroke(null);
      }
      return;
    }

    // All drawing tools require canDraw permission
    if (!canDraw) return;

    // Text tool requires drawing permission like other tools
    if (currentTool === 'text') {
      // Use screen coordinates for better input positioning
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        setTextInput({ x: screenX, y: screenY, value: '' });
      }
      return;
    }

    isDrawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);

    setDraft({
      id: crypto.randomUUID(),
      points:
        currentTool === 'pen' || currentTool === 'eraser'
          ? [p]
          : [p, p], // ✅ REQUIRED for shape preview
      color: currentColor,
      size: currentSize,
      tool: currentTool,
      userId: currentUserId,
      senderId: currentUserId,
      createdAt: Date.now(),
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = point(e);

    if (currentTool === 'select' && selectedId && isMoving && moveStartPoint && originalStroke) {
      // Calculate total displacement from the initial click position
      const dx = p.x - moveStartPoint.x;
      const dy = p.y - moveStartPoint.y;

      // Apply the displacement to the original stroke's points
      const movedStroke: Stroke = {
        ...originalStroke,
        points: originalStroke.points.map((pt) => ({
          x: pt.x + dx,
          y: pt.y + dy,
        })),
      };

      // Store the moving stroke for local rendering only
      setMovingStroke(movedStroke);
      return;
    }

    if (!isDrawing.current || !draft) return;

    setDraft((s) =>
      s
        ? {
            ...s,
            points:
              s.tool === 'pen' || s.tool === 'eraser'
                ? [...s.points, p]
                : [s.points[0], p],
          }
        : s
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (currentTool === 'select' && isMoving && movingStroke && onUpdateStroke) {
      // Send final position to backend only once
      onUpdateStroke(movingStroke);
      setIsMoving(false);
      setMoveStartPoint(null);
      setOriginalStroke(null);
      setMovingStroke(null);
      return;
    }

    if (!isDrawing.current || !draft) return;

    canvasRef.current?.releasePointerCapture(e.pointerId);
    isDrawing.current = false;

    // Special handling for eraser tool - detect and delete intersected strokes
    if (draft.tool === 'eraser' && onDeleteStroke) {
      const erasedStrokeIds = detectErasedStrokes(draft);
      erasedStrokeIds.forEach(strokeId => {
        console.log('[Canvas] Deleting erased stroke:', strokeId);
        onDeleteStroke(strokeId);
      });
    }

    onStroke(draft);
    setDraft(null);
    lastPoint.current = null;
  };

  /* ---------------------------------------------
     Text Commit (FIXED)
  --------------------------------------------- */
  const commitText = (force = false) => {
    if (!textInput) return;

    if (force || textInput.value.trim()) {
      if (textInput.value.trim()) {
        onStroke({
          id: crypto.randomUUID(),
          points: [{ x: textInput.x, y: textInput.y }], // Direct position without offset
          color: currentColor,
          size: currentSize,
          tool: 'text',
          userId: currentUserId,
          senderId: currentUserId,
          createdAt: Date.now(),
          text: textInput.value,
        });
      }
      setTextInput(null);
    }
  };

  /* ---------------------------------------------
     UI
  --------------------------------------------- */
  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Drawing Disabled Indicator - Only show for logged-in users who can't draw */}
      {!canDraw && currentUserId && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-xs">👁️</span>
              </div>
              <div>
                <p className="text-xs font-medium text-yellow-800">View Only</p>
                <p className="text-xs text-yellow-600">Ask owner to enable drawing</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className={`w-full h-full bg-white touch-none ${textInput ? 'pointer-events-none' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      />

      {textInput && (
        <input
          ref={textInputRef}
          className="absolute border px-2 py-1 text-sm bg-white shadow z-50"
          style={{ left: textInput.x + 2, top: textInput.y - 2 }}
          value={textInput.value}
          onChange={(e) =>
            setTextInput({ ...textInput, value: e.target.value })
          }
          onBlur={() => commitText(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitText(true);
            } else if (e.key === 'Escape') {
              setTextInput(null);
            }
          }}
        />
      )}

      {cursors.map((c) => (
        <div
          key={c.userId}
          className="absolute pointer-events-none"
          style={{ left: c.x, top: c.y }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: c.color }}
          />
        </div>
      ))}
    </div>
  );
}
