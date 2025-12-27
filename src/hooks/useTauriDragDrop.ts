/**
 * useTauriDragDrop Hook
 * 
 * Custom hook for handling native Tauri drag and drop events.
 * Provides a unified interface for processing dropped image files
 * that works across macOS, Windows, and Linux.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import type { DragDropEvent } from '@tauri-apps/api/webview';
import { ImageAttachment } from '@/types/chat';
import {
    isImageFile,
    getImageMimeType,
    getFileName,
    readImageAsBase64,
    validateImageSize,
} from '@/utils/imageUtils';

export interface UseTauriDragDropOptions {
    /** Maximum file size in MB (default: 10) */
    maxFileSizeMB?: number;
    /** Whether the hook is enabled (default: true) */
    enabled?: boolean;
    /** Callback when images are dropped */
    onImagesDrop?: (images: ImageAttachment[]) => void;
    /** Callback for errors during file processing */
    onError?: (error: string) => void;
}

export interface UseTauriDragDropReturn {
    /** Whether files are currently being dragged over the window */
    isDragging: boolean;
    /** The type of drag event currently active */
    dragType: 'enter' | 'over' | 'leave' | null;
    /** Paths of files being dragged (only images) */
    draggedImagePaths: string[];
    /** Position of the drag cursor */
    dragPosition: { x: number; y: number } | null;
    /** Whether Tauri drag-drop is available */
    isAvailable: boolean;
}

/**
 * Hook for handling native Tauri drag and drop events
 */
export function useTauriDragDrop(options: UseTauriDragDropOptions = {}): UseTauriDragDropReturn {
    const {
        maxFileSizeMB = 10,
        enabled = true,
        onImagesDrop,
        onError,
    } = options;

    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'enter' | 'over' | 'leave' | null>(null);
    const [draggedImagePaths, setDraggedImagePaths] = useState<string[]>([]);
    const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);

    // Store callbacks in refs to avoid dependency issues
    const onImagesDropRef = useRef(onImagesDrop);
    const onErrorRef = useRef(onError);

    useEffect(() => {
        onImagesDropRef.current = onImagesDrop;
    }, [onImagesDrop]);

    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    /**
     * Process dropped files and convert images to ImageAttachment format
     */
    const processDroppedFiles = useCallback(async (paths: string[]) => {
        const imagePaths = paths.filter(isImageFile);

        if (imagePaths.length === 0) {
            console.log('[useTauriDragDrop] No image files in dropped paths');
            return;
        }

        console.log('[useTauriDragDrop] Processing', imagePaths.length, 'image(s)');

        const images: ImageAttachment[] = [];
        const errors: string[] = [];

        for (const path of imagePaths) {
            try {
                const base64 = await readImageAsBase64(path);

                // Validate size
                if (!validateImageSize(base64, maxFileSizeMB)) {
                    errors.push(`${getFileName(path)} exceeds ${maxFileSizeMB}MB limit`);
                    continue;
                }

                images.push({
                    base64,
                    mimeType: getImageMimeType(path),
                    filename: getFileName(path),
                });
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : String(err);
                errors.push(`Failed to read ${getFileName(path)}: ${errorMsg}`);
                console.error('[useTauriDragDrop] Error reading file:', path, err);
            }
        }

        // Report errors
        if (errors.length > 0 && onErrorRef.current) {
            onErrorRef.current(errors.join('; '));
        }

        // Notify about successfully processed images
        if (images.length > 0 && onImagesDropRef.current) {
            onImagesDropRef.current(images);
        }
    }, [maxFileSizeMB]);

    /**
     * Handle drag-drop events from Tauri
     */
    const handleDragDropEvent = useCallback((event: DragDropEvent) => {
        console.log('[useTauriDragDrop] Event:', event.type);

        switch (event.type) {
            case 'enter':
                setIsDragging(true);
                setDragType('enter');
                if (event.paths) {
                    const imagePaths = event.paths.filter(isImageFile);
                    setDraggedImagePaths(imagePaths);
                }
                setDragPosition(event.position);
                break;

            case 'over':
                setDragType('over');
                setDragPosition(event.position);
                break;

            case 'drop':
                setIsDragging(false);
                setDragType(null);
                setDragPosition(null);
                if (event.paths && event.paths.length > 0) {
                    processDroppedFiles(event.paths);
                }
                setDraggedImagePaths([]);
                break;

            case 'leave':
                setIsDragging(false);
                setDragType('leave');
                setDragPosition(null);
                setDraggedImagePaths([]);
                // Reset drag type after a short delay
                setTimeout(() => setDragType(null), 100);
                break;
        }
    }, [processDroppedFiles]);

    /**
     * Set up the Tauri drag-drop event listener
     */
    useEffect(() => {
        if (!enabled) {
            setIsAvailable(false);
            return;
        }

        let unlisten: (() => void) | undefined;
        let mounted = true;

        const setupListener = async () => {
            try {
                const webview = getCurrentWebview();
                unlisten = await webview.onDragDropEvent((event) => {
                    if (mounted) {
                        handleDragDropEvent(event.payload);
                    }
                });
                if (mounted) {
                    setIsAvailable(true);
                    console.log('[useTauriDragDrop] Native drag-drop listener active');
                }
            } catch (err) {
                console.warn('[useTauriDragDrop] Tauri drag-drop not available:', err);
                if (mounted) {
                    setIsAvailable(false);
                }
            }
        };

        setupListener();

        return () => {
            mounted = false;
            if (unlisten) {
                unlisten();
            }
        };
    }, [enabled, handleDragDropEvent]);

    return {
        isDragging,
        dragType,
        draggedImagePaths,
        dragPosition,
        isAvailable,
    };
}
