import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ListOrdered, Download, ArrowLeft, FileText, GripVertical, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { reorderPDFPages, getPDFPageCount } from '../utils/pdfUtils';
import { pdfToImages } from '../utils/imageUtils';
import { downloadFile } from '../utils/fileUtils';

interface PageItem {
  originalIndex: number;
  thumbnail: string;
}

export default function ReorderPages() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (file) {
      loadPDF();
    }
  }, [file]);

  const loadPDF = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const count = await getPDFPageCount(file);
      setPageCount(count);

      const thumbnails = await pdfToImages(file);
      setPages(thumbnails.map((thumbnail, index) => ({
        originalIndex: index,
        thumbnail,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setPages([]);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPages = [...pages];
    const draggedPage = newPages[draggedIndex];
    newPages.splice(draggedIndex, 1);
    newPages.splice(index, 0, draggedPage);
    setPages(newPages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const resetOrder = () => {
    const originalOrder = [...pages].sort((a, b) => a.originalIndex - b.originalIndex);
    setPages(originalOrder);
  };

  const reverseOrder = () => {
    setPages([...pages].reverse());
  };

  const hasChanges = pages.some((page, index) => page.originalIndex !== index);

  const handleSave = async () => {
    if (!file || !hasChanges) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Convert to 1-indexed page numbers in new order
      const newOrder = pages.map(p => p.originalIndex + 1);
      const reorderedPdf = await reorderPDFPages(file, newOrder);

      const originalName = file.name.replace('.pdf', '');
      downloadFile(reorderedPdf, `${originalName}_reordered.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reorder pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setPages([]);
    setError(null);
  };

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
              <div className="w-20 h-20 bg-cyan-500 border-4 border-current flex items-center justify-center">
                <ListOrdered className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  REORDER PAGES
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  DRAG AND DROP TO REARRANGE PAGES IN YOUR PDF
                </p>
              </div>
            </div>
          </div>

          {!file ? (
            <div className="max-w-2xl mx-auto">
              <FileDropzone
                accept={{ 'application/pdf': ['.pdf'] }}
                onFilesSelected={handleFilesSelected}
              />
            </div>
          ) : isLoading ? (
            <LoadingSpinner message="LOADING PDF PAGES..." />
          ) : (
            <>
              {/* File Info & Controls */}
              <Card variant="outlined" className="mb-6">
                <CardBody className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-cyan-500 border-2 border-current flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold">{file.name}</p>
                      <p className="text-sm opacity-70 font-mono">{pageCount} PAGES</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={reverseOrder}
                      className="px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current hover:bg-current hover:text-white transition-colors"
                    >
                      REVERSE ORDER
                    </button>
                    <button
                      onClick={resetOrder}
                      className="px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current hover:bg-current hover:text-white transition-colors"
                    >
                      RESET
                    </button>
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

              <p className="text-sm font-mono opacity-70 mb-4">
                DRAG PAGES TO REORDER THEM. {hasChanges ? 'ORDER HAS BEEN CHANGED.' : 'NO CHANGES YET.'}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {pages.map((page, index) => (
                  <div
                    key={page.originalIndex}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative cursor-move transition-all border-4 border-current hover:border-cyan-500 ${
                      draggedIndex === index ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    <div className="relative group">
                      <img
                        src={page.thumbnail}
                        alt={`Page ${page.originalIndex + 1}`}
                        className="w-full aspect-[3/4] object-cover bg-white"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <GripVertical className="w-8 h-8 text-white" />
                      </div>
                      <div className="py-2 px-3 border-t-4 border-current bg-white">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono opacity-70">
                            ORIG: {page.originalIndex + 1}
                          </span>
                          <span className="text-sm font-bold">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      {page.originalIndex !== index && (
                        <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 flex items-center justify-center">
                          <span className="text-xs font-bold text-white">!</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
                  <LoadingSpinner message="REORDERING PAGES..." />
                ) : (
                  <Button
                    onClick={handleSave}
                    disabled={!hasChanges}
                    variant="primary"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    SAVE & DOWNLOAD
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Instructions */}
          {!file && (
            <Card variant="outlined" className="mt-12">
              <CardBody>
                <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">
                  HOW TO REORDER PAGES:
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
                    <span>DRAG AND DROP PAGES TO REARRANGE THEM</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>CLICK "SAVE & DOWNLOAD" TO GET YOUR REORDERED PDF</span>
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
