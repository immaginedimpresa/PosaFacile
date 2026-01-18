-- ====================================================================
-- STORAGE BUCKET SETUP: PRODUCTS
-- ====================================================================

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies to avoid conflicts (FIXED: matching names)
DROP POLICY IF EXISTS "Public Read Products" ON storage.objects;
DROP POLICY IF EXISTS "Admin Insert Products" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update Products" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Products" ON storage.objects;

-- Also drop old/wrong names just in case
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

-- 3. Create CLEAN policies

-- Allow public read access to all files in 'products' bucket
CREATE POLICY "Public Read Products"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

-- Allow admins to insert (upload) files
-- Allow admins to insert (upload) files
CREATE POLICY "Admin Insert Products"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (
    (auth.jwt() ->> 'role' = 'service_role') OR
    ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin')
  )
);

-- Allow admins to update files
CREATE POLICY "Admin Update Products"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND
  (
    (auth.jwt() ->> 'role' = 'service_role') OR
    ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin')
  )
);

-- Allow admins to delete files
CREATE POLICY "Admin Delete Products"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  (
    (auth.jwt() ->> 'role' = 'service_role') OR
    ((auth.jwt() -> 'app_metadata' ->> 'role')::text = 'admin')
  )
);