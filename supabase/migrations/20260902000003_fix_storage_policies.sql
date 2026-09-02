-- Fix Storage RLS: usa is_admin() function + app_metadata per massima compatibilità

-- Ricrea bucket products se non esiste
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop tutte le policy esistenti sullo storage
DO $$
DECLARE pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Policy 1: Lettura pubblica del bucket products
CREATE POLICY "storage_products_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Policy 2: Upload — admin verifica con is_admin() O app_metadata
CREATE POLICY "storage_products_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND (
    public.is_admin() OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() ->> 'role') = 'service_role'
  )
);

-- Policy 3: Update
CREATE POLICY "storage_products_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND (
    public.is_admin() OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() ->> 'role') = 'service_role'
  )
);

-- Policy 4: Delete
CREATE POLICY "storage_products_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND (
    public.is_admin() OR
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' OR
    (auth.jwt() ->> 'role') = 'service_role'
  )
);
