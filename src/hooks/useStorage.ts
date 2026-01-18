import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface UseStorageReturn {
    uploadImage: (file: File, bucket: string, path?: string) => Promise<string | null>
    deleteImage: (bucket: string, path: string) => Promise<boolean>
    uploading: boolean
    error: string | null
}

export function useStorage(): UseStorageReturn {
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const uploadImage = async (file: File, bucket: string, path?: string): Promise<string | null> => {
        try {
            setUploading(true)
            setError(null)

            const fileExt = file.name.split('.').pop()
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
            const filePath = path ? `${path}/${fileName}` : fileName

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath)

            return publicUrl
        } catch (err) {
            setError((err as Error).message)
            return null
        } finally {
            setUploading(false)
        }
    }

    const deleteImage = async (bucket: string, path: string): Promise<boolean> => {
        try {
            setUploading(true)
            const { error } = await supabase.storage
                .from(bucket)
                .remove([path])

            if (error) throw error
            return true
        } catch (err) {
            setError((err as Error).message)
            return false
        } finally {
            setUploading(false)
        }
    }

    return {
        uploadImage,
        deleteImage,
        uploading,
        error
    }
}
