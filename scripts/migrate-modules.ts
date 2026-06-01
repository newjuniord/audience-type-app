import { getAdminDb } from '../lib/firebase-admin';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateModules() {
  const db = getAdminDb();
  console.log('Migrating modules subcollections...');
  
  // 1. Get all courses
  const coursesSnap = await db.collection('courses').get();
  
  for (const courseDoc of coursesSnap.docs) {
    const courseId = courseDoc.id;
    
    // 2. Get modules subcollection for this course
    const modulesSnap = await db.collection('courses').doc(courseId).collection('modules').get();
    
    for (const modDoc of modulesSnap.docs) {
        const data = modDoc.data();
        
        // Convert timestamp
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            data.createdAt = data.createdAt.toDate().toISOString();
        }

        // Keep lessons as array
        const lessons = data.lessons || [];

        const { error } = await supabase.from('modules').upsert({
            id: modDoc.id,
            courseId: courseId,
            title: data.title,
            lessons: lessons,
            duration: data.duration,
            createdAt: data.createdAt || new Date().toISOString()
        });

        if (error) {
            console.error(`Error migrating module ${modDoc.id} for course ${courseId}:`, error);
        } else {
            console.log(`Migrated module: ${modDoc.id} for course ${courseId}`);
        }
    }
  }
}

async function run() {
  await migrateModules();
  console.log('Modules migration complete!');
  process.exit(0);
}

run().catch(console.error);
