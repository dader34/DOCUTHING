import { useState } from 'react';
import { Download } from 'lucide-react';
import { extractPDFPages } from '../../utils/pdfUtils';
import { downloadFile } from '../../utils/fileUtils';

interface ExtractPanelProps {
  file: File;
  thumbnails: string[];
}

export default function ExtractPanel({ file, thumbnails }: ExtractPanelProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (index: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => {
    setSelected(new Set(thumbnails.map((_, i) => i)));
  };

  const clearSelection = () => setSelected(new Set());

  const handleExtract = async () => {
    if (selected.size === 0) return;
    setIsProcessing(true);
    setError(null);
    try {
      const pages = Array.from(selected).map(i => i + 1).sort((a, b) => a - b);
      const result = await extractPDFPages(file, pages);
      downloadFile(result, file.name.replace('.pdf', '_extracted.pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1">
        <button
          onClick={selectAll}
          className="px-2 py-1 text-xs font-bold uppercase border-2 border-current hover:bg-black hover:text-white transition-colors"
        >
          ALL
        </button>
        <button
          onClick={clearSelection}
          className="px-2 py-1 text-xs font-bold uppercase opacity-70 hover:opacity-100"
        >
          CLEAR
        </button>
        <span className="text-xs font-mono opacity-70 flex items-center ml-auto">
          {selected.size} SELECTED
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto">
        {thumbnails.map((thumb, i) => (
          <div
            key={i}
            onClick={() => toggle(i)}
            className={`relative cursor-pointer border-2 transition-colors ${
              selected.has(i) ? 'border-blue-500' : 'border-current hover:border-blue-300'
            }`}
          >
            <div className="aspect-[3/4] overflow-hidden bg-gray-100">
              <img src={thumb} alt={`Page ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
            </div>
            {selected.has(i) && (
              <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
                ✓
              </div>
            )}
            <div className="text-center text-[10px] font-bold py-0.5 border-t border-current bg-white">
              P{i + 1}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500 font-mono">{error}</p>}

      <button
        onClick={handleExtract}
        disabled={selected.size === 0 || isProcessing}
        className="w-full py-2 px-3 text-xs font-bold uppercase bg-black text-white border-2 border-current hover:bg-[#ffff00] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
      >
        <Download className="w-3.5 h-3.5" />
        {isProcessing ? 'EXTRACTING...' : `EXTRACT ${selected.size} PAGE(S)`}
      </button>
    </div>
  );
}
