import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import FileDropzone from '../components/FileDropzone';
import LoadingSpinner from '../components/LoadingSpinner';
import { Alert } from '@dader34/stylekit-ui';
import { addTextToPDF, getPdfPageInfo, type AddTextOptions, type PageInfo } from '../utils/pdfUtils';
import { pdfToImagesWithDimensions, pdfToImages } from '../utils/imageUtils';
import { downloadFile } from '../utils/fileUtils';
import RotatePanel from '../components/tools/RotatePanel';
import DeletePagesPanel from '../components/tools/DeletePagesPanel';
import ReorderPanel from '../components/tools/ReorderPanel';
import ExtractPanel from '../components/tools/ExtractPanel';
import CompressPanel from '../components/tools/CompressPanel';
import SplitPanel from '../components/tools/SplitPanel';
import {
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
  PanelLeft,
  RotateCw,
  Scissors,
  FileDown,
  ListOrdered,
  FileOutput,
} from 'lucide-react';

type EditorMode = 'edit' | 'rotate' | 'delete' | 'reorder' | 'extract' | 'split' | 'compress';

// Annotation positions and sizes are stored in PDF points (1 point = 1/72 inch)
// This ensures 1:1 correspondence with the output PDF
interface TextAnnotation {
  id: string;
  text: string;
  x: number; // PDF points from left
  y: number; // PDF points from top (screen coordinates, not PDF coordinates)
  page: number;
  fontSize: number; // PDF points
  color: string;
  width: number; // PDF points
  height: number; // PDF points
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

const FONT_SIZES = [6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

const ZOOM_LEVELS = [25, 50, 75, 100, 125, 150, 200, 300];

const MAX_HISTORY = 50;

// Snapping configuration (in PDF points)
const SNAP_THRESHOLD = 5;

const STORAGE_KEY = 'addTextToPDF_session';


interface SavedSession {
  fileName: string;
  fileData: string;
  annotations: TextAnnotation[];
  currentPage: number;
  fontSize: number;
  color: string;
  zoom: number;
}

interface SnapGuide {
  type: 'vertical' | 'horizontal';
  position: number; // PDF points
}

export default function AddTextToPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [pageInfos, setPageInfos] = useState<PageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>('text');
  const [fontSize, setFontSize] = useState(16);
  const [color, setColor] = useState('#000000');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);

