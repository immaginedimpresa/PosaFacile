-- Create a new storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public can view photos (or maybe checking permissions? For now public is easier for display)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'job-photos' );

-- Policy: Professionals can upload photos
CREATE POLICY "Professionals Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'job-photos' AND
  auth.role() = 'authenticated'
);

-- Policy: Professionals can update/delete their own photos
CREATE POLICY "Professionals Manage Own"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'job-photos' AND owner = auth.uid() );

CREATE POLICY "Professionals Delete Own"
ON storage.objects FOR DELETE
USING ( bucket_id = 'job-photos' AND owner = auth.uid() );
