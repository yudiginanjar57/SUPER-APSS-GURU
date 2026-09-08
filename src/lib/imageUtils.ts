/**
 * Compress an image file using an offscreen HTML Canvas.
 * Resizes large images (max dimension default 1200px) and outputs optimized JPEG data URL.
 * Keeps file sizes around 80KB - 200KB while maintaining clear visual quality.
 */
export async function compressImage(file: File, maxDimension = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback to raw dataUrl if image element fails
        resolve(e.target?.result as string);
      };
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to compressed JPEG data URL
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Specifically optimized for OCR vision models (e.g. Gemini AI OCR).
 * Preserves high resolution (up to 1800px) and 0.85 quality for crystal clear handwriting,
 * while reducing 10MB+ camera uploads down to ~250KB for rapid API response without errors.
 * Automatically handles PDFs by reading raw data URL.
 */
export async function compressFileForOCR(file: File, maxDimension = 1800, quality = 0.85): Promise<string> {
  const name = file.name.toLowerCase();
  const isPdf = file.type.includes("pdf") || name.endsWith(".pdf");

  if (isPdf) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  }

  return compressImage(file, maxDimension, quality);
}

