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
        const canvas = document.createElement('canvas');
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('This browser cannot process the selected image.');
        const scale = Math.min(OUTPUT_SIZE / image.naturalWidth, OUTPUT_SIZE / image.naturalHeight);
        const output_width = image.naturalWidth * scale;
        const output_height = image.naturalHeight * scale;
        const output_x = (OUTPUT_SIZE - output_width) / 2;
        const output_y = (OUTPUT_SIZE - output_height) / 2;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.fillStyle = '#0b1420';
        context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        context.drawImage(image, output_x, output_y, output_width, output_height);
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
