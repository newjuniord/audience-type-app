import { ICourseRepository } from "./types";
import { Course, Module } from "@/lib/types";
import { getCourses, getCourse, addCourse, updateCourse, deleteCourse, getModules } from "@/lib/courses";

export class CourseRepository implements ICourseRepository {
    async getAll(): Promise<Course[]> {
        try {
            const data = await getCourses();
            return data || [];
        } catch (error) {
            return [];
        }
    }

    async getById(id: string): Promise<Course | null> {
        try {
            const course = await getCourse(id);
            return course || null;
        } catch (error) {
            return null;
        }
    }

    async getModules(courseId: string): Promise<Module[]> {
        return await getModules(courseId);
    }

    async create(data: Partial<Course>): Promise<string> {
        return await addCourse(data);
    }

    async update(id: string, data: Partial<Course>): Promise<void> {
        return await updateCourse(id, data);
    }

    async delete(id: string): Promise<void> {
        return await deleteCourse(id);
    }
}

export const courseRepository = new CourseRepository();
