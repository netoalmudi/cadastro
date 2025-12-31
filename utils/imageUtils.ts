/**
 * Comprime uma imagem se ela for maior que o tamanho máximo especificado.
 * Converte para JPEG e redimensiona mantendo a proporção.
 * 
 * @param file O arquivo original
 * @param maxSizeMB Tamanho máximo em MB para acionar a compressão (padrão 2MB)
 * @param targetQuality Qualidade da compressão JPEG (0.0 a 1.0)
 * @returns Uma Promise que resolve com o arquivo original ou o arquivo comprimido
 */
export const compressImage = async (
    file: File, 
    maxSizeMB: number = 2,
    maxWidthOrHeight: number = 1920, // Full HD é suficiente para documentos
    targetQuality: number = 0.8
  ): Promise<File> => {
    // Se o arquivo for menor que o limite (em bytes), retorna o original
    if (file.size <= maxSizeMB * 1024 * 1024) {
      return file;
    }
  
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          // Calcular novas dimensões mantendo proporção
          let width = img.width;
          let height = img.height;
  
          if (width > height) {
            if (width > maxWidthOrHeight) {
              height = Math.round(height * (maxWidthOrHeight / width));
              width = maxWidthOrHeight;
            }
          } else {
            if (height > maxWidthOrHeight) {
              width = Math.round(width * (maxWidthOrHeight / height));
              height = maxWidthOrHeight;
            }
          }
  
          // Criar Canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Falha ao criar contexto do canvas'));
            return;
          }
  
          // Desenhar imagem redimensionada
          ctx.drawImage(img, 0, 0, width, height);
  
          // Converter para Blob/File (Força JPEG para melhor compressão de fotos)
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha na compressão da imagem'));
                return;
              }
  
              // Cria um novo arquivo com o nome original (mudando extensão para jpg se necessário)
              const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
              const newFile = new File([blob], newName, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
  
              resolve(newFile);
            },
            'image/jpeg',
            targetQuality
          );
        };
  
        img.onerror = (err) => reject(err);
      };
  
      reader.onerror = (err) => reject(err);
    });
  };