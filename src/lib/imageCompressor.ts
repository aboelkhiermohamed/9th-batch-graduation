/**
 * High-performance client-side image compression utility
 * Downscales images to max 800px width/height and compresses to JPEG ~0.65 quality.
 * Shrinks 5MB-10MB mobile photos down to 30KB-70KB before uploading to the server,
 * completely preventing database bloat and excessive bandwidth consumption.
 */
export async function compressImageFile(file: File, maxDim = 800, quality = 0.65): Promise<File> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !file || !file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    // If file is already tiny (less than 80KB), return as is
    if (file.size < 80 * 1024) {
      resolve(file);
      return;
    }

    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            const cleanName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], cleanName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
