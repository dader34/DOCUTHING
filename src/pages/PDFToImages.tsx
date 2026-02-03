import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { pdfToImages } from '../utils/imageUtils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Image,
  Download,
  FileText,
  X,
  ArrowLeft,
  FileArchive,
} from 'lucide-react';

export default function PDFToImages() {
  const [file, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const selectedFile = files[0];
    setFile(selectedFile);
    setError(null);
    setImages([]);
    setIsLoading(true);

    try {
      const convertedImages = await pdfToImages(selectedFile);
      setImages(convertedImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert PDF');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const downloadSingleImage = (imageData: string, index: number) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `${file?.name.replace('.pdf', '') || 'page'}_page_${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAsZip = async () => {
    if (images.length === 0 || !file) return;

    setIsDownloading(true);

    try {
      const zip = new JSZip();
      const baseName = file.name.replace('.pdf', '');

      for (let i = 0; i < images.length; i++) {
        // Convert base64 to blob
        const response = await fetch(images[i]);
        const blob = await response.blob();
        zip.file(`${baseName}_page_${i + 1}.png`, blob);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${baseName}_images.zip`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ZIP file');
    } finally {
      setIsDownloading(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setImages([]);
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
                <Image className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  PDF TO IMAGES
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  CONVERT PDF PAGES TO HIGH-QUALITY PNG IMAGES
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
                      <p className="text-sm opacity-70 font-mono">
                        {images.length > 0
                          ? `${images.length} PAGE(S) CONVERTED`
                          : 'CONVERTING...'}
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
                </CardBody>
              </Card>

              {isLoading ? (
                <LoadingSpinner message="CONVERTING PDF TO IMAGES..." />
              ) : (
                <>
                  {/* Download All Button */}
                  {images.length > 0 && (
                    <div className="flex justify-center gap-4 mb-8">
                      <Button
                        onClick={downloadAllAsZip}
                        disabled={isDownloading}
                        variant="primary"
                      >
                        {isDownloading ? (
                          <>CREATING ZIP...</>
                        ) : (
                          <>
                            <FileArchive className="w-5 h-5 mr-2" />
                            DOWNLOAD ALL AS ZIP
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Image Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {images.map((imageData, index) => (
                      <div
                        key={index}
                        className="group relative border-4 border-current hover:border-purple-500 transition-colors"
                      >
                        {/* Image Preview */}
                        <div className="aspect-[3/4] overflow-hidden bg-white">
                          <img
                            src={imageData}
                            alt={`Page ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Overlay with Download Button */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={() => downloadSingleImage(imageData, index)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-black font-bold uppercase tracking-wider border-4 border-current hover:bg-[#ffff00] transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            DOWNLOAD
                          </button>
                        </div>

                        {/* Page Number */}
                        <div className="py-2 px-3 border-t-4 border-current bg-white">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold uppercase">
                              PAGE {index + 1}
                            </span>
                            <span className="text-xs font-mono opacity-70">
                              PNG
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mt-8">
                      <Alert status="error">{error}</Alert>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Instructions */}
          {!file && (
            <Card variant="outlined" className="mt-12">
              <CardBody>
                <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">
                  HOW IT WORKS:
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
                    <span>EACH PAGE WILL BE CONVERTED TO A HIGH-QUALITY PNG IMAGE</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>DOWNLOAD IMAGES INDIVIDUALLY OR ALL AT ONCE AS A ZIP FILE</span>
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
