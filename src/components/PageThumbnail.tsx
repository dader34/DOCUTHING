import { RotateCw, Trash2, GripVertical, Check } from 'lucide-react';

interface PageThumbnailProps {
  pageNumber: number;
  imageUrl: string;
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
  onRotate?: () => void;
}

export default function PageThumbnail({
  pageNumber,
  imageUrl,
  selected = false,
  onClick,
  onDelete,
  onRotate,
}: PageThumbnailProps) {
  return (
    <div
      onClick={onClick}
      className={`
        brutal-thumbnail relative group cursor-pointer
        ${selected ? 'selected' : ''}
      `}
    >
      {/* Drag Handle */}
      <div className="absolute top-2 left-2 z-10 p-1 bg-white border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-4 h-4 text-black" />
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-black flex items-center justify-center">
          <Check className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Action Buttons */}
      {(onRotate || onDelete) && !selected && (
        <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onRotate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRotate();
              }}
              className="p-1.5 bg-white border-2 border-black hover:bg-[#ffff00] transition-colors"
              title="Rotate"
            >
              <RotateCw className="w-4 h-4 text-black" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1.5 bg-white border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Image */}
      <div className="aspect-[3/4] overflow-hidden bg-gray-100">
        <img
          src={imageUrl}
          alt={`Page ${pageNumber}`}
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Page Number */}
      <div className="py-2 px-3 bg-black text-white border-t-3 border-black">
        <span className="text-sm font-bold font-mono">PAGE {pageNumber}</span>
      </div>
    </div>
  );
}
