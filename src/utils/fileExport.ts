/**
 * Handles file downloads and shares reliably across mobile Safari (iOS standalone PWA mode) and desktop browsers.
 */
export async function downloadOrShareFile(params: {
  blob: Blob;
  filename: string;
  mimeType: string;
}): Promise<void> {
  const { blob, filename, mimeType } = params;

  // On iOS standalone PWA mode, anchor download often fails silently.
  // Use Web Share API Level 2 if files are supported.
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([blob], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename
        });
        return;
      }
    } catch (err: unknown) {
      // If the user cancelled the iOS share sheet, do not throw or fall back
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      // If Web Share throws any other error, gracefully fall through to standard download
    }
  }

  // Standard browser blob download via temporary <a> tag
  if (typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
