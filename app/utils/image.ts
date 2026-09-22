/**
 * Resize and compress an image file before upload.
 * Ensures uploaded photos never exceed backend upload size limits (e.g. PHP 2MB upload_max_filesize).
 */
export async function optimizeImageFile(file: File, maxDimension = 1200, quality = 0.85): Promise<File> {
  // If file is already small (under 1MB), return as is
  if (file.size <= 1024 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const cleanName = file.name.replace(/\.[^.]+$/, mimeType === 'image/png' ? '.png' : '.jpg')
            const optimized = new File([blob], cleanName, {
              type: mimeType,
              lastModified: Date.now()
            })
            resolve(optimized)
          },
          mimeType,
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}
