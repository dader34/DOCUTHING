import { useState } from 'react';
import { Download } from 'lucide-react';
import { splitPDF, extractPDFPages } from '../../utils/pdfUtils';
import { downloadFile } from '../../utils/fileUtils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface SplitPanelProps {
  file: File;
  thumbnails: string[];
}

type SplitMode = 'selected' | 'range' | 'extract-all';

export default function SplitPanel({ file, thumbnails }: SplitPanelProps) {
  const [mode, setMode] = useState<SplitMode>('selected');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState(thumbnails.length.toString());
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

  const handleSplit = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const baseName = file.name.replace('.pdf', '');

      if (mode === 'extract-all') {
        const zip = new JSZip();
        for (let i = 1; i <= thumbnails.length; i++) {
          const bytes = await extractPDFPages(file, [i]);
          zip.file(`${baseName}_page_${i}.pdf`, bytes);
        }
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${baseName}_split.zip`);
      } else if (mode === 'range') {
        const start = parseInt(rangeStart);
        const end = parseInt(rangeEnd);
        if (isNaN(start) || isNaN(end) || start < 1 || end > thumbnails.length || start > end) {
          throw new Error('Invalid page range');
        }
        const results = await splitPDF(file, [{ start, end }]);
        downloadFile(results[0], `${baseName}_pages_${start}-${end}.pdf`);
      } else {
        if (selected.size === 0) throw new Error('Select at least one page');
        const sorted = Array.from(selected).map(i => i + 1).sort((a, b) => a - b);
        if (sorted.length === 1) {
          const bytes = await extractPDFPages(file, sorted);
          downloadFile(bytes, `${baseName}_page_${sorted[0]}.pdf`);
        } else {
          const zip = new JSZip();
          for (const p of sorted) {
            const bytes = await extractPDFPages(file, [p]);
            zip.file(`${baseName}_page_${p}.pdf`, bytes);
          }
          const content = await zip.generateAsync({ type: 'blob' });
          saveAs(content, `${baseName}_selected_pages.zip`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {(['selected', 'range', 'extract-all'] as SplitMode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2 py-1 text-[10px] font-bold uppercase border-2 border-current transition-colors ${
              mode === m ? 'bg-purple-500 text-white' : 'hover:bg-gray-100'
            }`}
          >
            {m === 'extract-all' ? 'ALL' : m.toUpperCase()}
          </button>
        ))}
      </div>

      {mode === 'range' && (
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-mono">FROM</label>
          <input
            type="number"
            min={1}
            max={thumbnails.length}
            value={rangeStart}
            onChange={e => setRangeStart(e.target.value)}
            className="w-14 px-2 py-1 border-2 border-current text-xs font-bold focus:outline-none"
          />
          <label className="text-[10px] font-mono">TO</label>
          <input
            type="number"
            min={1}
            max={thumbnails.length}
            value={rangeEnd}
            onChange={e => setRangeEnd(e.target.value)}
            className="w-14 px-2 py-1 border-2 border-current text-xs font-bold focus:outline-none"
          />
        </div>
      )}

      {mode === 'selected' && (
        <>
          <div className="flex gap-1">
            <button
              onClick={() => setSelected(new Set(thumbnails.map((_, i) => i)))}
              className="text-[10px] font-bold uppercase text-purple-500 hover:underline"
            >
              ALL
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-[10px] font-bold uppercase opacity-70 hover:opacity-100"
            >
              CLEAR
            </button>
            <span className="text-[10px] font-mono opacity-70 ml-auto">{selected.size} SEL</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[60vh] overflow-y-auto">
            {thumbnails.map((thumb, i) => (
              <div
                key={i}
                onClick={() => toggle(i)}
                className={`relative cursor-pointer border-2 transition-colors ${
                  selected.has(i) ? 'border-purple-500' : 'border-current hover:border-purple-300'
                }`}
              >
                <div className="aspect-[3/4] overflow-hidden bg-gray-100">
                  <img src={thumb} alt={`P${i+1}`} className="w-full h-full object-contain" draggable={false} />
                </div>
                {selected.has(i) && (
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center">
                    ✓
                  </div>
                )}
                <div className="text-center text-[10px] font-bold py-0.5 border-t border-current bg-white">
                  P{i + 1}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {mode === 'extract-all' && (
        <p className="text-xs font-mono opacity-70">
          EACH PAGE WILL BE EXTRACTED AS A SEPARATE PDF IN A ZIP FILE
        </p>
      )}

      {error && <p className="text-xs text-red-500 font-mono">{error}</p>}

      <button
        onClick={handleSplit}
        disabled={isProcessing}
        className="w-full py-2 px-3 text-xs font-bold uppercase bg-black text-white border-2 border-current hover:bg-[#ffff00] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
      >
        <Download className="w-3.5 h-3.5" />
        {isProcessing ? 'SPLITTING...' : 'SPLIT & DOWNLOAD'}
      </button>
    </div>
  );
}
