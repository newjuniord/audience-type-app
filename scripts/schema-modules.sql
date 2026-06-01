-- Table for Course Modules
-- In Firebase, this was a subcollection inside courses. Now it's a standalone table linked by courseId.

CREATE TABLE IF NOT EXISTS public.modules (
    "id" TEXT PRIMARY KEY,
    "courseId" TEXT REFERENCES public.courses("id") ON DELETE CASCADE,
    "title" TEXT NOT NULL,
    "lessons" JSONB DEFAULT '[]'::JSONB,
    "duration" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

GRANT ALL PRIVILEGES ON TABLE public.modules TO service_role;
