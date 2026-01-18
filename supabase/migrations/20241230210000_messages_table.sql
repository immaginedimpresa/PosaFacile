-- Create messages table for job-specific communication
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Admins have full access
CREATE POLICY "Admins can do everything on messages" ON public.messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 2. Professionals can VIEW messages for their assigned jobs
CREATE POLICY "Professionals can view messages of their jobs" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE id = messages.job_id 
            AND professional_id = auth.uid()
        )
    );

-- 3. Professionals can INSERT messages for their assigned jobs
CREATE POLICY "Professionals can send messages to their jobs" ON public.messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.jobs 
            WHERE id = job_id 
            AND professional_id = auth.uid()
        )
        AND sender_id = auth.uid()
    );
