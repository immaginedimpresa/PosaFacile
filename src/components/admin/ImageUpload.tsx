import { useStorage } from '@/hooks/useStorage'

interface ImageUploadProps {
    images: string[]
    onImagesChange: (newImages: string[]) => void
    bucketName?: string
}

export function ImageUpload({ images, onImagesChange, bucketName = 'products' }: ImageUploadProps) {
    const { uploadImage, uploading, error } = useStorage()

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0]
            const url = await uploadImage(file, bucketName)
            if (url) {
                onImagesChange([...images, url])
            }
            // Reset input
            e.target.value = ''
        }
    }

    const removeImage = (indexToRemove: number) => {
        onImagesChange(images.filter((_, index) => index !== indexToRemove))
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-4">
                {images.map((url, index) => (
                    <div key={index} className="relative w-24 h-24 group">
                        <img
                            src={url}
                            alt={`Product ${index + 1}`}
                            className="w-full h-full object-cover rounded-lg border border-gray-200"
                        />
                        <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}

                <label
                    htmlFor="product-image-upload"
                    className="w-24 h-24 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 transition-colors cursor-pointer relative"
                >
                    {uploading ? (
                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    )}
                    <input
                        id="product-image-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                    />
                </label>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
        </div>
    )
}