  const [history, setHistory] = useState<TextAnnotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<ResizeCorner>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, annX: 0, annY: 0 });
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [clipboard, setClipboard] = useState<TextAnnotation | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editorMode, setEditorMode] = useState<EditorMode>('edit');
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  const pageRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef<HTMLTextAreaElement>(null);
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const isUndoingRef = useRef(false);
  const hasRestoredSession = useRef(false);
  const isRestoringSession = useRef(false);

  const fileName = file?.name || 'document.pdf';

  // Get current page info in PDF points
  const currentPageInfo = pageInfos[currentPage] || { width: 595.276, height: 841.890, offsetX: 0, offsetY: 0, rotation: 0, effectiveWidth: 595.276, effectiveHeight: 841.890 };
  // Use effective dimensions (rotation-aware) for display since pdf.js renders with rotation applied
  const currentDims = { width: currentPageInfo.effectiveWidth, height: currentPageInfo.effectiveHeight };

  // The effective scale for display
  // At 100% zoom, we want the page to display at a reasonable size
  // The image is 2x PDF dimensions, so we scale it down and apply zoom
  const effectiveScale = zoom / 100;

  // Get snap points from other annotations on the current page (in PDF points)
  const getSnapPoints = useCallback((excludeId: string) => {
    const otherAnnotations = annotations.filter(
      (a) => a.id !== excludeId && a.page === currentPage + 1
    );

    const horizontalPoints: number[] = [];
    const verticalPoints: number[] = [];

    // Add page center and edges
    verticalPoints.push(0, currentDims.width / 2, currentDims.width);
    horizontalPoints.push(0, currentDims.height / 2, currentDims.height);

    // Add points from other annotations
    otherAnnotations.forEach((ann) => {
      verticalPoints.push(ann.x, ann.x + ann.width / 2, ann.x + ann.width);
      horizontalPoints.push(ann.y, ann.y + ann.height / 2, ann.y + ann.height);
    });

    return { horizontalPoints, verticalPoints };
  }, [annotations, currentPage, currentDims]);

  // Apply snapping to a position (all in PDF points)
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

  const pushToHistory = useCallback((newAnnotations: TextAnnotation[]) => {
    if (isUndoingRef.current) return;

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(newAnnotations);
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

      Promise.all([
        pdfToImagesWithDimensions(restoredFile),
        getPdfPageInfo(restoredFile),
        pdfToImages(restoredFile)
      ])
        .then(async ([result, pdfLibInfo, thumbs]) => {
          setPages(result.images);
          setPageInfos(pdfLibInfo);
          setThumbnails(thumbs);
          setIsLoading(false);
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

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const handleFileSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Clear any saved session
    localStorage.removeItem(STORAGE_KEY);

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
      // Get page info from pdf-lib (what we'll use for saving)
      const pdfLibInfo = await getPdfPageInfo(selectedFile);

      // Get images from pdf.js
      const result = await pdfToImagesWithDimensions(selectedFile);

      // Dimensions match - good

      setPages(result.images);

      // Generate thumbnails for tool panels
      const thumbs = await pdfToImages(selectedFile);
      setThumbnails(thumbs);

      // Use pdf-lib info for consistency with output
      setPageInfos(pdfLibInfo);
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
      setFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Convert screen coordinates to PDF points
  const getPositionInPoints = (e: React.MouseEvent | MouseEvent) => {
    if (!pageRef.current) return { x: 0, y: 0 };
    const rect = pageRef.current.getBoundingClientRect();

    // getBoundingClientRect returns the transformed size (after CSS scale)
    // We need to convert screen pixels to PDF points
    // The rect includes the border (4px), but the border is also scaled
    const borderWidth = 4 * effectiveScale;

    // Calculate position relative to content area (excluding border)
    const contentX = e.clientX - rect.left - borderWidth;
    const contentY = e.clientY - rect.top - borderWidth;

    // Convert from screen pixels to PDF points
    // rect.width includes border, so content width = rect.width - 2*borderWidth
    const contentWidth = rect.width - 2 * borderWidth;
    const contentHeight = rect.height - 2 * borderWidth;

    const x = (contentX / contentWidth) * currentDims.width;
    const y = (contentY / contentHeight) * currentDims.height;

    return {
      x: Math.max(0, Math.min(currentDims.width, x)),
      y: Math.max(0, Math.min(currentDims.height, y))
    };
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.text-annotation')) {
      return;
    }

    if (activeTool === 'text') {
      const { x, y } = getPositionInPoints(e);

      const newAnnotation: TextAnnotation = {
        id: `${Date.now()}-${Math.random()}`,
        text: '',
        x,
        y,
        page: currentPage + 1,
        fontSize,
        color,
        width: 120, // Default width in PDF points
        height: fontSize * 2, // Default height based on font size
      };

      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      pushToHistory(newAnnotations);
      setSelectedId(newAnnotation.id);
      setIsEditing(true);
      setActiveTool('select');
    } else {
      handleDeselect();
    }
  };

  const handleAnnotationClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (selectedId !== id) {
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

    const annotation = annotations.find((a) => a.id === id);
    if (!annotation || !pageRef.current) return;

    const { x, y } = getPositionInPoints(e);
    setDragOffset({ x: x - annotation.x, y: y - annotation.y });
    setIsDragging(true);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, corner: ResizeCorner) => {
    e.stopPropagation();
    const annotation = annotations.find((a) => a.id === selectedId);
    if (!annotation) return;

    const { x, y } = getPositionInPoints(e);
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
        const { x, y } = getPositionInPoints(e);
        const ann = annotations.find((a) => a.id === selectedId);
        if (!ann) return;

        const rawX = Math.max(0, Math.min(currentDims.width - ann.width, x - dragOffset.x));
        const rawY = Math.max(0, Math.min(currentDims.height - ann.height, y - dragOffset.y));

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
        const { x, y } = getPositionInPoints(e);
        const dx = x - resizeStart.x;
        const dy = y - resizeStart.y;

        setAnnotations((prev) =>
          prev.map((ann) => {
            if (ann.id !== selectedId) return ann;

            let newX = resizeStart.annX;
            let newY = resizeStart.annY;
            let newWidth = resizeStart.width;
            let newHeight = resizeStart.height;

            const minWidth = 20;
            const minHeight = 10;

            if (resizeCorner === 'se') {
              newWidth = Math.max(minWidth, resizeStart.width + dx);
              newHeight = Math.max(minHeight, resizeStart.height + dy);
            } else if (resizeCorner === 'sw') {
              const widthDelta = -dx;
              newX = resizeStart.annX + dx;
              newWidth = Math.max(minWidth, resizeStart.width + widthDelta);
              newHeight = Math.max(minHeight, resizeStart.height + dy);
              if (newX < 0) {
                newWidth = newWidth + newX;
                newX = 0;
              }
            } else if (resizeCorner === 'ne') {
              const heightDelta = -dy;
              newY = resizeStart.annY + dy;
              newWidth = Math.max(minWidth, resizeStart.width + dx);
              newHeight = Math.max(minHeight, resizeStart.height + heightDelta);
              if (newY < 0) {
                newHeight = newHeight + newY;
                newY = 0;
              }
            } else if (resizeCorner === 'nw') {
              const widthDelta = -dx;
              const heightDelta = -dy;
              newX = resizeStart.annX + dx;
              newY = resizeStart.annY + dy;
              newWidth = Math.max(minWidth, resizeStart.width + widthDelta);
              newHeight = Math.max(minHeight, resizeStart.height + heightDelta);
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
  }, [isDragging, resizeCorner, selectedId, dragOffset, resizeStart, annotations, applySnapping, currentDims, effectiveScale]);

  const updateAnnotationText = (id: string, text: string) => {
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === id ? { ...ann, text } : ann))
    );
  };

  const updateAnnotationStyle = (id: string, updates: Partial<TextAnnotation>) => {
    const newAnnotations = annotations.map((ann) =>
      ann.id === id ? { ...ann, ...updates } : ann
    );
    setAnnotations(newAnnotations);
    pushToHistory(newAnnotations);

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
        const pageIndex = annotation.page - 1;
        const info = pageInfos[pageIndex] || { width: 595.276, height: 841.890, offsetX: 0, offsetY: 0, rotation: 0, effectiveWidth: 595.276, effectiveHeight: 841.890 };

        // Annotation coordinates are in the rotated visual space (PDF points)
        // We need to transform them back to the unrotated MediaBox coordinate space
        // pdf-lib's drawText operates in the unrotated space
        const baselineOffset = annotation.fontSize * 0.8; // Approximate ascender height
        const rotation = info.rotation || 0;

        let pdfX: number;
        let pdfY: number;

        if (rotation === 0) {
          // No rotation: standard coordinate transform
          pdfX = annotation.x + info.offsetX;
          pdfY = info.height - annotation.y - baselineOffset + info.offsetY;
        } else if (rotation === 90) {
          // Page rotated 90° CW: visual (x,y) maps to unrotated space
          // Visual x -> PDF y (from bottom), visual y -> PDF x (from left)
          pdfX = annotation.y + info.offsetX;
          pdfY = annotation.x + baselineOffset + info.offsetY;
        } else if (rotation === 180) {
          // Page rotated 180°: both axes are flipped
          pdfX = info.width - annotation.x - info.offsetX;
          pdfY = annotation.y + baselineOffset + info.offsetY;
        } else if (rotation === 270) {
          // Page rotated 270° CW (90° CCW)
          pdfX = info.height - annotation.y + info.offsetX;
          pdfY = info.width - annotation.x - baselineOffset + info.offsetY;
        } else {
          // Fallback: no rotation
          pdfX = annotation.x + info.offsetX;
          pdfY = info.height - annotation.y - baselineOffset + info.offsetY;
        }


        const options: AddTextOptions = {
          page: annotation.page,
          x: pdfX,
          y: pdfY,
          fontSize: annotation.fontSize,
          color: annotation.color,
          rotation,
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
    setPageInfos([]);
    setThumbnails([]);
    setAnnotations([]);
    setCurrentPage(0);
    setSelectedId(null);
    setError(null);
    setZoom(100);
    setHistory([[]]);
    setHistoryIndex(0);
    setEditorMode('edit');
    clearSession();
  };

  // Called by tool panels when they modify the PDF (rotate, delete, reorder)
  const handleFileUpdate = useCallback(async (newFile: File) => {
    setFile(newFile);
    setIsLoading(true);
    setAnnotations([]);
    setSelectedId(null);
    setHistory([[]]);
    setHistoryIndex(0);
    setEditorMode('edit');
    try {
      const [result, pdfLibInfo, thumbs] = await Promise.all([
        pdfToImagesWithDimensions(newFile),
        getPdfPageInfo(newFile),
        pdfToImages(newFile)
      ]);
      setPages(result.images);
      setPageInfos(pdfLibInfo);
      setThumbnails(thumbs);
      setCurrentPage(prev => Math.min(prev, result.images.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reload PDF');
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  const copyAnnotation = useCallback(() => {
    if (!selectedId) return;
    const annotation = annotations.find((a) => a.id === selectedId);
    if (annotation) {
      setClipboard({ ...annotation });
    }
  }, [selectedId, annotations]);

  const pasteAnnotation = useCallback(() => {
    if (!clipboard) return;

    const OFFSET = 10; // PDF points offset

    const newAnnotation: TextAnnotation = {
      ...clipboard,
      id: `${Date.now()}-${Math.random()}`,
      x: Math.min(clipboard.x + OFFSET, currentDims.width - clipboard.width),
      y: Math.min(clipboard.y + OFFSET, currentDims.height - clipboard.height),
      page: currentPage + 1,
    };

    const newAnnotations = [...annotations, newAnnotation];
    setAnnotations(newAnnotations);
    pushToHistory(newAnnotations);
    setSelectedId(newAnnotation.id);
    setActiveTool('select');
  }, [clipboard, annotations, currentPage, pushToHistory, currentDims]);

  const currentPageAnnotations = annotations.filter(
    (ann) => ann.page === currentPage + 1
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEditingText = document.activeElement?.tagName === 'TEXTAREA';

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !isEditingText) {
        if (selectedId) {
          e.preventDefault();
          copyAnnotation();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditingText) {
        e.preventDefault();
        e.stopPropagation();
        if (clipboard) {
          pasteAnnotation();
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId && !isEditingText) {
          removeAnnotation(selectedId);
        }
      }
      if (e.key === 'Escape') {
        if (editorMode !== 'edit') {
          setEditorMode('edit');
        } else {
          handleDeselect();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, undo, redo, copyAnnotation, pasteAnnotation, clipboard, editorMode]);

  // Convert PDF points to percentage of page dimensions for positioning
  // This ensures annotations stay aligned with the image content
  const toPercentX = (points: number) => (points / currentDims.width) * 100;
  const toPercentY = (points: number) => (points / currentDims.height) * 100;
  const toPercentW = (points: number) => (points / currentDims.width) * 100;
  const toPercentH = (points: number) => (points / currentDims.height) * 100;

  // For font size, we need to scale relative to container height
  // so text appears the same relative size regardless of page dimensions
  const toFontSizePx = (points: number) => points;

  // No-file state: upload screen
  if (!file && pages.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 pt-20 pb-12 flex items-center justify-center">
          <div className="max-w-2xl w-full mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="mb-8">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tighter mb-3">
                PDF EDITOR
              </h1>
              <p className="opacity-70 font-mono text-sm">
                ADD TEXT • ROTATE • DELETE • REORDER • EXTRACT • SPLIT • COMPRESS
              </p>
            </div>

            <FileDropzone
              accept={{ 'application/pdf': ['.pdf'] }}
              multiple={false}
              maxFiles={1}
              onFilesSelected={handleFileSelected}
            />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Editor state: full-viewport layout
  return (
    <div className="fixed inset-0 flex flex-col bg-gray-200 z-50">
      {/* Editor Header Bar */}
      <div className="h-12 bg-black text-white border-b-4 border-white flex items-center px-2 gap-2 flex-shrink-0">
        {/* Left: Logo + Sidebar Toggle */}
        <Link
          to="/"
          className="logo-link flex items-center gap-2 px-2 h-full no-underline text-white"
        >
          <div className="w-6 h-6 bg-[#ffff00] border-2 border-[#ffff00] flex items-center justify-center">
            <span className="text-black font-bold text-xs">D</span>
          </div>
          <span className="font-bold text-xs tracking-wider hidden sm:inline text-[#ffff00]">DOCUTHING</span>
        </Link>

        <div className="w-px h-6 bg-white/20" />

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-1.5 transition-colors ${sidebarOpen ? 'bg-white/20' : 'hover:bg-white/10'}`}
          title="Toggle sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/20" />

        {/* Tools */}
        <div className="flex border-2 border-white/30">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-1.5 flex items-center gap-1.5 font-bold text-xs transition-colors ${
              activeTool === 'select'
                ? 'bg-[#ffff00] text-black'
                : 'hover:bg-white/10'
            }`}
            title="Select Tool (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">SELECT</span>
          </button>
          <button
            onClick={() => setActiveTool('text')}
            className={`p-1.5 flex items-center gap-1.5 font-bold text-xs border-l-2 border-white/30 transition-colors ${
              activeTool === 'text'
                ? 'bg-[#ffff00] text-black'
                : 'hover:bg-white/10'
            }`}
            title="Text Tool (T)"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">ADD TEXT</span>
          </button>
        </div>

        <div className="flex border-2 border-white/30">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1.5 border-l-2 border-white/30 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-xs tracking-wider min-w-[70px] text-center">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={currentPage === pages.length - 1}
            className="p-1 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1" />

        {/* PDF Tools */}
        <div className="flex border-2 border-white/30">
          {([
            { mode: 'rotate' as EditorMode, icon: RotateCw, label: 'ROTATE' },
            { mode: 'delete' as EditorMode, icon: Trash2, label: 'DELETE' },
            { mode: 'reorder' as EditorMode, icon: ListOrdered, label: 'REORDER' },
            { mode: 'extract' as EditorMode, icon: FileOutput, label: 'EXTRACT' },
            { mode: 'split' as EditorMode, icon: Scissors, label: 'SPLIT' },
            { mode: 'compress' as EditorMode, icon: FileDown, label: 'COMPRESS' },
          ]).map(({ mode, icon: Icon, label }, i) => (
            <button
              key={mode}
              onClick={() => setEditorMode(editorMode === mode ? 'edit' : mode)}
              className={`p-1.5 flex items-center gap-1 font-bold text-[10px] tracking-wider transition-colors ${
                i > 0 ? 'border-l-2 border-white/30' : ''
              } ${
                editorMode === mode
                  ? 'bg-[#ffff00] text-black'
                  : 'hover:bg-white/10'
              }`}
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-white/20" />

        {/* Zoom */}
        <div className="flex items-center border-2 border-white/30">
          <button
            onClick={zoomOut}
            disabled={zoom <= ZOOM_LEVELS[0]}
            className="p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="px-2 py-1 font-bold text-xs hover:bg-[#ffff00] hover:text-black min-w-[50px] text-center"
            title="Reset zoom"
          >
            {zoom}%
          </button>
          <button
            onClick={zoomIn}
            disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
            className="p-1.5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetZoom}
            className="p-1.5 hover:bg-white/10 border-l-2 border-white/30"
            title="Fit to window (100%)"
          >
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>

        {selectedId && editorMode === 'edit' && (
          <>
            <div className="w-px h-6 bg-white/20" />
            <button
              onClick={() => removeAnnotation(selectedId)}
              className="p-1.5 border-2 border-red-500 text-red-400 hover:bg-red-500 hover:text-white transition-colors"
              title="Delete (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <div className="w-px h-6 bg-white/20" />

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isProcessing || annotations.filter((a) => a.text.trim()).length === 0 || !file}
          className="px-2.5 py-1 bg-[#ffff00] text-black font-bold text-xs uppercase tracking-wider border-2 border-[#ffff00] hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          title="Save & Download"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isProcessing ? 'SAVING...' : 'SAVE'}</span>
        </button>

        <div className="w-px h-6 bg-white/20" />

        {/* File info & Close */}
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 opacity-50" />
          <span className="font-mono text-xs opacity-70 max-w-[120px] truncate hidden sm:inline">
            {fileName}
          </span>
          <button
            onClick={resetFile}
            className="p-1.5 hover:bg-white/10 transition-colors"
            title="Close file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner message="LOADING PDF..." />
        </div>
      ) : (
        /* Editor Body */
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — Text Annotations */}
          {editorMode === 'edit' && (
            <div
              className={`bg-white border-r-4 border-black flex flex-col flex-shrink-0 transition-all duration-200 overflow-hidden ${
                sidebarOpen ? 'w-72' : 'w-0 border-r-0'
              }`}
            >
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-w-[288px]">
                {/* How to Use */}
                <div className="border-b-4 border-current pb-3">
                  <h3 className="font-bold uppercase tracking-wider text-xs mb-2">
                    HOW TO USE
                  </h3>
                  <ul className="space-y-1.5 text-xs font-mono opacity-70">
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
                </div>

                {/* Text Boxes */}
                <div>
                  <h3 className="font-bold uppercase tracking-wider text-xs mb-2">
                    TEXT BOXES ({annotations.length})
                  </h3>
                  {annotations.length === 0 ? (
                    <p className="text-xs font-mono opacity-50">
                      No text added yet
                    </p>
                  ) : (
                    <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
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
                </div>
              </div>
            </div>
          )}

          {/* Canvas Area */}
          <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
            {editorMode !== 'edit' && file && (
              <div className="w-full max-w-4xl mx-auto">
                {/* Tool Mode Header */}
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold uppercase tracking-wider text-sm">
                    {editorMode === 'rotate' && 'ROTATE PAGES'}
                    {editorMode === 'delete' && 'DELETE PAGES'}
                    {editorMode === 'reorder' && 'REORDER PAGES'}
                    {editorMode === 'extract' && 'EXTRACT PAGES'}
                    {editorMode === 'split' && 'SPLIT PDF'}
                    {editorMode === 'compress' && 'COMPRESS PDF'}
                  </h2>
                  <button
                    onClick={() => setEditorMode('edit')}
                    className="px-3 py-1.5 text-xs font-bold uppercase border-2 border-current hover:bg-black hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    BACK TO EDITOR
                  </button>
                </div>

                {/* Tool Panel Content */}
                <div className="bg-white border-4 border-black p-6 shadow-[6px_6px_0_0_#000]">
                  {editorMode === 'rotate' && (
                    <RotatePanel file={file} thumbnails={thumbnails} onFileUpdate={handleFileUpdate} />
                  )}
                  {editorMode === 'delete' && (
                    <DeletePagesPanel file={file} thumbnails={thumbnails} onFileUpdate={handleFileUpdate} />
                  )}
                  {editorMode === 'reorder' && (
                    <ReorderPanel file={file} thumbnails={thumbnails} onFileUpdate={handleFileUpdate} />
                  )}
                  {editorMode === 'extract' && (
                    <ExtractPanel file={file} thumbnails={thumbnails} />
                  )}
                  {editorMode === 'split' && (
                    <SplitPanel file={file} thumbnails={thumbnails} />
                  )}
                  {editorMode === 'compress' && (
                    <CompressPanel file={file} />
                  )}
                </div>
              </div>
            )}

            {editorMode === 'edit' && (
            <div
              ref={pageRef}
              onClick={handlePageClick}
              className={`relative bg-white border-4 border-black shadow-[6px_6px_0_0_#000] select-none origin-top-left ${
                activeTool === 'text' ? 'cursor-crosshair' : 'cursor-default'
              }`}
              style={{
                width: currentDims.width,
                height: currentDims.height,
                transform: `scale(${effectiveScale})`,
                transformOrigin: 'top left',
              }}
            >
              <img
                src={pages[currentPage]}
                alt={`Page ${currentPage + 1}`}
                style={{
                  width: currentDims.width,
                  height: currentDims.height,
                }}
                draggable={false}
              />

              {/* Snap guide lines */}
              {snapGuides.map((guide, index) => (
                <div
                  key={`guide-${index}`}
                  className="absolute pointer-events-none z-30"
                  style={
                    guide.type === 'vertical'
                      ? {
                          left: `${toPercentX(guide.position)}%`,
                          top: 0,
                          bottom: 0,
                          width: '1px',
                          backgroundColor: '#f97316',
                        }
                      : {
                          top: `${toPercentY(guide.position)}%`,
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
                    left: `${toPercentX(ann.x)}%`,
                    top: `${toPercentY(ann.y)}%`,
                    width: `${toPercentW(ann.width)}%`,
                    height: selectedId === ann.id ? `${toPercentH(ann.height)}%` : 'auto',
                    minWidth: `${toPercentW(40)}%`,
                    minHeight: toFontSizePx(ann.fontSize),
                  }}
                  onClick={(e) => handleAnnotationClick(e, ann.id)}
                  onDoubleClick={(e) => handleAnnotationDoubleClick(e, ann.id)}
                  onMouseDown={(e) => handleAnnotationMouseDown(e, ann.id)}
                >
                  {selectedId === ann.id ? (
                    <div
                      className="relative w-full h-full"
                      style={{
                        outline: isEditing ? '2px dashed #3b82f6' : '2px solid #3b82f6',
                        outlineOffset: '-2px',
                        background: 'rgba(59, 130, 246, 0.05)',
                      }}
                    >
                      {/* Annotation Toolbar */}
                      <div
                        className="absolute -top-7 left-0 flex items-center gap-1 bg-blue-500 text-white text-xs font-bold"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div
                          className="px-2 py-1 cursor-move flex items-center gap-1 hover:bg-blue-600"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            handleAnnotationMouseDown(e, ann.id);
                          }}
                        >
                          <Move className="w-3 h-3" />
                        </div>

                        <div className="relative" ref={fontDropdownRef}>
                          <button
                            className="px-2 py-1 hover:bg-blue-600 flex items-center gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFontDropdown(!showFontDropdown);
                            }}
                          >
                            {ann.fontSize}pt
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
                                  {size}pt
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

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
                        <textarea
                          ref={editingRef}
                          value={ann.text}
                          onChange={(e) => updateAnnotationText(ann.id, e.target.value)}
                          placeholder="Type here..."
                          className="w-full h-full bg-transparent resize-none focus:outline-none overflow-hidden"
                          style={{
                            fontSize: toFontSizePx(ann.fontSize),
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
                        <div
                          className="w-full h-full"
                          style={{
                            fontSize: toFontSizePx(ann.fontSize),
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
                      <div
                        className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-blue-500 cursor-nw-resize border border-white"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
                      />
                      <div
                        className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-blue-500 cursor-ne-resize border border-white"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
                      />
                      <div
                        className="absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-blue-500 cursor-sw-resize border border-white"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
                      />
                      <div
                        className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-blue-500 cursor-se-resize border border-white"
                        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
                      />
                    </div>
                  ) : (
                    <div
                      className="cursor-pointer hover:outline hover:outline-2 hover:outline-blue-400 hover:outline-dashed"
                      style={{
                        fontSize: toFontSizePx(ann.fontSize),
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

              {activeTool === 'text' && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 hover:opacity-100">
                  <div className="bg-black text-white px-2 py-1 text-xs font-bold">
                    CLICK TO ADD TEXT
                  </div>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Alert status="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}
