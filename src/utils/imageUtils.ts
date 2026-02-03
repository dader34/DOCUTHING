import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Set up the worker for pdfjs-dist v5
// Use the built-in worker from the package
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * Converts a File to an ArrayBuffer
 */
async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Reads a File as a data URL (base64)
 */
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Loads an image and returns its dimensions
 */
async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

/**
 * Determines the image type from a file
 */
function getImageType(file: File): 'png' | 'jpg' {
  const type = file.type.toLowerCase();
  if (type === 'image/png') {
    return 'png';
  }
  return 'jpg'; // Default to jpg for jpeg, webp, etc.
}

/**
 * Converts image files to a single PDF document
 * Each image will be placed on its own page, scaled to fit
 * @param images - Array of image files to convert
 * @returns The PDF as a Uint8Array
 */
export async function imagesToPDF(images: File[]): Promise<Uint8Array> {
  if (images.length === 0) {
    throw new Error('No images provided');
  }

  const pdf = await PDFDocument.create();

  for (const imageFile of images) {
    try {
      const dataUrl = await fileToDataURL(imageFile);
      const img = await loadImage(dataUrl);
      const arrayBuffer = await fileToArrayBuffer(imageFile);
      const uint8Array = new Uint8Array(arrayBuffer);

      let embeddedImage;
      const imageType = getImageType(imageFile);

      if (imageType === 'png') {
        embeddedImage = await pdf.embedPng(uint8Array);
      } else {
        embeddedImage = await pdf.embedJpg(uint8Array);
      }

      // Create a page with dimensions matching the image aspect ratio
      // Use standard page dimensions and scale the image to fit
      const pageWidth = 595.276; // A4 width in points
      const pageHeight = 841.890; // A4 height in points

      const page = pdf.addPage([pageWidth, pageHeight]);

      // Calculate scaling to fit the image within the page with some margin
      const margin = 40;
      const availableWidth = pageWidth - 2 * margin;
      const availableHeight = pageHeight - 2 * margin;

      const imageAspectRatio = img.width / img.height;
      const pageAspectRatio = availableWidth / availableHeight;

      let drawWidth: number;
      let drawHeight: number;

      if (imageAspectRatio > pageAspectRatio) {
        // Image is wider, fit to width
        drawWidth = availableWidth;
        drawHeight = availableWidth / imageAspectRatio;
      } else {
        // Image is taller, fit to height
        drawHeight = availableHeight;
        drawWidth = availableHeight * imageAspectRatio;
      }

      // Center the image on the page
      const x = (pageWidth - drawWidth) / 2;
      const y = (pageHeight - drawHeight) / 2;

      page.drawImage(embeddedImage, {
        x,
        y,
        width: drawWidth,
        height: drawHeight,
      });
    } catch (error) {
      throw new Error(
        `Failed to process image "${imageFile.name}": ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  return pdf.save();
}

export interface PageDimensions {
  width: number;
  height: number;
}

export interface PdfPagesResult {
  images: string[];
  pageDimensions: PageDimensions[];
}

/**
 * Converts PDF pages to base64 image strings
 * @param file - The PDF file to convert
 * @returns Array of base64 image strings (one per page)
 */
export async function pdfToImages(file: File): Promise<string[]> {
  const result = await pdfToImagesWithDimensions(file);
  return result.images;
}

/**
 * Converts PDF pages to base64 image strings and returns page dimensions
 * @param file - The PDF file to convert
 * @returns Object with images array and pageDimensions array (in PDF points)
 */
export async function pdfToImagesWithDimensions(file: File): Promise<PdfPagesResult> {
  const arrayBuffer = await fileToArrayBuffer(file);

  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const images: string[] = [];
  const pageDimensions: PageDimensions[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    try {
      const page = await pdf.getPage(pageNum);

      // Get the original page dimensions (at scale 1)
      const originalViewport = page.getViewport({ scale: 1 });
      pageDimensions.push({
        width: originalViewport.width,
        height: originalViewport.height,
      });

      // Set a reasonable scale for good quality without being too large
      const scale = 2;
      const viewport = page.getViewport({ scale });

      // Create a canvas element
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Failed to get canvas context');
      }

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render the page to the canvas
      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      } as unknown as Parameters<typeof page.render>[0]).promise;

      // Convert canvas to base64 PNG
      const base64Image = canvas.toDataURL('image/png');
      images.push(base64Image);

      // Clean up
      canvas.width = 0;
      canvas.height = 0;
    } catch (error) {
      throw new Error(
        `Failed to render page ${pageNum}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  return { images, pageDimensions };
}

export interface TextItem {
  text: string;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  fontSize: number;
}

export interface PageTextContent {
  pageNum: number;
  items: TextItem[];
}

/**
 * Extracts text content with positions from a PDF file.
 * Only works with PDFs that have embedded text (not scanned/image PDFs).
 * @param file - The PDF file to extract text from
 * @returns Array of page text content with positioned items
 */
export async function extractPdfTextContent(file: File): Promise<PageTextContent[]> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const result: PageTextContent[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    const items: TextItem[] = [];

    for (const item of textContent.items) {
      if ('str' in item && item.str.trim()) {
        const tx = item.transform;
        // Transform matrix: [scaleX, skewY, skewX, scaleY, translateX, translateY]
        const x = tx[4];
        const y = viewport.height - tx[5]; // PDF coordinates are bottom-up
        const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]); // Approximate font size from transform
        const width = item.width || fontSize * item.str.length * 0.6;
        const height = item.height || fontSize;

        items.push({
          text: item.str,
          x: (x / viewport.width) * 100,
          y: (y / viewport.height) * 100,
          width: (width / viewport.width) * 100,
          height: (height / viewport.height) * 100,
          fontSize,
        });
      }
    }

    result.push({ pageNum, items });
  }

  return result;
}
