/**
 * Utilitário de compressão automática de imagens no cliente (Browser/Mobile).
 * Redimensiona para largura máxima de 1280px e comprime com qualidade 0.8
 * evitando estouro de timeout (15s) no Firebase Storage em uploads móveis.
 */

export interface CompressionOptions {
  maxWidth?: number;
  quality?: number;
  preferMimeType?: 'image/jpeg' | 'image/webp';
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 1280,
    quality = 0.8,
    preferMimeType = 'image/jpeg'
  } = options;

  // Se for SVG ou não for imagem que possa ser rasterizada em canvas, mantém original
  if (file.type === 'image/svg+xml' || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        resolve(file);
        return;
      }

      // Redimensiona proporcionalmente mantendo largura máxima de 1280px
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        resolve(file);
        return;
      }

      // Preenchimento de fundo branco para evitar artefatos em imagens transparentes convertidas em JPEG
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, '');
          const ext = preferMimeType === 'image/webp' ? '.webp' : '.jpg';
          const newFileName = `${baseName}_1280${ext}`;

          const compressedFile = new File([blob], newFileName, {
            type: preferMimeType,
            lastModified: Date.now()
          });

          resolve(compressedFile);
        },
        preferMimeType,
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

/**
 * Converte um arquivo de imagem diretamente para DataURL já comprimida
 */
export async function compressImageToDataUrl(
  file: File,
  options: CompressionOptions = {}
): Promise<string> {
  const compressed = await compressImage(file, options);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = reject;
    reader.readAsDataURL(compressed);
  });
}
