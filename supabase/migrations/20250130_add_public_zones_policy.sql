-- Create RLS policy to allow public read access to professional_zones
-- This enables the configurator to filter professionals by province without authentication

-- Drop the policy if it already exists
DROP POLICY IF EXISTS "Public zones are viewable by everyone" ON professional_zones;

-- Create the new policy
CREATE POLICY "Public zones are viewable by everyone"
ON professional_zones
FOR SELECT
TO public
USING (true);
