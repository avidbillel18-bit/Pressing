import { createWorker } from 'tesseract.js';

let workerPromise: any = null;

// Initialize or get singleton digit OCR worker
export async function getDigitWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789',
        });
        return worker;
      } catch (err) {
        console.warn('Failed to initialize local Tesseract worker:', err);
        workerPromise = null;
        return null;
      }
    })();
  }
  return workerPromise;
}

// Pre-initialize worker in background on app load
if (typeof window !== 'undefined') {
  getDigitWorker().catch(() => {});
}

/**
 * Preprocesses a cropped canvas containing the large black digits on white paper:
 * Converts to grayscale and applies high-contrast thresholding for instant accurate digit recognition.
 */
export function preprocessNumberCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const processedCanvas = document.createElement('canvas');
  processedCanvas.width = sourceCanvas.width;
  processedCanvas.height = sourceCanvas.height;
  const ctx = processedCanvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);
  const imgData = ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
  const data = imgData.data;

  // Compute average luminance
  let totalLuminance = 0;
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    totalLuminance += lum;
  }
  const avgLuminance = totalLuminance / (data.length / 4);
  const threshold = Math.min(Math.max(avgLuminance * 0.85, 80), 180);

  // High-contrast binarization (black text on white background)
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const val = lum < threshold ? 0 : 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return processedCanvas;
}

/**
 * Fast client-side digit extraction from a cropped top-section canvas
 */
export async function recognizeTopOrderNumberLocally(
  croppedCanvas: HTMLCanvasElement
): Promise<string | null> {
  try {
    const preprocessed = preprocessNumberCanvas(croppedCanvas);
    const worker = await getDigitWorker();

    if (worker) {
      const ret = await worker.recognize(preprocessed);
      const text = ret?.data?.text || '';
      const digitsOnly = text.replace(/[^0-9]/g, '').trim();

      // Check if valid 1-4 digit order number detected
      if (digitsOnly.length >= 1 && digitsOnly.length <= 4) {
        return digitsOnly;
      }
    }
  } catch (err) {
    console.warn('Local digit OCR error:', err);
  }

  return null;
}
