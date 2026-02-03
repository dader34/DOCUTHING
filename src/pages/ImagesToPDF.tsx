import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { imagesToPDF } from '../utils/imageUtils';
import { downloadFile, formatFileSize, generateUniqueId } from '../utils/fileUtils';
import {
  FileImage,
  GripVertical,
  Trash2,
  Download,
  ArrowLeft,
} from 'lucide-react';

interface UploadedImage {
  id: string;
  file: File;
  name: string;
  size: number;
  preview: string;
}

export default function ImagesToPDF() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    setError(null);

    const newImages: UploadedImage[] = selectedFiles.map((file) => ({
      id: generateUniqueId(),
      file,
      name: file.name,
      size: file.size,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  }, []);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedImage = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedImage);
    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleConvert = async () => {
    if (images.length === 0) {
      setError('Please add at least one image.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const imageFiles = images.map((img) => img.file);
      const pdfBytes = await imagesToPDF(imageFiles);
      downloadFile(pdfBytes, 'images_to_pdf.pdf');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
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
              <div className="w-20 h-20 bg-green-500 border-4 border-current flex items-center justify-center">
                <FileImage className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">
                  IMAGES TO PDF
                </h1>
                <p className="opacity-70 font-mono mt-2">
                  CREATE A PDF FROM MULTIPLE IMAGES
                </p>
              </div>
            </div>
          </div>

          {/* Dropzone */}
          <div className="mb-8">
            <FileDropzone
              accept={{
                'image/jpeg': ['.jpg', '.jpeg'],
                'image/png': ['.png'],
                'image/webp': ['.webp'],
              }}
              multiple={true}
              maxFiles={50}
              onFilesSelected={handleFilesSelected}
            />
          </div>

          {/* Image Grid */}
          {images.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold uppercase tracking-wider">
                  IMAGES ({images.length})
                </h2>
                <button
                  onClick={clearAll}
                  className="text-sm font-bold uppercase tracking-wider opacity-70 hover:opacity-100"
                >
                  CLEAR ALL
                </button>
              </div>

              <p className="text-sm font-mono opacity-70 mb-4">
                DRAG TO REORDER — IMAGES WILL APPEAR IN THIS ORDER IN THE PDF
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image, index) => (
                  <div
                    key={image.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`relative group border-4 border-current hover:border-green-500 transition-all cursor-move ${
                      draggedIndex === index ? 'opacity-50 scale-95' : ''
                    }`}
                  >
                    {/* Drag Handle */}
                    <div className="absolute top-2 left-2 z-20 p-1.5 bg-white border-2 border-current opacity-0 group-hover:opacity-100 transition-all cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 z-20 p-1.5 bg-white border-2 border-current opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {/* Image Preview */}
                    <div className="aspect-square overflow-hidden bg-gray-100">
                      <img
                        src={image.preview}
                        alt={image.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        draggable={false}
                      />
                    </div>

                    {/* Image Info */}
                    <div className="p-3 border-t-4 border-current bg-white">
                      <p className="text-sm font-bold truncate">
                        {image.name}
                      </p>
                      <p className="text-xs font-mono opacity-70">
                        {formatFileSize(image.size)}
                      </p>
                    </div>

                    {/* Order Number */}
                    <div className="absolute bottom-14 left-2 w-6 h-6 bg-green-500 flex items-center justify-center">
                      <span className="text-xs font-bold text-white">
                        {index + 1}
                      </span>
                    </div>
                  </div>
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

          {/* Convert Button */}
          {images.length > 0 && (
            <div className="flex justify-center">
              {isProcessing ? (
                <LoadingSpinner message="CREATING PDF..." />
              ) : (
                <Button onClick={handleConvert} variant="primary">
                  <Download className="w-5 h-5 mr-2" />
                  CONVERT TO PDF & DOWNLOAD
                </Button>
              )}
            </div>
          )}

          {/* Instructions */}
          {images.length === 0 && (
            <Card variant="outlined" className="mt-12">
              <CardBody>
                <h3 className="text-xl font-bold mb-6 uppercase tracking-wider">
                  SUPPORTED FORMATS:
                </h3>
                <div className="flex flex-wrap gap-3 mb-6">
                  <span className="px-3 py-1 border-4 border-current font-bold text-sm">
                    JPG / JPEG
                  </span>
                  <span className="px-3 py-1 border-4 border-current font-bold text-sm">
                    PNG
                  </span>
                  <span className="px-3 py-1 border-4 border-current font-bold text-sm">
                    WEBP
                  </span>
                </div>
                <ol className="space-y-4 font-mono">
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      1
                    </span>
                    <span>UPLOAD ONE OR MORE IMAGES USING THE DROPZONE ABOVE</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>DRAG AND DROP TO REORDER IMAGES AS NEEDED</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-current text-white flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>CLICK "CONVERT TO PDF & DOWNLOAD" TO CREATE YOUR PDF</span>
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
