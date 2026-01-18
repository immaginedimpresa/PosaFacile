import { useState, useRef } from 'react'
import { Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface PhotoUploadProps {
    jobId: string
    onUploadComplete: (url: string) => void
}

export function PhotoUpload({ jobId, onUploadComplete }: PhotoUploadProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            handleUpload(file)
        }
    }

    const handleUpload = async (file: File) => {
        setUploading(true)
        try {
            const fileExt = file.name.split('.').pop()
            const fileName = `${jobId}/${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('job-photos')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from('job-photos').getPublicUrl(filePath)

            // Log to job_logs
            await supabase.from('job_logs').insert({
                job_id: jobId,
                action: 'photo_upload',
                details: { url: data.publicUrl, original_name: file.name }
            })

            onUploadComplete(data.publicUrl)
            if (fileInputRef.current) fileInputRef.current.value = ''
        } catch (error) {
            console.error('Error uploading photo:', error)
            alert('Errore caricamento foto')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-orange-200 hover:bg-orange-50/50 transition-colors cursor-pointer relative"
            onClick={() => fileInputRef.current?.click()}>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                capture="environment" // Opens camera on mobile
                onChange={handleFileSelect}
            />

            {uploading ? (
                <div className="flex flex-col items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
                    <p className="text-sm text-gray-500">Caricamento...</p>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-1">
                        <Camera size={24} />
                    </div>
                    <p className="font-medium text-gray-900">Scatta o Carica Foto</p>
                    <p className="text-xs text-gray-400">Documenta l'avanzamento dei lavori</p>
                </div>
            )}
        </div>
    )
}
