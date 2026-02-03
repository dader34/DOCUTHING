import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { mergePDFs } from '../utils/pdfUtils';
import { downloadFile, formatFileSize, generateUniqueId } from '../utils/fileUtils';
import {
  FileStack,
  GripVertical,
  Trash2,
  Download,
  FileText,
  ArrowLeft,
} from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: number;
}

export default function MergePDF() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setError(null);
    const newFiles: UploadedFile[] = selectedFiles.map((file) => ({
      id: generateUniqueId(),
      file,
      name: file.name,
      size: file.size,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);
    setFiles(newFiles);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Please add at least 2 PDF files to merge.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const pdfFiles = files.map((f) => f.file);
      const mergedPdf = await mergePDFs(pdfFiles);
      downloadFile(mergedPdf, 'merged.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to merge PDFs');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
                <FileStack className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  MERGE PDF
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  COMBINE MULTIPLE PDF FILES INTO ONE DOCUMENT
                </p>
              </div>
            </div>
          </div>

          {/* Dropzone */}
          <div className="mb-8">
            <FileDropzone
              accept={{ 'application/pdf': ['.pdf'] }}
              multiple={true}
              maxFiles={20}
              onFilesSelected={handleFilesSelected}
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-4 uppercase tracking-wider">
                FILES TO MERGE ({files.length})
              </h2>
              <p className="text-sm opacity-70 font-mono mb-4">
                DRAG TO REORDER — FILES WILL BE MERGED TOP TO BOTTOM
              </p>
              <div className="space-y-3">
                {files.map((file, index) => (
                  <Card
                    key={file.id}
                    variant="outlined"
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={draggedIndex === index ? 'opacity-50' : ''}
                  >
                    <CardBody className="flex items-center gap-4">
                      <div className="cursor-grab active:cursor-grabbing p-1">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="w-10 h-10 bg-blue-500 border-2 border-current flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate">
                          {file.name}
                        </p>
                        <p className="text-sm opacity-70 font-mono">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <span className="px-3 py-1 text-sm font-bold border-2 border-current">
                        {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        onClick={() => removeFile(file.id)}
                        title="Remove file"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </CardBody>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-8">
              <Alert status="error">
                {error}
              </Alert>
            </div>
          )}

          {/* Merge Button */}
          {files.length > 0 && (
            <div className="flex justify-center">
              {isProcessing ? (
                <LoadingSpinner message="MERGING PDFS..." />
              ) : (
                <Button
                  onClick={handleMerge}
                  disabled={files.length < 2}
                  variant="primary"
                >
                  <Download className="w-5 h-5 mr-2" />
                  MERGE & DOWNLOAD
                </Button>
              )}
            </div>
          )}

          {/* Instructions */}
          {files.length === 0 && (
            <Card variant="outlined" className="mt-12">
              <CardBody>
                <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">
                  HOW TO MERGE PDFS:
                </h3>
                <ol className="space-y-4 font-mono">
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>UPLOAD TWO OR MORE PDF FILES USING THE DROPZONE ABOVE</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>DRAG AND DROP TO REORDER FILES AS NEEDED</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>CLICK "MERGE & DOWNLOAD" TO COMBINE AND SAVE YOUR PDF</span>
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
