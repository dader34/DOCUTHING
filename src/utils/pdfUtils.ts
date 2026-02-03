import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
 * Parses a hex color string to RGB values (0-1 range)
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  return { r, g, b };
}

/**
 * Merges multiple PDF files into a single PDF
 * @param files - Array of PDF files to merge
 * @returns The merged PDF as a Uint8Array
 */
export async function mergePDFs(files: File[]): Promise<Uint8Array> {
  if (files.length === 0) {
    throw new Error('No files provided for merging');
  }

  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    try {
      const arrayBuffer = await fileToArrayBuffer(file);
      const pdf = await PDFDocument.load(arrayBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    } catch (error) {
      throw new Error(`Failed to process file "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return mergedPdf.save();
}

/**
 * Splits a PDF into multiple PDFs based on page ranges
 * @param file - The PDF file to split
 * @param ranges - Array of page ranges (1-indexed, inclusive)
 * @returns Array of split PDFs as Uint8Arrays
 */
export async function splitPDF(
  file: File,
  ranges: { start: number; end: number }[]
): Promise<Uint8Array[]> {
  if (ranges.length === 0) {
    throw new Error('No ranges provided for splitting');
  }

  const arrayBuffer = await fileToArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const pageCount = sourcePdf.getPageCount();

  const results: Uint8Array[] = [];

  for (const range of ranges) {
    if (range.start < 1 || range.end > pageCount || range.start > range.end) {
      throw new Error(`Invalid range: ${range.start}-${range.end}. PDF has ${pageCount} pages.`);
    }

    const newPdf = await PDFDocument.create();
    // Convert from 1-indexed to 0-indexed
    const pageIndices = Array.from(
      { length: range.end - range.start + 1 },
      (_, i) => range.start - 1 + i
    );
    const pages = await newPdf.copyPages(sourcePdf, pageIndices);
    pages.forEach((page) => newPdf.addPage(page));
    results.push(await newPdf.save());
  }

  return results;
}

/**
 * Rotates specific pages in a PDF
 * @param file - The PDF file
 * @param rotations - Map of page numbers (1-indexed) to rotation degrees (90, 180, 270)
 * @returns The modified PDF as a Uint8Array
 */
export async function rotatePDFPages(
  file: File,
  rotations: Map<number, number>
): Promise<Uint8Array> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  const pageCount = pdf.getPageCount();

  rotations.forEach((degrees, pageNumber) => {
    if (pageNumber < 1 || pageNumber > pageCount) {
      throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pageCount} pages.`);
    }
    if (![0, 90, 180, 270].includes(degrees)) {
      throw new Error(`Invalid rotation: ${degrees}. Must be 0, 90, 180, or 270.`);
    }

    const page = pdf.getPage(pageNumber - 1);
    const currentRotation = page.getRotation().angle;
    page.setRotation({ type: 'degrees', angle: (currentRotation + degrees) % 360 } as any);
  });

  return pdf.save();
}

/**
 * Deletes specific pages from a PDF
 * @param file - The PDF file
 * @param pageNumbers - Array of page numbers to delete (1-indexed)
 * @returns The modified PDF as a Uint8Array
 */
export async function deletePDFPages(
  file: File,
  pageNumbers: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const pageCount = sourcePdf.getPageCount();

  // Validate page numbers
  for (const pageNum of pageNumbers) {
    if (pageNum < 1 || pageNum > pageCount) {
      throw new Error(`Invalid page number: ${pageNum}. PDF has ${pageCount} pages.`);
    }
  }

  if (pageNumbers.length >= pageCount) {
    throw new Error('Cannot delete all pages from the PDF');
  }

  // Create a new PDF with only the pages we want to keep
  const newPdf = await PDFDocument.create();
  const pagesToKeep = sourcePdf
    .getPageIndices()
    .filter((index) => !pageNumbers.includes(index + 1));

  const pages = await newPdf.copyPages(sourcePdf, pagesToKeep);
  pages.forEach((page) => newPdf.addPage(page));

  return newPdf.save();
}

