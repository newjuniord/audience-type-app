import { createClient } from "./supabase/client";
import { Course, Module, Lesson } from "./types";

const COURSES_TABLE = "courses";
const MODULES_TABLE = "modules";

// Helper to get supabase client
const getSupabase = () => createClient();

// --- Courses CRUD ---

export async function getCourses(): Promise<Course[]> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COURSES_TABLE)
            .select('*')
            .order('createdAt', { ascending: false });

        if (error) throw error;
        return (data || []) as Course[];
    } catch (error) {
        console.error("Error fetching courses:", error);
        return [];
    }
}

export async function getCourse(courseId: string): Promise<Course | null> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(COURSES_TABLE)
            .select('*')
            .eq('id', courseId)
            .single();

        if (error) throw error;
        return data as Course;
    } catch (error) {
        console.error("Error fetching course:", error);
        return null;
    }
}

export async function addCourse(courseData: Partial<Course>): Promise<string> {
    try {
        const supabase = getSupabase();
        // Generate a random UUID-like ID for simplicity, or let Supabase auto-generate if we alter the schema to UUID.
        // But our schema is TEXT PRIMARY KEY, so we must provide an ID.
        const id = crypto.randomUUID();
        const newCourse = {
            ...courseData,
            id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sales: 0,
        };
        const { error } = await supabase
            .from(COURSES_TABLE)
            .insert(newCourse);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Error adding course:", error);
        throw error;
    }
}

export async function updateCourse(courseId: string, courseData: Partial<Course>): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COURSES_TABLE)
            .update({
                ...courseData,
                updatedAt: new Date().toISOString()
            })
            .eq('id', courseId);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating course:", error);
        throw error;
    }
}

export async function deleteCourse(courseId: string): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(COURSES_TABLE)
            .delete()
            .eq('id', courseId);
            
        if (error) throw error;
    } catch (error) {
        console.error("Error deleting course:", error);
        throw error;
    }
}

// --- Modules CRUD ---

export async function getModules(courseId: string): Promise<Module[]> {
    try {
        const supabase = getSupabase();
        const { data, error } = await supabase
            .from(MODULES_TABLE)
            .select('*')
            .eq('courseId', courseId)
            .order('createdAt', { ascending: true }); // Oldest first as requested

        if (error) throw error;
        return (data || []) as Module[];
    } catch (error) {
        console.error("Error fetching modules:", error);
        return [];
    }
}

export async function addModule(courseId: string, moduleData: Partial<Module>): Promise<string> {
    try {
        const supabase = getSupabase();
        const id = crypto.randomUUID();
        const newModule = {
            ...moduleData,
            id,
            courseId,
            createdAt: new Date().toISOString()
        };
        const { error } = await supabase
            .from(MODULES_TABLE)
            .insert(newModule);

        if (error) throw error;
        return id;
    } catch (error) {
        console.error("Error adding module:", error);
        throw error;
    }
}

export async function updateModule(courseId: string, moduleId: string, moduleData: Partial<Module>): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(MODULES_TABLE)
            .update(moduleData)
            .eq('id', moduleId)
            .eq('courseId', courseId);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating module:", error);
        throw error;
    }
}

export async function deleteModule(courseId: string, moduleId: string): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(MODULES_TABLE)
            .delete()
            .eq('id', moduleId)
            .eq('courseId', courseId);

        if (error) throw error;
    } catch (error) {
        console.error("Error deleting module:", error);
        throw error;
    }
}

export async function updateModuleLessons(courseId: string, moduleId: string, lessons: Lesson[]): Promise<void> {
    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from(MODULES_TABLE)
            .update({ lessons })
            .eq('id', moduleId)
            .eq('courseId', courseId);

        if (error) throw error;
    } catch (error) {
        console.error("Error updating lessons:", error);
        throw error;
    }
}
