
/**
 * eDrive Image Optimization Engine
 * Compresses images to ~20KB for efficient storage and fast loading in Hafizabad.
 */
export async function compressImage(
  file: File, 
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    // Simulate initial file reading progress
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 20)); 
      }
    };

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Smart Resize: Cap dimensions to maintain aspect ratio but limit total pixels
        const MAX_DIM = 600; 
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject("Canvas Context Error");
        
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        let base64 = '';
        
        const tryCompress = () => {
          base64 = canvas.toDataURL('image/jpeg', quality);
          // Standard Base64 size estimation (len * 0.75)
          const sizeKb = (base64.length * 0.75) / 1024;
          
          if (sizeKb > 22 && quality > 0.05) {
            quality -= 0.05;
            // Map quality reduction to progress 20% -> 95%
            const p = Math.round(20 + (0.8 - quality) * 100);
            onProgress(Math.min(p, 95));
            setTimeout(tryCompress, 5); // Async recursion to avoid blocking UI
          } else {
            onProgress(100);
            resolve(base64);
          }
        };

        tryCompress();
      };
      img.onerror = () => reject("Image Loading Error");
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject("File Read Error");
    reader.readAsDataURL(file);
  });
}
