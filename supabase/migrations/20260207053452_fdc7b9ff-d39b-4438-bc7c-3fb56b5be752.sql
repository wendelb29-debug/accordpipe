
-- Create storage bucket for signature photos
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to upload signature photos
CREATE POLICY "Anyone can upload signatures"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'signatures');

-- Allow anyone to view signature photos
CREATE POLICY "Anyone can view signatures"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signatures');
