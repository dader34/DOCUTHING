import { useCallback } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface FileDropzoneProps {
  accept?: Accept;
  multiple?: boolean;
  maxFiles?: number;
  onFilesSelected: (files: File[]) => void;
}

export default function FileDropzone({
  accept = { 'application/pdf': ['.pdf'] },
  multiple = true,
  maxFiles = 10,
  onFilesSelected,
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles,
  });

  const acceptedTypes = Object.values(accept)
    .flat()
    .map((ext) => ext.replace('.', '').toUpperCase())
    .join(', ');

  return (
    <div
      {...getRootProps()}
      className={`
        brutal-dropzone cursor-pointer p-8 md:p-12
        ${isDragActive && !isDragReject ? 'active' : ''}
        ${isDragReject ? '!bg-red-500 !border-red-900' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div
          className={`
            p-4 border-4 border-black
            ${isDragActive && !isDragReject ? 'bg-black' : 'bg-white'}
            ${isDragReject ? 'bg-red-500' : ''}
          `}
        >
          <Upload
            className={`
              w-10 h-10 md:w-12 md:h-12
              ${isDragActive && !isDragReject ? 'text-white' : 'text-black'}
              ${isDragReject ? 'text-white' : ''}
            `}
          />
        </div>

        <div className="space-y-2">
          <p
            className={`
              text-xl md:text-2xl font-bold uppercase tracking-wider
              ${isDragReject ? 'text-red-900' : 'text-black'}
            `}
          >
            {isDragActive && !isDragReject
              ? 'DROP FILES HERE'
              : isDragReject
              ? 'FILE TYPE NOT ACCEPTED'
              : 'DRAG & DROP FILES'}
          </p>

          <p className="text-black font-mono text-sm">
            OR <span className="underline underline-offset-4 decoration-2 font-bold">CLICK TO BROWSE</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="brutal-tag">{acceptedTypes}</span>
          {maxFiles > 1 && (
            <span className="brutal-tag">MAX {maxFiles} FILES</span>
          )}
        </div>
      </div>
    </div>
  );
}
