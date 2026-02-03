import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button, Alert, Card, CardBody } from '@dader34/stylekit-ui';
import { addTextToPDF, type AddTextOptions } from '../utils/pdfUtils';
import { pdfToImagesWithDimensions, extractPdfTextContent, type PageDimensions, type PageTextContent } from '../utils/imageUtils';
import { downloadFile } from '../utils/fileUtils';
import {
  Type,
  Download,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ArrowLeft,
  Plus,
  Move,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo2,
  Redo2,
} from 'lucide-react';

interface TextAnnotation {
  id: string;
  text: string;
  x: number; // percentage (0-100)
  y: number; // percentage (0-100)
  page: number;
  fontSize: number;
  color: string;
  width: number; // percentage
  height: number; // percentage
}

type Tool = 'select' | 'text';
type ResizeCorner = 'se' | 'sw' | 'ne' | 'nw' | null;

const COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
];

const FONT_SIZES = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200, 300];

const MAX_HISTORY = 50;

// Snapping configuration
const SNAP_THRESHOLD = 1; // percentage threshold for snapping

const STORAGE_KEY = 'addTextToPDF_session';

interface SavedSession {
  fileName: string;
  fileData: string; // base64 encoded PDF
  annotations: TextAnnotation[];
  currentPage: number;
  fontSize: number;
  color: string;
  zoom: number;
}

interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number; // percentage
}

