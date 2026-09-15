const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const OUTPUT_SIZE = 512;
const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateCharacterImage(file: Pick<File, 'size' | 'type'>): string | null {
    if (!SUPPORTED_IMAGE_TYPES.has(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
    if (file.size > MAX_IMAGE_BYTES) return 'Choose an image smaller than 10 MB.';
    return null;
}

export async function prepareCharacterImage(file: File): Promise<string> {
    const validation_error = validateCharacterImage(file);
    if (validation_error) throw new Error(validation_error);

    const object_url = URL.createObjectURL(file);
    try {
        const image = await loadImage(object_url);
        const crop_size = Math.min(image.naturalWidth, image.naturalHeight);
        const source_x = (image.naturalWidth - crop_size) / 2;
        const source_y = (image.naturalHeight - crop_size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('This browser cannot process the selected image.');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, source_x, source_y, crop_size, crop_size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        return canvas.toDataURL('image/webp', .86);
    } finally {
        URL.revokeObjectURL(object_url);
    }
}

function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('The selected image could not be read.'));
        image.src = source;
    });
}
