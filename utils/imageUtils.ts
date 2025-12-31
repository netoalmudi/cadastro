/**
 * Comprime um arquivo de imagem se ele exceder o tamanho máximo especificado.
 * @param file O arquivo de imagem original.
 * @param maxSizeMB O tamanho máximo permitido em Megabytes (padrão: 1MB).
 * @returns Uma Promise que resolve com o arquivo comprimido (ou o original se já for pequeno).
 */
export const compressImage = async (file: File, maxSizeMB: number = 1): Promise<File> => {
  // Se não for imagem ou se já for pequeno o suficiente, retorna o original
  if (!file.type.startsWith('image/') || file.size <= maxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Define dimensões máximas (Full HD é um bom equilíbrio para documentos)
      const MAX_WIDTH = 1920;
      const MAX_HEIGHT = 1920;
      let width = img.width;
      let height = img.height;

      // Redimensiona mantendo a proporção se for muito grande
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file); // Falha silenciosa, retorna original
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Tenta comprimir para JPEG com qualidade 0.7 (70%)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Cria um novo arquivo com a extensão .jpg
            const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], newName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            
            console.log(`Imagem comprimida: ${file.size} -> ${compressedFile.size} bytes`);
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        },
        'image/jpeg',
        0.7
      );
    };

    img.onerror = (error) => {
      URL.revokeObjectURL(url);
      console.error("Erro ao processar imagem:", error);
      resolve(file); // Em caso de erro, retorna o arquivo original
    };
  });
};