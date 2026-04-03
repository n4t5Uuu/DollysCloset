import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file before it's uploaded to the server
 * to save bandwidth and storage space.
 */
export const compressImage = async (file: File): Promise<File> => {
    const options = {
        maxSizeMB: 2, // Maximum file size of 2MB
        maxWidthOrHeight: 1920, // Max dimension
        useWebWorker: true, // Speeds up the compression using web workers
        initialQuality: 0.8,
    };

    try {
        const compressedBlob = await imageCompression(file, options);
        // browser-image-compression returns a Blob, so we need to convert it back to a File
        return new File([compressedBlob], file.name, {
            type: compressedBlob.type,
            lastModified: Date.now(),
        });
    } catch (error) {
        console.error('Error compressing image:', error);
        // In case of an error, just return the original file rather than failing completely
        return file;
    }
};
