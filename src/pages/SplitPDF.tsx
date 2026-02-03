import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import PageThumbnail from '../components/PageThumbnail';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { splitPDF, extractPDFPages, getPDFPageCount } from '../utils/pdfUtils';
import { pdfToImages } from '../utils/imageUtils';
import { downloadFile } from '../utils/fileUtils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Scissors,
  Download,
  FileText,
  X,
  ArrowLeft,
} from 'lucide-react';

type SplitMode = 'range' | 'extract-all' | 'selected';

export default function SplitPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [splitMode, setSplitMode] = useState<SplitMode>('selected');
  const [rangeStart, setRangeStart] = useState('1');
  const [rangeEnd, setRangeEnd] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const selectedFile = files[0];
    setFile(selectedFile);
    setError(null);
    setSelectedPages(new Set());
    setIsLoading(true);

    try {
      const count = await getPDFPageCount(selectedFile);
      setPageCount(count);
      setRangeEnd(count.toString());

      // Generate thumbnails
      const images = await pdfToImages(selectedFile);
      setThumbnails(images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const togglePageSelection = (pageNumber: number) => {
    setSelectedPages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(pageNumber)) {
        newSet.delete(pageNumber);
      } else {
        newSet.add(pageNumber);
      }
      return newSet;
    });
  };

  const selectAllPages = () => {
    const allPages = new Set(Array.from({ length: pageCount }, (_, i) => i + 1));
    setSelectedPages(allPages);
  };

  const clearSelection = () => {
    setSelectedPages(new Set());
  };

  const handleSplit = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (splitMode === 'extract-all') {
        // Extract all pages as individual PDFs
        const zip = new JSZip();
        const baseName = file.name.replace('.pdf', '');

        for (let i = 1; i <= pageCount; i++) {
          const pdfBytes = await extractPDFPages(file, [i]);
          zip.file(`${baseName}_page_${i}.pdf`, pdfBytes);
        }

        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, `${baseName}_split.zip`);
      } else if (splitMode === 'range') {
        const start = parseInt(rangeStart);
        const end = parseInt(rangeEnd);

        if (isNaN(start) || isNaN(end) || start < 1 || end > pageCount || start > end) {
          throw new Error('Invalid page range');
        }

        const results = await splitPDF(file, [{ start, end }]);
        downloadFile(results[0], `${file.name.replace('.pdf', '')}_pages_${start}-${end}.pdf`);
      } else if (splitMode === 'selected') {
        if (selectedPages.size === 0) {
          throw new Error('Please select at least one page');
        }

        const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);

        if (sortedPages.length === 1) {
          const pdfBytes = await extractPDFPages(file, sortedPages);
          downloadFile(pdfBytes, `${file.name.replace('.pdf', '')}_page_${sortedPages[0]}.pdf`);
        } else {
          const zip = new JSZip();
          const baseName = file.name.replace('.pdf', '');

          for (const pageNum of sortedPages) {
            const pdfBytes = await extractPDFPages(file, [pageNum]);
            zip.file(`${baseName}_page_${pageNum}.pdf`, pdfBytes);
          }

          const content = await zip.generateAsync({ type: 'blob' });
          saveAs(content, `${baseName}_selected_pages.zip`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to split PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setThumbnails([]);
    setPageCount(0);
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
              <div className="w-20 h-20 bg-purple-500 border-4 border-current flex items-center justify-center">
                <Scissors className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  SPLIT PDF
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  SPLIT A PDF INTO MULTIPLE FILES BY PAGE RANGES
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
              {/* File Info */}
              <Card variant="outlined" className="mb-6">
                <CardBody className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-500 border-2 border-current flex items-center justify-center">
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

              {isLoading ? (
                <LoadingSpinner message="LOADING PDF PAGES..." />
              ) : (
                <>
                  {/* Split Mode Selector */}
                  <Card variant="outlined" className="mb-6">
                    <CardBody>
                      <h3 className="font-bold uppercase tracking-wider text-sm mb-4">SPLIT MODE</h3>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setSplitMode('selected')}
                          className={`px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current transition-colors ${
                            splitMode === 'selected'
                              ? 'bg-purple-500 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          SELECT PAGES
                        </button>
                        <button
                          onClick={() => setSplitMode('range')}
                          className={`px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current transition-colors ${
                            splitMode === 'range'
                              ? 'bg-purple-500 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          PAGE RANGE
                        </button>
                        <button
                          onClick={() => setSplitMode('extract-all')}
                          className={`px-4 py-2 font-bold text-sm uppercase tracking-wider border-4 border-current transition-colors ${
                            splitMode === 'extract-all'
                              ? 'bg-purple-500 text-white'
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          EXTRACT ALL PAGES
                        </button>
                      </div>

                      {/* Range Inputs */}
                      {splitMode === 'range' && (
                        <div className="mt-4 flex items-center gap-4">
                          <label className="font-mono text-sm">FROM PAGE</label>
                          <input
                            type="number"
                            min={1}
                            max={pageCount}
                            value={rangeStart}
                            onChange={(e) => setRangeStart(e.target.value)}
                            className="w-20 px-3 py-2 border-4 border-current font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                          <label className="font-mono text-sm">TO</label>
                          <input
                            type="number"
                            min={1}
                            max={pageCount}
                            value={rangeEnd}
                            onChange={(e) => setRangeEnd(e.target.value)}
                            className="w-20 px-3 py-2 border-4 border-current font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      )}

                      {/* Selection Actions */}
                      {splitMode === 'selected' && (
                        <div className="mt-4 flex items-center gap-4">
                          <button
                            onClick={selectAllPages}
                            className="text-sm font-bold uppercase tracking-wider text-purple-500 hover:underline"
                          >
                            SELECT ALL
                          </button>
                          <button
                            onClick={clearSelection}
                            className="text-sm font-bold uppercase tracking-wider opacity-70 hover:opacity-100"
                          >
                            CLEAR SELECTION
                          </button>
                          <span className="text-sm font-mono opacity-70">
                            {selectedPages.size} PAGE(S) SELECTED
                          </span>
                        </div>
                      )}
                    </CardBody>
                  </Card>

                  {/* Page Thumbnails */}
                  {splitMode === 'selected' && (
                    <div className="mb-8">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {thumbnails.map((thumbnail, index) => (
                          <PageThumbnail
                            key={index}
                            pageNumber={index + 1}
                            imageUrl={thumbnail}
                            selected={selectedPages.has(index + 1)}
                            onClick={() => togglePageSelection(index + 1)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Message */}
                  {error && (
                    <div className="mb-8">
                      <Alert status="error">{error}</Alert>
                    </div>
                  )}

                  {/* Split Button */}
                  <div className="flex justify-center">
                    {isProcessing ? (
                      <LoadingSpinner message="SPLITTING PDF..." />
                    ) : (
                      <Button onClick={handleSplit} variant="primary">
                        <Download className="w-5 h-5 mr-2" />
                        SPLIT & DOWNLOAD
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
                  HOW TO SPLIT PDFS:
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
                    <span>SELECT PAGES, ENTER A RANGE, OR EXTRACT ALL</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>CLICK "SPLIT & DOWNLOAD" TO GET YOUR FILES</span>
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
