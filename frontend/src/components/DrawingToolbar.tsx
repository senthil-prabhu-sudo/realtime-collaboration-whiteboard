import React, { useEffect, useRef } from 'react';
import {
  Pen,
  Eraser,
  Square,
  Circle,
  Type,
  Minus,
  ArrowRight,
  MousePointer,
  Undo2,
  Trash2,
} from 'lucide-react';

export type ToolType =
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'text'
  | 'line'
  | 'arrow'
  | 'select';

interface DrawingToolbarProps {
  currentTool: ToolType;
  currentColor: string;
  currentSize: number;
  onToolChange: (tool: ToolType) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
}

// Default sizes for different tools
const DEFAULT_TOOL_SIZES: Record<ToolType, number> = {
  pen: 3,
  eraser: 15, // 15px for eraser
  rectangle: 3,
  circle: 3,
  text: 4, // 16px text (4 * 4)
  line: 3,
  arrow: 3,
  select: 1, // Not used for select
};

const PRESET_COLORS = [
  '#000000', // Black
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White
];

export function DrawingToolbar(props: DrawingToolbarProps) {
  const {
    currentTool,
    currentColor,
    currentSize,
    onToolChange,
    onColorChange,
    onSizeChange,
    onUndo,
    onClear,
  } = props;

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const tools: { id: ToolType; label: string; icon: React.ReactNode; group: string }[] = [
    { id: 'select', label: 'Select', icon: <MousePointer className="w-4 h-4" />, group: 'basic' },
    { id: 'pen', label: 'Pen', icon: <Pen className="w-4 h-4" />, group: 'draw' },
    { id: 'eraser', label: 'Eraser', icon: <Eraser className="w-4 h-4" />, group: 'draw' },
    { id: 'line', label: 'Line', icon: <Minus className="w-4 h-4" />, group: 'shapes' },
    { id: 'arrow', label: 'Arrow', icon: <ArrowRight className="w-4 h-4" />, group: 'shapes' },
    { id: 'rectangle', label: 'Rectangle', icon: <Square className="w-4 h-4" />, group: 'shapes' },
    { id: 'circle', label: 'Circle', icon: <Circle className="w-4 h-4" />, group: 'shapes' },
    { id: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, group: 'text' },
  ];

  const onKeyDown = (e: React.KeyboardEvent) => {
    // Prevent keyboard shortcuts when typing in input fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      onUndo();
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      onClear();
    }
  };

  return (
    <div
      ref={ref}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg p-3 flex flex-wrap items-center gap-3 border border-gray-200 outline-none"
      aria-label="Drawing tools toolbar"
    >
      {/* Tools Section */}
      <div className="flex gap-1.5 flex-wrap">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              onToolChange(t.id);
              // Set default size for the selected tool
              if (DEFAULT_TOOL_SIZES[t.id] !== currentSize) {
                onSizeChange(DEFAULT_TOOL_SIZES[t.id]);
              }
            }}
            className={`p-2.5 rounded-lg transition-all duration-200 relative group ${
              currentTool === t.id
                ? 'bg-blue-600 text-white shadow-md scale-105'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
            title={t.label}
            aria-label={`Select ${t.label} tool`}
            aria-pressed={currentTool === t.id}
          >
            {t.icon}
            {/* Tooltip */}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {t.label}
            </span>
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-300" />

      {/* Color Palette - Only show for drawing tools */}
      {currentTool !== 'select' && currentTool !== 'eraser' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Color</span>
            <div className="flex gap-1.5 items-center">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => onColorChange(color)}
                  className={`w-7 h-7 rounded-lg transition-all duration-200 hover:scale-110 ${
                    currentColor.toUpperCase() === color.toUpperCase()
                      ? 'ring-2 ring-blue-500 ring-offset-2 scale-110'
                      : 'hover:ring-2 hover:ring-gray-300'
                  }`}
                  style={{ 
                    backgroundColor: color,
                    border: color === '#FFFFFF' ? '1px solid #e5e7eb' : 'none'
                  }}
                  title={color}
                  aria-label={`Select ${color} color`}
                />
              ))}
              {/* Custom Color Picker */}
              <label
                className="w-7 h-7 rounded-lg cursor-pointer transition-all duration-200 hover:scale-110 flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-500"
                title="Custom color"
              >
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-0 h-0 opacity-0 absolute"
                  aria-label="Custom stroke color"
                />
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: currentColor }}
                />
              </label>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-gray-300" />
        </>
      )}

      {/* Size Controls */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-500 font-medium">Size</span>
        <div className="flex items-center gap-2">
          {/* Size Preview */}
          <div className="w-10 h-10 flex items-center justify-center">
            <div
              className="rounded-full bg-blue-600"
              style={{
                width: Math.max(4, Math.min(currentSize, 24)),
                height: Math.max(4, Math.min(currentSize, 24)),
              }}
            />
          </div>
          {/* Slider */}
          <input
            type="range"
            min={1}
            max={50}
            value={currentSize}
            disabled={currentTool === 'select'}
            onChange={(e) => onSizeChange(Number(e.target.value))}
            className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Stroke size"
          />
          <span className="text-xs text-gray-600 font-medium min-w-[2.5rem] text-center">
            {currentSize}px
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-gray-300" />

      {/* Action Buttons */}
      <div className="flex gap-1.5">
        <button
          onClick={onUndo}
          className="p-2.5 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 relative group"
          title="Undo (Ctrl+Z)"
          aria-label="Undo last action"
        >
          <Undo2 className="w-5 h-5" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Undo (Ctrl+Z)
          </span>
        </button>

        <button
          onClick={onClear}
          className="p-2.5 rounded-lg text-gray-600 hover:text-red-600 hover:bg-red-50 transition-all duration-200 relative group"
          title="Clear Board"
          aria-label="Clear all strokes"
        >
          <Trash2 className="w-5 h-5" />
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Clear Board
          </span>
        </button>
      </div>
    </div>
  );
}
