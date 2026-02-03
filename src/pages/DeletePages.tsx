import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Download, ArrowLeft, FileText, X } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import PageThumbnail from '../components/PageThumbnail';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { deletePDFPages, getPDFPageCount } from '../utils/pdfUtils';
import { pdfToImages } from '../utils/imageUtils';
import { downloadFile } from '../utils/fileUtils';

export default function DeletePages() {
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

  const handleDelete = async () => {
    if (!file || selectedPages.size === 0) return;

    if (selectedPages.size >= pageCount) {
      setError('Cannot delete all pages. At least one page must remain.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Convert to 1-indexed page numbers
      const pagesToDelete = Array.from(selectedPages).map(p => p + 1);
      const resultPdf = await deletePDFPages(file, pagesToDelete);

      const originalName = file.name.replace('.pdf', '');
      downloadFile(resultPdf, `${originalName}_modified.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pages');
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
              <div className="w-20 h-20 bg-pink-500 border-4 border-current flex items-center justify-center">
                <Trash2 className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  DELETE PAGES
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  REMOVE UNWANTED PAGES FROM YOUR PDF
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
              {/* File Info */}
              <Card variant="outlined" className="mb-6">
                <CardBody className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-pink-500 border-2 border-current flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold">{file.name}</p>
                      <p className="text-sm opacity-70 font-mono">{pageCount} PAGES</p>
                    </div>
                  </div>
                  <button
                    onClick={resetFile}
                    className="p-2 border-2 border-current hover:bg-current hover:text-white transition-colors"
                    title="Remove file"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </CardBody>
              </Card>

              <p className="text-sm font-mono opacity-70 mb-4">
                CLICK ON PAGES TO SELECT THEM FOR DELETION. SELECTED FOR REMOVAL: {selectedPages.size}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {pageThumbnails.map((thumbnail, index) => (
                  <div key={index} className="relative">
                    <PageThumbnail
                      pageNumber={index + 1}
                      imageUrl={thumbnail}
                      selected={selectedPages.has(index)}
                      onClick={() => togglePageSelection(index)}
                    />
                    {selectedPages.has(index) && (
                      <div className="absolute inset-0 bg-red-500/30 border-4 border-red-500 flex items-center justify-center pointer-events-none">
                        <Trash2 className="w-8 h-8 text-red-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-8">
                  <Alert status="error">{error}</Alert>
                </div>
              )}

              {/* Delete Button */}
              <div className="flex justify-center">
                {isProcessing ? (
                  <LoadingSpinner message="DELETING PAGES..." />
                ) : (
                  <Button
                    onClick={handleDelete}
                    disabled={selectedPages.size === 0}
                    variant="primary"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    DELETE {selectedPages.size} PAGE(S) & DOWNLOAD
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
                  HOW TO DELETE PAGES:
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
                    <span>CLICK ON PAGES YOU WANT TO DELETE</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>CLICK "DELETE & DOWNLOAD" TO GET YOUR MODIFIED PDF</span>
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