/**
 * Reorders pages in a PDF
 * @param file - The PDF file
 * @param newOrder - Array of page numbers in the new order (1-indexed)
 * @returns The reordered PDF as a Uint8Array
 */
export async function reorderPDFPages(
  file: File,
  newOrder: number[]
): Promise<Uint8Array> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const pageCount = sourcePdf.getPageCount();

  // Validate new order
  if (newOrder.length !== pageCount) {
    throw new Error(`New order must contain exactly ${pageCount} pages`);
  }

  const sortedOrder = [...newOrder].sort((a, b) => a - b);
  for (let i = 0; i < pageCount; i++) {
    if (sortedOrder[i] !== i + 1) {
      throw new Error('New order must contain all page numbers exactly once');
    }
  }

  const newPdf = await PDFDocument.create();
  // Convert from 1-indexed to 0-indexed
  const pageIndices = newOrder.map((pageNum) => pageNum - 1);
  const pages = await newPdf.copyPages(sourcePdf, pageIndices);
  pages.forEach((page) => newPdf.addPage(page));

  return newPdf.save();
}

/**
 * Compresses a PDF by removing unused objects and optimizing streams
 * Note: pdf-lib doesn't support advanced compression, but we can remove unused objects
 * @param file - The PDF file to compress
 * @returns The compressed PDF as a Uint8Array
 */
export async function compressPDF(file: File): Promise<Uint8Array> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  // Save with object streams enabled for better compression
  return pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });
}

/**
 * Extracts specific pages from a PDF into a new PDF
 * @param file - The PDF file
 * @param pageNumbers - Array of page numbers to extract (1-indexed)
 * @returns The new PDF containing only the extracted pages as a Uint8Array
 */
export async function extractPDFPages(
  file: File,
  pageNumbers: number[]
): Promise<Uint8Array> {
  if (pageNumbers.length === 0) {
    throw new Error('No pages specified for extraction');
  }

  const arrayBuffer = await fileToArrayBuffer(file);
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const pageCount = sourcePdf.getPageCount();

  // Validate page numbers
  for (const pageNum of pageNumbers) {
    if (pageNum < 1 || pageNum > pageCount) {
      throw new Error(`Invalid page number: ${pageNum}. PDF has ${pageCount} pages.`);
    }
  }

  const newPdf = await PDFDocument.create();
  // Convert from 1-indexed to 0-indexed
  const pageIndices = pageNumbers.map((pageNum) => pageNum - 1);
  const pages = await newPdf.copyPages(sourcePdf, pageIndices);
  pages.forEach((page) => newPdf.addPage(page));

  return newPdf.save();
}

/**
 * Options for adding text to a PDF
 */
export interface AddTextOptions {
  page: number;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

/**
 * Adds text to a specific page of a PDF
 * @param file - The PDF file
 * @param text - The text to add
 * @param options - Position and styling options
 * @returns The modified PDF as a Uint8Array
 */
export async function addTextToPDF(
  file: File,
  text: string,
  options: AddTextOptions
): Promise<Uint8Array> {
  const { page: pageNumber, x, y, fontSize, color } = options;

  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  const pageCount = pdf.getPageCount();

  if (pageNumber < 1 || pageNumber > pageCount) {
    throw new Error(`Invalid page number: ${pageNumber}. PDF has ${pageCount} pages.`);
  }

  const page = pdf.getPage(pageNumber - 1);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { r, g, b } = parseColor(color);

  // Handle multi-line text by drawing each line separately
  const lines = text.split('\n');
  const lineHeight = fontSize * 1.2; // Match the editor's lineHeight of 1.2

  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - (index * lineHeight),
      size: fontSize,
      font,
      color: rgb(r, g, b),
    });
  });

  return pdf.save();
}

/**
 * Gets the total number of pages in a PDF
 * @param file - The PDF file
 * @returns The number of pages
 */
export async function getPDFPageCount(file: File): Promise<number> {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await PDFDocument.load(arrayBuffer);
  return pdf.getPageCount();
}
