-- Storage bucket for WhatsApp media
INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read
DROP POLICY IF EXISTS "WhatsApp media public read" ON storage.objects;
CREATE POLICY "WhatsApp media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-media');

-- Authenticated upload
DROP POLICY IF EXISTS "WhatsApp media authenticated upload" ON storage.objects;
CREATE POLICY "WhatsApp media authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-media');