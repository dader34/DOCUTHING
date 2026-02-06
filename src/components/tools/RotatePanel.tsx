import { useState } from 'react';
import { RotateCw, RotateCcw, Download } from 'lucide-react';
import { rotatePDFPages } from '../../utils/pdfUtils';
import { downloadFile } from '../../utils/fileUtils';

interface RotatePanelProps {
  file: File;
  thumbnails: string[];
  onFileUpdate: (newFile: File) => void;
}

export default function RotatePanel({ file, thumbnails, onFileUpdate }: RotatePanelProps) {
  const [rotations, setRotations] = useState<number[]>(() => thumbnails.map(() => 0));
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rotatePage = (index: number, degrees: number) => {
    setRotations(prev => prev.map((r, i) => i === index ? (r + degrees + 360) % 360 : r));
  };

  const rotateAll = (degrees: number) => {
    setRotations(prev => prev.map(r => (r + degrees + 360) % 360));
  };

  const resetRotations = () => {
    setRotations(thumbnails.map(() => 0));
  };

  const hasChanges = rotations.some(r => r !== 0);

  const handleApply = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const rotationMap = new Map<number, number>();
      rotations.forEach((deg, i) => {
        if (deg !== 0) rotationMap.set(i + 1, deg);
      });
      if (rotationMap.size === 0) return;

      const result = await rotatePDFPages(file, rotationMap);
      const newFile = new File([result as BlobPart], file.name.replace('.pdf', '_rotated.pdf'), { type: 'application/pdf' });
      onFileUpdate(newFile);
      setRotations(thumbnails.map(() => 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const rotationMap = new Map<number, number>();
      rotations.forEach((deg, i) => {
        if (deg !== 0) rotationMap.set(i + 1, deg);
      });
      if (rotationMap.size === 0) return;

      const result = await rotatePDFPages(file, rotationMap);
      downloadFile(result, file.name.replace('.pdf', '_rotated.pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={() => rotateAll(90)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase border-2 border-current hover:bg-black hover:text-white transition-colors"
        >
          <RotateCw className="w-3 h-3" /> ALL +90
        </button>
        <button
          onClick={() => rotateAll(-90)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-bold uppercase border-2 border-current hover:bg-black hover:text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> ALL -90
        </button>
        {hasChanges && (
          <button
            onClick={resetRotations}
            className="px-2 py-1 text-xs font-bold uppercase opacity-70 hover:opacity-100"
          >
            RESET
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto">
        {thumbnails.map((thumb, i) => (
          <div key={i} className="relative group border-2 border-current">
            <div className="aspect-[3/4] overflow-hidden bg-gray-100 flex items-center justify-center">
              <img
                src={thumb}
                alt={`Page ${i + 1}`}
                className="max-w-full max-h-full object-contain transition-transform"
                style={{ transform: `rotate(${rotations[i] || 0}deg)` }}
                draggable={false}
              />
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
              <button
                onClick={() => rotatePage(i, -90)}
                className="p-1 bg-white border border-current hover:bg-[#ffff00] transition-colors"
              >
                <RotateCcw className="w-3 h-3 text-black" />
              </button>
              <button
                onClick={() => rotatePage(i, 90)}
                className="p-1 bg-white border border-current hover:bg-[#ffff00] transition-colors"
              >
                <RotateCw className="w-3 h-3 text-black" />
              </button>
            </div>
            <div className="text-center text-[10px] font-bold py-0.5 border-t border-current bg-white flex items-center justify-between px-1">
              <span>P{i + 1}</span>
              {rotations[i] !== 0 && (
                <span className="text-[9px] px-1 bg-orange-500 text-white">{rotations[i]}°</span>
              )}
            </div>
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
          {isProcessing ? 'APPLYING...' : 'APPLY'}
        </button>
        <button
          onClick={handleDownload}
          disabled={!hasChanges || isProcessing}
          className="p-2 border-2 border-current hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Download rotated PDF"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
