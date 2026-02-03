import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { compressPDF } from '../utils/pdfUtils';
import { downloadFile, formatFileSize } from '../utils/fileUtils';
import {
  FileDown,
  Download,
  FileText,
  X,
  ArrowLeft,
  TrendingDown,
} from 'lucide-react';

export default function CompressPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [compressedData, setCompressedData] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback((files: File[]) => {
    if (files.length === 0) return;

    const selectedFile = files[0];
    setFile(selectedFile);
    setOriginalSize(selectedFile.size);
    setCompressedSize(null);
    setCompressedData(null);
    setError(null);
  }, []);

  const handleCompress = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const compressed = await compressPDF(file);
      setCompressedData(compressed);
      setCompressedSize(compressed.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to compress PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!compressedData || !file) return;
    const newName = file.name.replace('.pdf', '_compressed.pdf');
    downloadFile(compressedData, newName);
  };

  const resetFile = () => {
    setFile(null);
    setOriginalSize(0);
    setCompressedSize(null);
    setCompressedData(null);
    setError(null);
  };

  const savingsPercentage =
    compressedSize !== null
      ? Math.round(((originalSize - compressedSize) / originalSize) * 100)
      : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-bold uppercase tracking-wider text-sm mb-8 no-underline hover:opacity-70"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO HOME
          </Link>

          {/* Page Header */}
          <div className="mb-12">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-20 h-20 bg-green-500 border-4 border-current flex items-center justify-center">
                <FileDown className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  COMPRESS PDF
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  REDUCE FILE SIZE WHILE MAINTAINING QUALITY
                </p>
              </div>
            </div>
          </div>

          {!file ? (
            <FileDropzone
              accept={{ 'application/pdf': ['.pdf'] }}
              multiple={false}
              maxFiles={1}
              onFilesSelected={handleFileSelected}
            />
          ) : (
            <div className="space-y-6">
              {/* File Info Card */}
              <Card variant="outlined">
                <CardBody>
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-500 border-2 border-current flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">{file.name}</p>
                        <p className="font-mono opacity-70">
                          ORIGINAL SIZE: {formatFileSize(originalSize)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetFile}
                      className="p-2 border-2 border-current hover:bg-current hover:text-white transition-colors"
                      title="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Compression Results */}
                  {compressedSize !== null && (
                    <div className="space-y-6">
                      {/* Size Comparison */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 border-4 border-current">
                          <p className="font-mono text-sm opacity-70 mb-1">ORIGINAL</p>
                          <p className="font-bold text-xl">
                            {formatFileSize(originalSize)}
                          </p>
                        </div>
                        <div className="p-4 border-4 border-green-500 bg-green-500/10">
                          <p className="font-mono text-sm text-green-600 mb-1">COMPRESSED</p>
                          <p className="font-bold text-xl">
                            {formatFileSize(compressedSize)}
                          </p>
                        </div>
                      </div>

                      {/* Savings Display */}
                      <div className="flex items-center justify-center gap-4 p-6 border-4 border-current bg-[#ffff00]">
                        {savingsPercentage > 0 ? (
                          <>
                            <TrendingDown className="w-10 h-10 text-black" />
                            <div className="text-center">
                              <p className="text-4xl font-bold text-black">
                                {savingsPercentage}%
                              </p>
                              <p className="font-mono text-black uppercase">SIZE REDUCTION</p>
                            </div>
                          </>
                        ) : (
                          <div className="text-center">
                            <p className="text-lg font-bold text-black uppercase">
                              ALREADY OPTIMIZED
                            </p>
                            <p className="font-mono text-black">
                              THIS PDF IS ALREADY WELL COMPRESSED
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mt-6">
                      <Alert status="error">{error}</Alert>
                    </div>
                  )}
                </CardBody>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-center gap-4">
                {isProcessing ? (
                  <LoadingSpinner message="COMPRESSING PDF..." />
                ) : compressedData ? (
                  <>
                    <Button onClick={handleDownload} variant="primary">
                      <Download className="w-5 h-5 mr-2" />
                      DOWNLOAD COMPRESSED PDF
                    </Button>
                    <Button onClick={resetFile} variant="outline">
                      COMPRESS ANOTHER
                    </Button>
                  </>
                ) : (
                  <Button onClick={handleCompress} variant="primary">
                    <FileDown className="w-5 h-5 mr-2" />
                    COMPRESS PDF
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Info Card */}
          {!file && (
            <Card variant="outlined" className="mt-12">
              <CardBody>
                <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">
                  ABOUT PDF COMPRESSION:
                </h3>
                <ul className="space-y-4 font-mono">
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500 text-white flex items-center justify-center font-bold">
                      ✓
                    </span>
                    <span>REDUCES FILE SIZE BY OPTIMIZING INTERNAL STRUCTURES</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500 text-white flex items-center justify-center font-bold">
                      ✓
                    </span>
                    <span>ALL PROCESSING HAPPENS LOCALLY — YOUR FILES STAY PRIVATE</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-green-500 text-white flex items-center justify-center font-bold">
                      ✓
                    </span>
                    <span>PERFECT FOR EMAIL ATTACHMENTS AND WEB UPLOADS</span>
                  </li>
                </ul>
              </CardBody>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
