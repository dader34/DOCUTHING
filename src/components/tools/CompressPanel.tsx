import { useState } from 'react';
import { Download, TrendingDown } from 'lucide-react';
import { compressPDF } from '../../utils/pdfUtils';
import { downloadFile, formatFileSize } from '../../utils/fileUtils';

interface CompressPanelProps {
  file: File;
}

export default function CompressPanel({ file }: CompressPanelProps) {
  const [compressedData, setCompressedData] = useState<Uint8Array | null>(null);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originalSize = file.size;
  const savings = compressedSize !== null
    ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
    : 0;

  const handleCompress = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await compressPDF(file);
      setCompressedData(result);
      setCompressedSize(result.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedData) return;
    downloadFile(compressedData, file.name.replace('.pdf', '_compressed.pdf'));
  };

  return (
    <div className="space-y-3">
      <div className="p-2 border-2 border-current">
        <p className="text-[10px] font-mono opacity-70">ORIGINAL SIZE</p>
        <p className="text-sm font-bold">{formatFileSize(originalSize)}</p>
      </div>

      {compressedSize !== null && (
        <>
          <div className="p-2 border-2 border-green-500 bg-green-500/10">
            <p className="text-[10px] font-mono text-green-600">COMPRESSED</p>
            <p className="text-sm font-bold">{formatFileSize(compressedSize)}</p>
          </div>

          <div className="p-2 bg-[#ffff00] border-2 border-current flex items-center gap-2">
            {savings > 0 ? (
              <>
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-bold">{savings}% REDUCED</span>
              </>
            ) : (
              <span className="text-xs font-bold">ALREADY OPTIMIZED</span>
            )}
          </div>
        </>
      )}

      {error && <p className="text-xs text-red-500 font-mono">{error}</p>}

      {!compressedData ? (
        <button
          onClick={handleCompress}
          disabled={isProcessing}
          className="w-full py-2 px-3 text-xs font-bold uppercase bg-black text-white border-2 border-current hover:bg-[#ffff00] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'COMPRESSING...' : 'COMPRESS PDF'}
        </button>
      ) : (
        <button
          onClick={handleDownload}
          className="w-full py-2 px-3 text-xs font-bold uppercase bg-black text-white border-2 border-current hover:bg-[#ffff00] hover:text-black transition-colors flex items-center justify-center gap-1"
        >
          <Download className="w-3.5 h-3.5" /> DOWNLOAD
        </button>
      )}
    </div>
  );
}
