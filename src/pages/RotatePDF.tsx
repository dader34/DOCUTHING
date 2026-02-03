import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { rotatePDFPages } from '../utils/pdfUtils';
import { pdfToImages } from '../utils/imageUtils';
import { downloadFile } from '../utils/fileUtils';
import {
  RotateCw,
  RotateCcw,
  Download,
  FileText,
  X,
  ArrowLeft,
} from 'lucide-react';

interface PageRotation {
  rotation: number;
  thumbnail: string;
}

export default function RotatePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageRotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const selectedFile = files[0];
    setFile(selectedFile);
    setError(null);
    setIsLoading(true);

    try {
      const thumbnails = await pdfToImages(selectedFile);

      setPages(
        thumbnails.map((thumbnail) => ({
          rotation: 0,
          thumbnail,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const rotatePage = (index: number, degrees: number) => {
    setPages((prev) =>
      prev.map((page, i) =>
        i === index
          ? { ...page, rotation: (page.rotation + degrees + 360) % 360 }
          : page
      )
    );
  };

  const rotateAllPages = (degrees: number) => {
    setPages((prev) =>
      prev.map((page) => ({
        ...page,
        rotation: (page.rotation + degrees + 360) % 360,
      }))
    );
  };

  const resetRotations = () => {
    setPages((prev) => prev.map((page) => ({ ...page, rotation: 0 })));
  };

  const handleSave = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Create a map of page numbers to rotation degrees
      const rotations = new Map<number, number>();
      pages.forEach((page, index) => {
        if (page.rotation !== 0) {
          rotations.set(index + 1, page.rotation);
        }
      });

      if (rotations.size === 0) {
        setError('No pages have been rotated');
        setIsProcessing(false);
        return;
      }

      const rotatedPdf = await rotatePDFPages(file, rotations);
      downloadFile(rotatedPdf, file.name.replace('.pdf', '_rotated.pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rotate PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setPages([]);
    setError(null);
  };

  const hasRotations = pages.some((page) => page.rotation !== 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <div className="w-20 h-20 bg-orange-500 border-4 border-current flex items-center justify-center">
                <RotateCw className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  ROTATE PDF
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  ROTATE INDIVIDUAL PAGES OR THE ENTIRE DOCUMENT
                </p>
              </div>
            </div>
          </div>

          {!file ? (
            <div className="max-w-2xl mx-auto">
              <FileDropzone
                accept={{ 'application/pdf': ['.pdf'] }}
                multiple={false}
                maxFiles={1}
                onFilesSelected={handleFileSelected}
              />
            </div>
          ) : (
            <>
              {/* File Info & Controls */}
              <Card variant="outlined" className="mb-6">
                <CardBody className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-orange-500 border-2 border-current flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold">{file.name}</p>
                      <p className="text-sm opacity-70 font-mono">{pages.length} PAGES</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => rotateAllPages(90)}
                      className="flex items-center gap-2 px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current hover:bg-current hover:text-white transition-colors"
                    >
                      <RotateCw className="w-4 h-4" />
                      ROTATE ALL 90°
                    </button>
                    <button
                      onClick={() => rotateAllPages(-90)}
                      className="flex items-center gap-2 px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current hover:bg-current hover:text-white transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      ROTATE ALL -90°
                    </button>
                    {hasRotations && (
                      <button
                        onClick={resetRotations}
                        className="px-4 py-2 font-bold text-sm uppercase tracking-wider opacity-70 hover:opacity-100"
                      >
                        RESET
                      </button>
                    )}
                    <button
                      onClick={resetFile}
                      className="p-2 border-2 border-current hover:bg-current hover:text-white transition-colors"
                      title="Remove file"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </CardBody>
              </Card>

              {isLoading ? (
                <LoadingSpinner message="LOADING PDF PAGES..." />
              ) : (
                <>
                  {/* Page Grid */}
                  <div className="mb-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {pages.map((page, index) => (
                        <div
                          key={index}
                          className="relative group border-4 border-current hover:border-orange-500 transition-colors"
                        >
                          {/* Thumbnail */}
                          <div className="aspect-[3/4] overflow-hidden bg-gray-100 flex items-center justify-center">
                            <img
                              src={page.thumbnail}
                              alt={`Page ${index + 1}`}
                              className="max-w-full max-h-full object-contain transition-transform duration-300"
                              style={{
                                transform: `rotate(${page.rotation}deg)`,
                              }}
                              draggable={false}
                            />
                          </div>

                          {/* Page Number & Rotation Badge */}
                          <div className="py-2 px-3 border-t-4 border-current bg-white">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold uppercase">
                                PAGE {index + 1}
                              </span>
                              {page.rotation !== 0 && (
                                <span className="text-xs px-2 py-0.5 bg-orange-500 text-white font-bold">
                                  {page.rotation}°
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Rotation Controls */}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(index, -90);
                              }}
                              className="p-1.5 bg-white border-2 border-current hover:bg-current hover:text-white transition-colors"
                              title="Rotate left"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                rotatePage(index, 90);
                              }}
                              className="p-1.5 bg-white border-2 border-current hover:bg-current hover:text-white transition-colors"
                              title="Rotate right"
                            >
                              <RotateCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-8">
                      <Alert status="error">{error}</Alert>
                    </div>
                  )}

                  {/* Save Button */}
                  <div className="flex justify-center">
                    {isProcessing ? (
                      <LoadingSpinner message="APPLYING ROTATIONS..." />
                    ) : (
                      <Button
                        onClick={handleSave}
                        disabled={!hasRotations}
                        variant="primary"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        SAVE & DOWNLOAD
                      </Button>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          {/* Instructions */}
          {!file && (
            <Card variant="outlined" className="mt-12">
              <CardBody>
                <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">
                  HOW TO ROTATE PDFS:
                </h3>
                <ol className="space-y-4 font-mono">
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>UPLOAD A PDF FILE USING THE DROPZONE ABOVE</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>HOVER OVER PAGES TO SHOW ROTATION CONTROLS</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>CLICK "SAVE & DOWNLOAD" TO GET YOUR ROTATED PDF</span>
                  </li>
                </ol>
              </CardBody>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
