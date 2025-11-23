/**
 * Data Migration Script: Classroom → ClassroomDefinition
 * 
 * This script migrates existing Classroom records to ClassroomDefinition
 * and creates ClassroomOffering and StudentEnrollment records.
 * 
 * IMPORTANT: Run this BEFORE applying the schema migration that removes
 * the Classroom model and Student.class_id field.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-classroom-to-definition.ts
 */

/// <reference types="node" />

import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function migrateClassrooms() {
  console.log('Starting Classroom → ClassroomDefinition migration...\n');

  try {
    // Get all Classroom records
    const classrooms = await (prisma as any).classroom.findMany({
      include: {
        students: {
          where: {
            deleted_at: null, // Only migrate active students
          },
        },
      },
    });

    console.log(`Found ${classrooms.length} Classroom records to migrate\n`);

    let migratedDefinitions = 0;
    let migratedOfferings = 0;
    let migratedEnrollments = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const classroom of classrooms) {
      try {
        console.log(`Processing Classroom: ${classroom.name} (${classroom.school_id})`);

        // Step 1: Find or create ClassroomDefinition
        let definition = await (prisma as any).classroomDefinition.findUnique({
          where: {
            school_id_name: {
              school_id: classroom.school_id,
              name: classroom.name,
            },
          },
        });

        if (!definition) {
          definition = await (prisma as any).classroomDefinition.create({
            data: {
              school_id: classroom.school_id,
              name: classroom.name,
              level: null, // Legacy classrooms don't have levels
              is_archived: false,
            },
          });
          migratedDefinitions++;
          console.log(`  ✓ Created ClassroomDefinition: ${definition.id}`);
        } else {
          console.log(`  - ClassroomDefinition already exists: ${definition.id}`);
        }

        // Step 2: Get active academic year for this school
        const activeYear = await (prisma as any).academicYear.findFirst({
          where: {
            school_id: classroom.school_id,
            status: 'active',
          },
          orderBy: { start_date: 'desc' },
        });

        // If no active year, try to get the most recent year
        const academicYear = activeYear || await (prisma as any).academicYear.findFirst({
          where: { school_id: classroom.school_id },
          orderBy: { start_date: 'desc' },
        });

        if (!academicYear) {
          console.log(`  ⚠ No academic year found for school ${classroom.school_id}. Skipping offering/enrollment creation.`);
          skipped++;
          continue;
        }

        // Step 3: Find or create ClassroomOffering
        let offering = await (prisma as any).classroomOffering.findUnique({
          where: {
            academic_year_id_classroom_definition_id: {
              academic_year_id: academicYear.id,
              classroom_definition_id: definition.id,
            },
          },
        });

        if (!offering) {
          offering = await (prisma as any).classroomOffering.create({
            data: {
              academic_year_id: academicYear.id,
              classroom_definition_id: definition.id,
              display_name: null,
              is_active: true,
            },
          });
          migratedOfferings++;
          console.log(`  ✓ Created ClassroomOffering: ${offering.id}`);
        } else {
          console.log(`  - ClassroomOffering already exists: ${offering.id}`);
        }

        // Step 4: Create StudentEnrollment records for students in this classroom
        const students = classroom.students || [];
        console.log(`  Processing ${students.length} students...`);

        for (const student of students) {
          // Check if enrollment already exists
          const existingEnrollment = await (prisma as any).studentEnrollment.findFirst({
            where: {
              student_id: student.id,
              academic_year_id: academicYear.id,
              end_date: null, // Active enrollment
            },
          });

          if (existingEnrollment) {
            console.log(`    - Student ${student.id} already has an active enrollment`);
            continue;
          }

          // Create enrollment
          await (prisma as any).studentEnrollment.create({
            data: {
              student_id: student.id,
              classroom_offering_id: offering.id,
              academic_year_id: academicYear.id,
              start_date: student.created_at || new Date(),
              status: 'active',
            },
          });
          migratedEnrollments++;
          console.log(`    ✓ Created enrollment for student ${student.id}`);
        }

        console.log('');
      } catch (error: any) {
        const errorMsg = `Error processing Classroom ${classroom.id}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`  ✗ ${errorMsg}`);
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`ClassroomDefinitions created: ${migratedDefinitions}`);
    console.log(`ClassroomOfferings created: ${migratedOfferings}`);
    console.log(`StudentEnrollments created: ${migratedEnrollments}`);
    console.log(`Skipped (no academic year): ${skipped}`);
    console.log(`Errors: ${errors.length}`);

    if (errors.length > 0) {
      console.log('\n=== Errors ===');
      errors.forEach((err) => console.error(`  - ${err}`));
    }

    console.log('\n✓ Migration completed!');
    console.log('\n⚠ IMPORTANT: Review the results above before proceeding.');
    console.log('⚠ Next step: Apply the schema migration to remove Classroom model.');
  } catch (error) {
    console.error('Fatal error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateClassrooms()
  .then(() => {
    console.log('\nMigration script finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration script failed:', error);
    process.exit(1);
  });