export default function AddTextToPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [pageDimensions, setPageDimensions] = useState<PageDimensions[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false); // Whether text editing mode is active
  const [activeTool, setActiveTool] = useState<Tool>('text');
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState('#000000');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  // Undo/Redo history
  const [history, setHistory] = useState<TextAnnotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<ResizeCorner>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, annX: 0, annY: 0 });
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [clipboard, setClipboard] = useState<TextAnnotation | null>(null);
  const [pdfTextContent, setPdfTextContent] = useState<PageTextContent[]>([]);

  const pageRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef<HTMLTextAreaElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const isUndoingRef = useRef(false);
  const hasRestoredSession = useRef(false);
  const isRestoringSession = useRef(false);

  const fileName = file?.name || 'document.pdf';

  // Get snap points from other annotations on the current page
  const getSnapPoints = useCallback((excludeId: string) => {
    const otherAnnotations = annotations.filter(
      (a) => a.id !== excludeId && a.page === currentPage + 1
    );

    const horizontalPoints: number[] = [];
    const verticalPoints: number[] = [];

    // Add page center and edges
    verticalPoints.push(0, 50, 100);
    horizontalPoints.push(0, 50, 100);

    // Add points from other annotations
    otherAnnotations.forEach((ann) => {
      // Left edge, center, right edge
      verticalPoints.push(ann.x, ann.x + ann.width / 2, ann.x + ann.width);
      // Top edge, center, bottom edge
      horizontalPoints.push(ann.y, ann.y + ann.height / 2, ann.y + ann.height);
    });

    return { horizontalPoints, verticalPoints };
  }, [annotations, currentPage]);

  // Apply snapping to a position
  const applySnapping = useCallback((
    x: number,
    y: number,
    width: number,
    height: number,
    excludeId: string
  ): { x: number; y: number; guides: SnapGuide[] } => {
    const { horizontalPoints, verticalPoints } = getSnapPoints(excludeId);
    const guides: SnapGuide[] = [];

    let snappedX = x;
    let snappedY = y;

    // Check vertical snapping (left edge, center, right edge of dragged box)
    const xPoints = [x, x + width / 2, x + width];
    for (const xPoint of xPoints) {
      for (const snapPoint of verticalPoints) {
        if (Math.abs(xPoint - snapPoint) < SNAP_THRESHOLD) {
          snappedX = x + (snapPoint - xPoint);
          guides.push({ type: 'vertical', position: snapPoint });
          break;
        }
      }
    }

    // Check horizontal snapping (top edge, center, bottom edge of dragged box)
    const yPoints = [y, y + height / 2, y + height];
    for (const yPoint of yPoints) {
      for (const snapPoint of horizontalPoints) {
        if (Math.abs(yPoint - snapPoint) < SNAP_THRESHOLD) {
          snappedY = y + (snapPoint - yPoint);
          guides.push({ type: 'horizontal', position: snapPoint });
          break;
        }
      }
    }

    return { x: snappedX, y: snappedY, guides };
  }, [getSnapPoints]);

  // Push state to history
  const pushToHistory = useCallback((newAnnotations: TextAnnotation[]) => {
    if (isUndoingRef.current) return;

    setHistory((prev) => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new state
      newHistory.push(newAnnotations);
      // Limit history size
      if (newHistory.length > MAX_HISTORY) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoingRef.current = true;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
      setSelectedId(null);
      setTimeout(() => { isUndoingRef.current = false; }, 0);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoingRef.current = true;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setAnnotations(history[newIndex]);
      setSelectedId(null);
      setTimeout(() => { isUndoingRef.current = false; }, 0);
    }
  }, [historyIndex, history]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (selectedId && isEditing && editingRef.current) {
      editingRef.current.focus();
    }
  }, [selectedId, isEditing]);

  // Restore session from localStorage on mount
  useEffect(() => {
    if (hasRestoredSession.current) return;
    hasRestoredSession.current = true;

    const savedData = localStorage.getItem(STORAGE_KEY);
    if (!savedData) return;

    try {
      const session: SavedSession = JSON.parse(savedData);
      isRestoringSession.current = true;

      // Convert base64 back to File
      const byteCharacters = atob(session.fileData);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const restoredFile = new File([byteArray], session.fileName, { type: 'application/pdf' });

      setFile(restoredFile);
      setAnnotations(session.annotations);
      setCurrentPage(session.currentPage);
      setFontSize(session.fontSize);
      setColor(session.color);
      setZoom(session.zoom);
      setHistory([session.annotations]);
      setHistoryIndex(0);
      setIsLoading(true);

      // Load the PDF pages and text content
      pdfToImagesWithDimensions(restoredFile)
        .then(async (result) => {
          setPages(result.images);
          setPageDimensions(result.pageDimensions);
          setIsLoading(false);

          // Extract embedded text (only works for text-based PDFs, not scanned)
          const textContent = await extractPdfTextContent(restoredFile);
          setPdfTextContent(textContent);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to restore PDF');
          setFile(null);
          localStorage.removeItem(STORAGE_KEY);
        })
        .finally(() => {
          setIsLoading(false);
          isRestoringSession.current = false;
        });
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Save session to localStorage when state changes
  useEffect(() => {
    if (!file || isRestoringSession.current || isLoading) return;

    const saveSession = async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const base64 = btoa(
          new Uint8Array(arrayBuffer).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ''
          )
        );

        const session: SavedSession = {
          fileName: file.name,
          fileData: base64,
          annotations,
          currentPage,
          fontSize,
          color,
          zoom,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Silently fail if storage is full or unavailable
      }
    };

    saveSession();
  }, [file, annotations, currentPage, fontSize, color, zoom, isLoading]);

  // Clear session when file is removed
  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleFileSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    const selectedFile = files[0];
    setFile(selectedFile);
    setError(null);
    setAnnotations([]);
    setCurrentPage(0);
    setSelectedId(null);
    setIsLoading(true);
    setHistory([[]]);
    setHistoryIndex(0);

    try {
      // First load the page images
      const result = await pdfToImagesWithDimensions(selectedFile);
      setPages(result.images);
      setPageDimensions(result.pageDimensions);
      setIsLoading(false);

      // Extract embedded text (only works for text-based PDFs, not scanned)
      const textContent = await extractPdfTextContent(selectedFile);
      setPdfTextContent(textContent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getRelativePosition = (e: React.MouseEvent | MouseEvent) => {
    if (!pageRef.current) return { x: 0, y: 0 };
    const rect = pageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't create new text if clicking on an existing annotation
    if ((e.target as HTMLElement).closest('.text-annotation')) {
      return;
    }

    if (activeTool === 'text') {
      const { x, y } = getRelativePosition(e);

      const newAnnotation: TextAnnotation = {
        id: `${Date.now()}-${Math.random()}`,
        text: '',
        x,
        y,
        page: currentPage + 1,
        fontSize,
        color,
        width: 20,
        height: 8,
      };

      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      pushToHistory(newAnnotations);
      setSelectedId(newAnnotation.id);
      setIsEditing(true); // Enter edit mode immediately for new text boxes
      setActiveTool('select');
    } else {
      // Clicking on empty space deselects
      handleDeselect();
    }
  };

  const handleAnnotationClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedId !== id) {
      // First click selects the box (not editing mode)
      setSelectedId(id);
      setIsEditing(false);
      setActiveTool('select');
    }
  };

  const handleAnnotationDoubleClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedId(id);
    setIsEditing(true);
    setActiveTool('select');
  };

  const handleAnnotationMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedId !== id) {
      setSelectedId(id);
      setActiveTool('select');
      return;
    }

    // Start dragging
    const annotation = annotations.find((a) => a.id === id);
    if (!annotation || !pageRef.current) return;

    const { x, y } = getRelativePosition(e);
    setDragOffset({ x: x - annotation.x, y: y - annotation.y });
    setIsDragging(true);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, corner: ResizeCorner) => {
    e.stopPropagation();
    const annotation = annotations.find((a) => a.id === selectedId);
    if (!annotation) return;

    const { x, y } = getRelativePosition(e);
    setResizeStart({
      x,
      y,
      width: annotation.width,
      height: annotation.height,
      annX: annotation.x,
      annY: annotation.y
    });
    setResizeCorner(corner);
  };

  // Close font dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setShowFontDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!selectedId) return;

      if (isDragging) {
        const { x, y } = getRelativePosition(e);
        const ann = annotations.find((a) => a.id === selectedId);
        if (!ann) return;

        const rawX = Math.max(0, Math.min(95, x - dragOffset.x));
        const rawY = Math.max(0, Math.min(95, y - dragOffset.y));

        // Apply snapping
        const { x: snappedX, y: snappedY, guides } = applySnapping(
          rawX,
          rawY,
          ann.width,
          ann.height,
          selectedId
        );

        setSnapGuides(guides);
        setAnnotations((prev) =>
          prev.map((a) =>
            a.id === selectedId
              ? { ...a, x: snappedX, y: snappedY }
              : a
          )
        );
      }

      if (resizeCorner) {
        const { x, y } = getRelativePosition(e);
        const dx = x - resizeStart.x;
        const dy = y - resizeStart.y;

        setAnnotations((prev) =>
          prev.map((ann) => {
            if (ann.id !== selectedId) return ann;

            let newX = resizeStart.annX;
            let newY = resizeStart.annY;
            let newWidth = resizeStart.width;
            let newHeight = resizeStart.height;

            // Handle each corner (minimum width 2%, minimum height 1%)
            const minWidth = 2;
            const minHeight = 1;

            if (resizeCorner === 'se') {
              // Southeast: expand right and down
              newWidth = Math.max(minWidth, resizeStart.width + dx);
              newHeight = Math.max(minHeight, resizeStart.height + dy);
            } else if (resizeCorner === 'sw') {
              // Southwest: move left edge, expand down
              const widthDelta = -dx;
              newX = resizeStart.annX + dx;
              newWidth = Math.max(minWidth, resizeStart.width + widthDelta);
              newHeight = Math.max(minHeight, resizeStart.height + dy);
              // Prevent negative position
              if (newX < 0) {
                newWidth = newWidth + newX;
                newX = 0;
              }
            } else if (resizeCorner === 'ne') {
              // Northeast: expand right, move top edge
              const heightDelta = -dy;
              newY = resizeStart.annY + dy;
              newWidth = Math.max(minWidth, resizeStart.width + dx);
              newHeight = Math.max(minHeight, resizeStart.height + heightDelta);
              // Prevent negative position
              if (newY < 0) {
                newHeight = newHeight + newY;
                newY = 0;
              }
            } else if (resizeCorner === 'nw') {
              // Northwest: move both left and top edges
              const widthDelta = -dx;
              const heightDelta = -dy;
              newX = resizeStart.annX + dx;
              newY = resizeStart.annY + dy;
              newWidth = Math.max(minWidth, resizeStart.width + widthDelta);
              newHeight = Math.max(minHeight, resizeStart.height + heightDelta);
              // Prevent negative positions
              if (newX < 0) {
                newWidth = newWidth + newX;
                newX = 0;
              }
              if (newY < 0) {
                newHeight = newHeight + newY;
                newY = 0;
              }
            }

            return { ...ann, x: newX, y: newY, width: newWidth, height: newHeight };
          })
        );
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setResizeCorner(null);
      setSnapGuides([]);
    };

    if (isDragging || resizeCorner) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, resizeCorner, selectedId, dragOffset, resizeStart, annotations, applySnapping]);

  const updateAnnotationText = (id: string, text: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, text } : ann))
    );
    // Don't push to history on every keystroke - will be pushed on blur/deselect
  };

  const updateAnnotationStyle = (id: string, updates: Partial<TextAnnotation>) => {
    const newAnnotations = annotations.map((ann) =>
      ann.id === id ? { ...ann, ...updates } : ann
    );
    setAnnotations(newAnnotations);
    pushToHistory(newAnnotations);

    // Remember the last used font size and color for new text boxes
    if (updates.fontSize !== undefined) {
      setFontSize(updates.fontSize);
    }
    if (updates.color !== undefined) {
      setColor(updates.color);
    }
  };

  const removeAnnotation = (id: string) => {
    const newAnnotations = annotations.filter((ann) => ann.id !== id);
    setAnnotations(newAnnotations);
    pushToHistory(newAnnotations);
    if (selectedId === id) setSelectedId(null);
  };

  // Push to history when deselecting (captures text changes)
  const handleDeselect = () => {
    if (selectedId) {
      pushToHistory(annotations);
    }
    setSelectedId(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!file) {
      return;
    }

    const nonEmptyAnnotations = annotations.filter((a) => a.text.trim());
    if (nonEmptyAnnotations.length === 0) {
      setError('Please add at least one text annotation');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      let pdfData = file;

      for (const annotation of nonEmptyAnnotations) {
        // Get actual page dimensions (0-indexed)
        const pageIndex = annotation.page - 1;
        const dims = pageDimensions[pageIndex] || { width: 595.276, height: 841.890 };

        // Convert percentage to PDF points using actual page dimensions
        const pdfX = (annotation.x / 100) * dims.width;

        // PDF coordinate system has origin at bottom-left, so flip Y
        // The annotation.y is the TOP of the text box in screen coords
        // PDF drawText positions at the baseline (bottom of text)
        // Editor shows fontSize in CSS pixels on a 2x scaled image
        // The preview image is 2x scale, so we need to compensate
        const pdfFontSize = annotation.fontSize * 1.4;
        const screenY = (annotation.y / 100) * dims.height;
        // Subtract extra offset to account for text baseline positioning
        const pdfY = dims.height - screenY - pdfFontSize;

        const options: AddTextOptions = {
          page: annotation.page,
          x: pdfX,
          y: pdfY,
          fontSize: pdfFontSize,
          color: annotation.color,
        };

        const pdfBytes = await addTextToPDF(pdfData, annotation.text, options);
        pdfData = new File([pdfBytes as BlobPart], fileName, { type: 'application/pdf' });
      }

      const arrayBuffer = await pdfData.arrayBuffer();
      downloadFile(new Uint8Array(arrayBuffer), fileName.replace('.pdf', '_annotated.pdf'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add text to PDF');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetFile = () => {
    setFile(null);
    setPages([]);
    setPageDimensions([]);
    setAnnotations([]);
    setCurrentPage(0);
    setSelectedId(null);
    setError(null);
    setZoom(100);
    setHistory([[]]);
    setHistoryIndex(0);
    clearSession();
  };

  const zoomIn = () => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const zoomOut = () => {
    const currentIndex = ZOOM_LEVELS.findIndex((z) => z >= zoom);
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1]);
    } else if (currentIndex === 0 && zoom > ZOOM_LEVELS[0]) {
      setZoom(ZOOM_LEVELS[0]);
    }
  };

  const resetZoom = () => {
    setZoom(100);
  };

  // Copy the selected annotation to clipboard
  const copyAnnotation = useCallback(() => {
    if (!selectedId) return;
    const annotation = annotations.find((a) => a.id === selectedId);
    if (annotation) {
      setClipboard({ ...annotation });
    }
  }, [selectedId, annotations]);

  // Paste the annotation from clipboard
  const pasteAnnotation = useCallback(() => {
    if (!clipboard) return;

    const OFFSET = 2; // percentage offset for pasted item

    const newAnnotation: TextAnnotation = {
      ...clipboard,
      id: `${Date.now()}-${Math.random()}`,
      x: Math.min(clipboard.x + OFFSET, 100 - clipboard.width),
      y: Math.min(clipboard.y + OFFSET, 100 - clipboard.height),
      page: currentPage + 1, // Paste on current page
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    pushToHistory(newAnnotations);
    setSelectedId(newAnnotation.id);
    setActiveTool('select');
  }, [clipboard, annotations, currentPage, pushToHistory]);

  const currentPageAnnotations = annotations.filter(
    (ann) => ann.page === currentPage + 1
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditingText = document.activeElement?.tagName === 'TEXTAREA';

      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      // Copy: Ctrl/Cmd + C (only when not editing text)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isEditingText) {
        if (selectedId) {
          e.preventDefault();
          copyAnnotation();
        }
        return;
      }
      // Paste: Ctrl/Cmd + V (only when not editing text)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditingText) {
        e.preventDefault();
        e.stopPropagation();
        if (clipboard) {
          pasteAnnotation();
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not editing text
        if (selectedId && !isEditingText) {
          removeAnnotation(selectedId);
        }
      }
      if (e.key === 'Escape') {
        handleDeselect();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, undo, redo, copyAnnotation, pasteAnnotation]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-bold uppercase tracking-wider text-sm mb-8 no-underline hover:opacity-70"
          >
            <ArrowLeft className="w-4 h-4" />
            BACK TO HOME
          </Link>

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-6 mb-4">
              <div className="w-16 h-16 bg-orange-500 border-4 border-current flex items-center justify-center">
                <Type className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter">
                  ADD TEXT TO PDF
                </h1>
                <p className="opacity-70 font-mono mt-1 text-sm">
                  CLICK TO ADD TEXT • DRAG TO MOVE • RESIZE WITH HANDLES
                </p>
              </div>
            </div>
          </div>

          {!file && pages.length === 0 ? (
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
              {isLoading ? (
                <LoadingSpinner message="LOADING PDF..." />
              ) : (
                <div className="space-y-4">
                  {/* Main Editor Area */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    {/* PDF Preview */}
                    <div className="lg:col-span-3 order-2 lg:order-1">
                      <Card variant="outlined">
                        <CardBody className="p-0">
                          {/* Toolbar - above editor */}
                          <div className="flex flex-wrap items-center gap-3 p-3 border-b-4 border-current">
                            {/* Tool Selection */}
                            <div className="flex border-4 border-current">
                              <button
                                onClick={() => setActiveTool('select')}
                                className={`p-2 flex items-center gap-2 font-bold text-sm transition-colors ${
                                  activeTool === 'select'
                                    ? 'bg-black text-white'
                                    : 'hover:bg-gray-100'
                                }`}
                                title="Select Tool (V)"
                              >
                                <MousePointer className="w-4 h-4" />
                                <span className="hidden sm:inline">SELECT</span>
                              </button>
                              <button
                                onClick={() => setActiveTool('text')}
                                className={`p-2 flex items-center gap-2 font-bold text-sm border-l-4 border-current transition-colors ${
                                  activeTool === 'text'
                                    ? 'bg-black text-white'
                                    : 'hover:bg-gray-100'
                                }`}
                                title="Text Tool (T)"
                              >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">ADD TEXT</span>
                              </button>
                            </div>

                            {/* Undo/Redo */}
                            <div className="flex border-4 border-current">
                              <button
                                onClick={undo}
                                disabled={!canUndo}
                                className="p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Undo (Ctrl+Z)"
                              >
                                <Undo2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={redo}
                                disabled={!canRedo}
                                className="p-2 border-l-4 border-current hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Redo (Ctrl+Shift+Z)"
                              >
                                <Redo2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex-1" />

                            {/* Delete selected */}
                            {selectedId && (
                              <button
                                onClick={() => removeAnnotation(selectedId)}
                                className="p-2 border-4 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                title="Delete (Del)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}

                            {/* File info & close */}
                            <div className="flex items-center gap-2 pl-2 border-l-4 border-current border-opacity-20">
                              <FileText className="w-4 h-4 opacity-50" />
                              <span className="font-mono text-xs opacity-70 max-w-[100px] truncate">
                                {fileName}
                              </span>
                              <button
                                onClick={resetFile}
                                className="p-1 hover:bg-gray-200 transition-colors"
                                title="Close file"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Page Navigation & Zoom */}
                          <div className="flex items-center justify-between p-3 border-b-4 border-current gap-4">
                            {/* Page controls */}
                            <div className="flex items-center gap-2">
                              <Button
                                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                variant="outline"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </Button>
                              <span className="font-bold uppercase tracking-wider text-sm min-w-[100px] text-center">
                                PAGE {currentPage + 1} / {pages.length}
                              </span>
                              <Button
                                onClick={() =>
                                  setCurrentPage((p) => Math.min(pages.length - 1, p + 1))
                                }
                                disabled={currentPage === pages.length - 1}
                                variant="outline"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>

                            {/* Zoom controls */}
                            <div className="flex items-center gap-1 border-4 border-current">
                              <button
                                onClick={zoomOut}
                                disabled={zoom <= ZOOM_LEVELS[0]}
                                className="p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Zoom out"
                              >
                                <ZoomOut className="w-4 h-4" />
                              </button>
                              <button
                                onClick={resetZoom}
                                className="px-3 py-1 font-bold text-sm hover:bg-[#ffff00] min-w-[60px]"
                                title="Reset zoom"
                              >
                                {zoom}%
                              </button>
                              <button
                                onClick={zoomIn}
                                disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
                                className="p-2 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Zoom in"
                              >
                                <ZoomIn className="w-4 h-4" />
                              </button>
                              <button
                                onClick={resetZoom}
                                className="p-2 hover:bg-gray-100 border-l-2 border-current"
                                title="Fit to window (100%)"
                              >
                                <Maximize className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Page Content */}
                          <div className="p-4 bg-gray-200 min-h-[500px] overflow-auto flex items-start justify-center">
                            <div
                              ref={pageRef}
                              onClick={handlePageClick}
                              className={`relative bg-white border-4 border-black shadow-[6px_6px_0_0_#000] select-none origin-top ${
                                activeTool === 'text' ? 'cursor-crosshair' : 'cursor-default'
                              }`}
                              style={{
                                transform: `scale(${zoom / 100})`,
                                transformOrigin: 'top center',
                              }}
                            >
                              <img
                                src={pages[currentPage]}
                                alt={`Page ${currentPage + 1}`}
                                className="w-auto"
                                style={{ maxHeight: '70vh' }}
                                draggable={false}
                              />

                              {/* PDF Text Layer - allows selecting/copying original text */}
                              {pdfTextContent[currentPage] && pdfTextContent[currentPage].items.length > 0 && (
                                <div
                                  className="absolute inset-0 overflow-hidden"
                                  style={{
                                    zIndex: selectedId ? 1 : 15,
                                    pointerEvents: selectedId ? 'none' : 'auto',
                                  }}
                                >
                                  {pdfTextContent[currentPage].items.map((item, index) => (
                                    <span
                                      key={`text-${index}`}
                                      className="absolute cursor-text"
                                      style={{
                                        left: `${item.x}%`,
                                        top: `${item.y}%`,
                                        fontSize: `${item.fontSize}px`,
                                        lineHeight: 1.2,
                                        color: 'transparent',
                                        whiteSpace: 'pre-wrap',
                                        userSelect: 'text',
                                        WebkitUserSelect: 'text',
                                      }}
                                    >
                                      {item.text}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Snap guide lines */}
                              {snapGuides.map((guide, index) => (
                                <div
                                  key={`guide-${index}`}
                                  className="absolute pointer-events-none z-30"
                                  style={
                                    guide.type === 'vertical'
                                      ? {
                                          left: `${guide.position}%`,
                                          top: 0,
                                          bottom: 0,
                                          width: '1px',
                                          backgroundColor: '#f97316',
                                        }
                                      : {
                                          top: `${guide.position}%`,
                                          left: 0,
                                          right: 0,
                                          height: '1px',
                                          backgroundColor: '#f97316',
                                        }
                                  }
                                />
                              ))}

                              {/* Render annotations */}
                              {currentPageAnnotations.map((ann) => (
                                <div
                                  key={ann.id}
                                  className={`text-annotation absolute group ${
                                    selectedId === ann.id ? 'z-20' : 'z-10'
                                  }`}
                                  style={{
                                    left: `${ann.x}%`,
                                    top: `${ann.y}%`,
                                    width: `${ann.width}%`,
                                    height: selectedId === ann.id ? `${ann.height}%` : 'auto',
                                    minWidth: '60px',
                                    minHeight: '24px',
                                  }}
                                  onClick={(e) => handleAnnotationClick(e, ann.id)}
                                  onDoubleClick={(e) => handleAnnotationDoubleClick(e, ann.id)}
                                  onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id)}
                                >
                                  {selectedId === ann.id ? (
                                    // Selected mode - use outline instead of border to avoid shifting content
                                    <div
                                      className="relative w-full h-full"
                                      style={{
                                        outline: isEditing ? '2px dashed #3b82f6' : '2px solid #3b82f6',
                                        outlineOffset: '-2px',
                                        background: 'rgba(59, 130, 246, 0.05)',
                                      }}
                                    >
                                      {/* Toolbar */}
                                      <div
                                        className="absolute -top-7 left-0 flex items-center gap-1 bg-blue-500 text-white text-xs font-bold"
                                        onClick={(e) => e.stopPropagation()}
                                        onMouseDown={(e) => e.stopPropagation()}
                                      >
                                        {/* Move handle */}
                                        <div
                                          className="px-2 py-1 cursor-move flex items-center gap-1 hover:bg-blue-600"
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            handleAnnotationMouseDown(e, ann.id);
                                          }}
                                        >
                                          <Move className="w-3 h-3" />
                                        </div>

                                        {/* Font size dropdown */}
                                        <div className="relative" ref={fontDropdownRef}>
                                          <button
                                            className="px-2 py-1 hover:bg-blue-600 flex items-center gap-1"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowFontDropdown(!showFontDropdown);
                                            }}
                                          >
                                            {ann.fontSize}px
                                            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                            </svg>
                                          </button>
                                          {showFontDropdown && (
                                            <div className="absolute top-full left-0 mt-1 bg-white border-2 border-black shadow-[4px_4px_0_0_#000] max-h-48 overflow-y-auto z-50">
                                              {FONT_SIZES.map((size) => (
                                                <button
                                                  key={size}
                                                  className={`block w-full px-3 py-1 text-left text-black hover:bg-[#ffff00] ${
                                                    ann.fontSize === size ? 'bg-gray-200 font-bold' : ''
                                                  }`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateAnnotationStyle(ann.id, { fontSize: size });
                                                    setShowFontDropdown(false);
                                                  }}
                                                >
                                                  {size}px
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>

                                        {/* Color swatches */}
                                        <div className="flex items-center px-1 gap-0.5">
                                          {COLORS.map((c) => (
                                            <button
                                              key={c.value}
                                              className={`w-4 h-4 border ${
                                                ann.color === c.value ? 'border-white border-2' : 'border-blue-400'
                                              }`}
                                              style={{ backgroundColor: c.value }}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateAnnotationStyle(ann.id, { color: c.value });
                                              }}
                                              title={c.name}
                                            />
                                          ))}
                                        </div>

                                        {/* Delete button */}
                                        <button
                                          className="px-2 py-1 bg-red-500 hover:bg-red-600"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeAnnotation(ann.id);
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>

                                      {isEditing ? (
                                        // Text editing mode
                                        <textarea
                                          ref={editingRef}
                                          value={ann.text}
                                          onChange={(e) => updateAnnotationText(ann.id, e.target.value)}
                                          placeholder="Type here..."
                                          className="w-full h-full bg-transparent resize-none focus:outline-none overflow-hidden"
                                          style={{
                                            fontSize: `${ann.fontSize}px`,
                                            color: ann.color,
                                            fontFamily: 'Helvetica, Arial, sans-serif',
                                            lineHeight: 1.2,
                                            scrollbarWidth: 'none',
                                            minHeight: '100%',
                                            padding: 0,
                                            margin: 0,
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          onMouseDown={(e) => e.stopPropagation()}
                                        />
                                      ) : (
                                        // Selected but not editing - show text and hint
                                        <div
                                          className="w-full h-full"
                                          style={{
                                            fontSize: `${ann.fontSize}px`,
                                            color: ann.color,
                                            fontFamily: 'Helvetica, Arial, sans-serif',
                                            lineHeight: 1.2,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                          }}
                                        >
                                          {ann.text || (
                                            <span className="opacity-30 italic">Double-click to edit</span>
                                          )}
                                        </div>
                                      )}

                                      {/* Corner resize handles */}
                                      {/* NW */}
                                      <div
                                        className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-blue-500 cursor-nw-resize border border-white"
                                        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                                      />
                                      {/* NE */}
                                      <div
                                        className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-blue-500 cursor-ne-resize border border-white"
                                        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                                      />
                                      {/* SW */}
                                      <div
                                        className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-blue-500 cursor-sw-resize border border-white"
                                        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                                      />
                                      {/* SE */}
                                      <div
                                        className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-blue-500 cursor-se-resize border border-white"
                                        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                                      />
                                    </div>
                                  ) : (
                                    // Display mode (not selected)
                                    <div
                                      className="cursor-pointer hover:outline hover:outline-2 hover:outline-blue-400 hover:outline-dashed"
                                      style={{
                                        fontSize: `${ann.fontSize}px`,
                                        color: ann.color,
                                        fontFamily: 'Helvetica, Arial, sans-serif',
                                        lineHeight: 1.2,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      {ann.text || (
                                        <span className="opacity-30 italic">Empty text</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}

                              {/* Crosshair cursor indicator */}
                              {activeTool === 'text' && (
                                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100">
                                  <div className="bg-black text-white px-2 py-1 text-xs font-bold">
                                    CLICK TO ADD TEXT
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 order-1 lg:order-2 space-y-4">
                      {/* Instructions */}
                      <Card variant="outlined">
                        <CardBody>
                          <h3 className="font-bold uppercase tracking-wider text-sm mb-3">
                            HOW TO USE
                          </h3>
                          <ul className="space-y-2 text-xs font-mono opacity-70">
                            <li className="flex gap-2">
                              <span className="font-bold">1.</span>
                              <span>Click "ADD TEXT" then click on PDF</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="font-bold">2.</span>
                              <span>Type your text in the box</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="font-bold">3.</span>
                              <span>Drag to move, use handle to resize</span>
                            </li>
                            <li className="flex gap-2">
                              <span className="font-bold">4.</span>
                              <span>Press Del to delete selected</span>
                            </li>
                          </ul>
                        </CardBody>
                      </Card>

                      {/* Annotations List */}
                      <Card variant="outlined">
                        <CardBody>
                          <h3 className="font-bold uppercase tracking-wider text-sm mb-3">
                            TEXT BOXES ({annotations.length})
                          </h3>
                          {annotations.length === 0 ? (
                            <p className="text-xs font-mono opacity-50">
                              No text added yet
                            </p>
                          ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                              {annotations.map((ann) => (
                                <div
                                  key={ann.id}
                                  onClick={() => {
                                    setCurrentPage(ann.page - 1);
                                    setSelectedId(ann.id);
                                  }}
                                  className={`p-2 border-2 cursor-pointer transition-colors ${
                                    selectedId === ann.id
                                      ? 'border-blue-500 bg-blue-50'
                                      : 'border-current hover:bg-gray-50'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div
                                        className="w-3 h-3 flex-shrink-0 border border-current"
                                        style={{ backgroundColor: ann.color }}
                                      />
                                      <span className="text-xs font-mono truncate">
                                        {ann.text || '(empty)'}
                                      </span>
                                    </div>
                                    <span className="text-xs opacity-50 ml-2">
                                      P{ann.page}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardBody>
                      </Card>

                      {/* Save Button */}
                      <Button
                        onClick={handleSave}
                        disabled={isProcessing || annotations.filter((a) => a.text.trim()).length === 0 || !file}
                        variant="primary"
                        className="w-full"
                      >
                        {isProcessing ? (
                          <LoadingSpinner message="SAVING..." />
                        ) : (
                          <span className="inline-flex items-center">
                            <Download className="w-5 h-5 mr-2" />
                            SAVE & DOWNLOAD
                          </span>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mt-4">
                  <Alert status="error">{error}</Alert>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
