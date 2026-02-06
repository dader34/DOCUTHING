import { useState } from 'react';
import { Trash2, Download } from 'lucide-react';
import { deletePDFPages } from '../../utils/pdfUtils';
import { downloadFile } from '../../utils/fileUtils';

interface DeletePagesPanelProps {
  file: File;
  thumbnails: string[];
  onFileUpdate: (newFile: File) => void;
}

export default function DeletePagesPanel({ file, thumbnails, onFileUpdate }: DeletePagesPanelProps) {
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

  const handleApply = async () => {
    if (selected.size === 0 || selected.size >= thumbnails.length) {
      setError(selected.size >= thumbnails.length ? 'Cannot delete all pages' : 'Select pages first');
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      const pages = Array.from(selected).map(i => i + 1);
      const result = await deletePDFPages(file, pages);
      const newFile = new File([result as BlobPart], file.name.replace('.pdf', '_modified.pdf'), { type: 'application/pdf' });
      onFileUpdate(newFile);
      setSelected(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (selected.size === 0 || selected.size >= thumbnails.length) return;
    setIsProcessing(true);
    setError(null);
    try {
      const pages = Array.from(selected).map(i => i + 1);
      const result = await deletePDFPages(file, pages);
      downloadFile(result, file.name.replace('.pdf', '_modified.pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pages');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-mono opacity-70">
        CLICK PAGES TO MARK FOR DELETION ({selected.size} SELECTED)
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto">
        {thumbnails.map((thumb, i) => (
          <div
            key={i}
            onClick={() => toggle(i)}
            className={`relative cursor-pointer border-2 transition-colors ${
              selected.has(i) ? 'border-red-500' : 'border-current hover:border-red-300'
            }`}
          >
            <div className="aspect-[3/4] overflow-hidden bg-gray-100">
              <img src={thumb} alt={`Page ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
            </div>
            {selected.has(i) && (
              <div className="absolute inset-0 bg-red-500/30 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
            )}
            <div className="text-center text-[10px] font-bold py-0.5 border-t border-current bg-white">
              P{i + 1}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500 font-mono">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleApply}
          disabled={selected.size === 0 || isProcessing}
          className="flex-1 py-2 px-3 text-xs font-bold uppercase bg-red-500 text-white border-2 border-red-500 hover:bg-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'DELETING...' : `DELETE ${selected.size} PAGE(S)`}
        </button>
        <button
          onClick={handleDownload}
          disabled={selected.size === 0 || isProcessing}
          className="p-2 border-2 border-current hover:bg-black hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Download with pages deleted"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
