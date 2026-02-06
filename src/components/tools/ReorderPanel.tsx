import { useState } from 'react';
import { GripVertical, Download } from 'lucide-react';
import { reorderPDFPages } from '../../utils/pdfUtils';
import { downloadFile } from '../../utils/fileUtils';

interface ReorderPanelProps {
  file: File;
  thumbnails: string[];
  onFileUpdate: (newFile: File) => void;
}

interface PageItem {
  originalIndex: number;
  thumbnail: string;
}

export default function ReorderPanel({ file, thumbnails, onFileUpdate }: ReorderPanelProps) {
  const [pages, setPages] = useState<PageItem[]>(() =>
    thumbnails.map((thumb, i) => ({ originalIndex: i, thumbnail: thumb }))
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = pages.some((p, i) => p.originalIndex !== i);

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const next = [...pages];
    const dragged = next[draggedIndex];
    next.splice(draggedIndex, 1);
    next.splice(index, 0, dragged);
    setPages(next);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => setDraggedIndex(null);

  const reverse = () => setPages(prev => [...prev].reverse());
  const reset = () => setPages(thumbnails.map((thumb, i) => ({ originalIndex: i, thumbnail: thumb })));

  const handleApply = async () => {
    if (!hasChanges) return;
    setIsProcessing(true);
    setError(null);
    try {
      const newOrder = pages.map(p => p.originalIndex + 1);
      const result = await reorderPDFPages(file, newOrder);
      const newFile = new File([result as BlobPart], file.name.replace('.pdf', '_reordered.pdf'), { type: 'application/pdf' });
      onFileUpdate(newFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!hasChanges) return;
    setIsProcessing(true);
    setError(null);
    try {
      const newOrder = pages.map(p => p.originalIndex + 1);
      const result = await reorderPDFPages(file, newOrder);
      downloadFile(result, file.name.replace('.pdf', '_reordered.pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <button
          onClick={reverse}
          className="px-2 py-1 text-xs font-bold uppercase border-2 border-current hover:bg-black hover:text-white transition-colors"
        >
          REVERSE
        </button>
        <button
          onClick={reset}
          className="px-2 py-1 text-xs font-bold uppercase opacity-70 hover:opacity-100"
        >
          RESET
        </button>
      </div>

      <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
        {pages.map((page, index) => (
          <div
            key={page.originalIndex}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 p-1.5 border-2 border-current cursor-move transition-all ${
              draggedIndex === index ? 'opacity-50 scale-95' : ''
            } ${page.originalIndex !== index ? 'border-cyan-500' : ''}`}
          >
            <GripVertical className="w-3 h-3 flex-shrink-0 opacity-50" />
            <div className="w-8 h-10 flex-shrink-0 bg-gray-100 overflow-hidden">
              <img src={page.thumbnail} alt="" className="w-full h-full object-contain" draggable={false} />
            </div>
            <span className="text-xs font-mono flex-1">
              P{page.originalIndex + 1}
            </span>
            <span className="text-[10px] font-bold opacity-50">
              {index + 1}
            </span>
            {page.originalIndex !== index && (
              <span className="w-3 h-3 bg-cyan-500 text-white text-[8px] font-bold flex items-center justify-center">!</span>
            )}
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500 font-mono">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={!hasChanges || isProcessing}
          className="flex-1 py-2 px-3 text-xs font-bold uppercase bg-black text-white border-2 border-current hover:bg-[#ffff00] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'APPLYING...' : 'APPLY ORDER'}
        </button>
        <button
          onClick={handleDownload}
          disabled={!hasChanges || isProcessing}
          className="p-2 border-2 border-current hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Download reordered PDF"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
