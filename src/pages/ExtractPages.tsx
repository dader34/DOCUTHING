import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileOutput, Download, ArrowLeft, FileText, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import PageThumbnail from '../components/PageThumbnail';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { extractPDFPages, getPDFPageCount } from '../utils/pdfUtils';
import { pdfToImages } from '../utils/imageUtils';
import { downloadFile } from '../utils/fileUtils';

export default function ExtractPages() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageThumbnails, setPageThumbnails] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setPageThumbnails(thumbnails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length > 0) {
      setFile(files[0]);
      setSelectedPages(new Set());
    }
  };

  const togglePageSelection = (pageIndex: number) => {
    const newSelection = new Set(selectedPages);
    if (newSelection.has(pageIndex)) {
      newSelection.delete(pageIndex);
    } else {
      newSelection.add(pageIndex);
    }
    setSelectedPages(newSelection);
  };

  const selectAll = () => {
    const all = new Set<number>();
    for (let i = 0; i < pageCount; i++) {
      all.add(i);
    }
    setSelectedPages(all);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const selectRange = () => {
    const start = prompt('Enter start page number:');
    const end = prompt('Enter end page number:');

    if (start && end) {
      const startNum = parseInt(start, 10);
      const endNum = parseInt(end, 10);

      if (startNum >= 1 && endNum <= pageCount && startNum <= endNum) {
        const newSelection = new Set(selectedPages);
        for (let i = startNum - 1; i < endNum; i++) {
          newSelection.add(i);
        }
        setSelectedPages(newSelection);
      }
    }
  };

  const handleExtract = async () => {
    if (!file || selectedPages.size === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      // Convert to 1-indexed page numbers
      const pagesToExtract = Array.from(selectedPages).map(p => p + 1).sort((a, b) => a - b);
      const extractedPdf = await extractPDFPages(file, pagesToExtract);

      const originalName = file.name.replace('.pdf', '');
      downloadFile(extractedPdf, `${originalName}_extracted.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract pages');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setPageThumbnails([]);
    setSelectedPages(new Set());
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
              <div className="w-20 h-20 bg-blue-500 border-4 border-current flex items-center justify-center">
                <FileOutput className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  EXTRACT PAGES
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  EXTRACT SPECIFIC PAGES TO A NEW PDF
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
                    <div className="w-10 h-10 bg-blue-500 border-2 border-current flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold">{file.name}</p>
                      <p className="text-sm opacity-70 font-mono">{pageCount} PAGES</p>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={selectAll}
                      className="px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current hover:bg-current hover:text-white transition-colors"
                    >
                      SELECT ALL
                    </button>
                    <button
                      onClick={selectRange}
                      className="px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current hover:bg-current hover:text-white transition-colors"
                    >
                      SELECT RANGE
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current hover:bg-current hover:text-white transition-colors"
                    >
                      CLEAR
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
                CLICK ON PAGES TO SELECT THEM FOR EXTRACTION. SELECTED: {selectedPages.size}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {pageThumbnails.map((thumbnail, index) => (
                  <PageThumbnail
                    key={index}
                    pageNumber={index + 1}
                    imageUrl={thumbnail}
                    selected={selectedPages.has(index)}
                    onClick={() => togglePageSelection(index)}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-8">
                  <Alert status="error">{error}</Alert>
                </div>
              )}

              {/* Extract Button */}
              <div className="flex justify-center">
                {isProcessing ? (
                  <LoadingSpinner message="EXTRACTING PAGES..." />
                ) : (
                  <Button
                    onClick={handleExtract}
                    disabled={selectedPages.size === 0}
                    variant="primary"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    EXTRACT {selectedPages.size} PAGE(S) & DOWNLOAD
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
                  HOW TO EXTRACT PAGES:
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
                    <span>SELECT THE PAGES YOU WANT TO EXTRACT</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>CLICK "EXTRACT & DOWNLOAD" TO GET YOUR NEW PDF</span>
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
