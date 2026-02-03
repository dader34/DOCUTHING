/**
 * Downloads data as a file to the user's device
 * @param data - The file data as Uint8Array or Blob
 * @param filename - The name for the downloaded file
 */
export function downloadFile(data: Uint8Array | Blob, filename: string): void {
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Converts a File object to an ArrayBuffer
 * @param file - The file to convert
 * @returns Promise resolving to the ArrayBuffer
 */
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${reader.error?.message || 'Unknown error'}`));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Formats a byte size into a human-readable string
 * @param bytes - The size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) {
    throw new Error('Bytes cannot be negative');
  }

  if (bytes === 0) {
    return '0 Bytes';
  }

  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const base = 1024;
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
  const clampedIndex = Math.min(unitIndex, units.length - 1);

  const value = bytes / Math.pow(base, clampedIndex);

  // Use appropriate decimal places
  const formatted = value < 10 ? value.toFixed(2) : value < 100 ? value.toFixed(1) : value.toFixed(0);

  return `${formatted} ${units[clampedIndex]}`;
}

/**
 * Extracts the file extension from a filename
 * @param filename - The filename to extract extension from
 * @returns The file extension (without the dot) or empty string if none
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');

  // No extension found, or dot is at the start (hidden file)
  if (lastDotIndex === -1 || lastDotIndex === 0) {
    return '';
  }

  return filename.slice(lastDotIndex + 1).toLowerCase();
}

/**
 * Generates a unique identifier string
 * Uses a combination of timestamp and random values for uniqueness
 * @returns A unique ID string
 */
export function generateUniqueId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  const randomPart2 = Math.random().toString(36).substring(2, 5);

  return `${timestamp}-${randomPart}-${randomPart2}`;
}
