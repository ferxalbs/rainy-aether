/**
 * Image Utility Functions
 * 
 * Centralized utilities for handling images in the application,
 * including MIME type detection, base64 conversion, and validation.
 */

import { readFile } from '@tauri-apps/plugin-fs';

// Supported image extensions and their MIME types
const IMAGE_EXTENSIONS: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.tiff': 'image/tiff',
    '.tif': 'image/tiff',
};

/**
 * Check if a file path points to a supported image file
 */
export function isImageFile(path: string): boolean {
    const lowerPath = path.toLowerCase();
    return Object.keys(IMAGE_EXTENSIONS).some(ext => lowerPath.endsWith(ext));
}

/**
 * Get MIME type from file path extension
 */
export function getImageMimeType(path: string): string {
    const lowerPath = path.toLowerCase();
    for (const [ext, mime] of Object.entries(IMAGE_EXTENSIONS)) {
        if (lowerPath.endsWith(ext)) {
            return mime;
        }
    }
    return 'application/octet-stream';
}

/**
 * Get file extension from path
 */
export function getFileExtension(path: string): string {
    const lastDot = path.lastIndexOf('.');
    if (lastDot === -1) return '';
    return path.slice(lastDot).toLowerCase();
}

/**
 * Get filename from path (cross-platform)
 */
export function getFileName(path: string): string {
    // Handle both Windows and Unix paths
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || '';
}

/**
 * Read an image file and convert to base64 using Tauri's fs plugin
 */
export async function readImageAsBase64(path: string): Promise<string> {
    try {
        const contents = await readFile(path);
        // Convert Uint8Array to base64
        return uint8ArrayToBase64(contents);
    } catch (error) {
        console.error('[imageUtils] Failed to read image:', path, error);
        throw new Error(`Failed to read image file: ${path}`);
    }
}

/**
 * Convert Uint8Array to base64 string
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Calculate the size of a base64 string in bytes
 */
export function getBase64Size(base64: string): number {
    // Calculate the size in bytes from base64 string
    // Remove any padding and calculate
    const padding = (base64.match(/=/g) || []).length;
    return (base64.length * 3) / 4 - padding;
}

/**
 * Validate image size is within limits
 * @param base64 - Base64 encoded image data
 * @param maxMB - Maximum size in megabytes (default: 10MB)
 */
export function validateImageSize(base64: string, maxMB: number = 10): boolean {
    const sizeInBytes = getBase64Size(base64);
    const maxBytes = maxMB * 1024 * 1024;
    return sizeInBytes <= maxBytes;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
