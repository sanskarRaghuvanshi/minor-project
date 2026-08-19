import 'dotenv/config';
import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const seedConfig = {
  branches: [
    {
      name: 'Computer Science Engineering',
      code: 'CS',
      short: 'CSE',
      subjects: ['Data Structures', 'Algorithms', 'Database Systems', 'Operating Systems', 'Computer Networks'],
    },
    {
      name: 'Electronics and Communication',
      code: 'EC',
      short: 'ECE',
      subjects: ['Analog Circuits', 'Digital Signal Processing', 'Microprocessors', 'VLSI Design', 'Communication Systems'],
    },
    {
      name: 'Mechanical Engineering',
      code: 'ME',
      short: 'MECH',
      subjects: ['Thermodynamics', 'Fluid Mechanics', 'Strength of Materials', 'Manufacturing Processes', 'Machine Design'],
    },
    {
      name: 'Civil Engineering',
      code: 'CV',
      short: 'CIVIL',
      subjects: ['Structural Analysis', 'Geotechnical Engineering', 'Transportation Engineering', 'Environmental Engineering', 'Surveying'],
    },
    {
      name: 'Information Technology',
      code: 'IT',
      short: 'IT',
      subjects: ['Web Development', 'Cloud Computing', 'Cyber Security', 'Data Science', 'Software Engineering'],
    },
  ],
  classes: ['First Year', 'Second Year', 'Third Year', 'Fourth Year'],
  sectionsCount: 4,
  users: {
    admin: { name: 'System Admin', email: 'admin@test.com', password: 'admin123' },
    coordinator: { name: 'Test Coordinator', email: 'coordinator@test.com', password: 'coordinator123' },
    faculty: { name: 'Test Faculty', email: 'faculty@test.com', password: 'faculty123' },
    student: { name: 'Test Student', email: 'student@test.com', password: 'student123' },
  },
};

const getSections = (code) => Array.from({ length: seedConfig.sectionsCount }, (_, i) => `${code}${i + 1}`);

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-attendance', {
      maxPoolSize: 10,
    });
    logger.info('Connected to MongoDB for seeding');

    const existingBranches = await Branch.countDocuments();
    if (existingBranches > 0) {
      logger.info('Branches already exist. Updating codes and sections.');
      for (const branch of seedConfig.branches) {
        await Branch.updateOne(
          { name: branch.name },
          { $set: { code: branch.code, sections: getSections(branch.code) } },
        );
      }
    } else {
      const branches = seedConfig.branches.map((branch) => ({
        name: branch.name,
        code: branch.code,
        sections: getSections(branch.code),
        classes: seedConfig.classes.map((className) => ({
          name: className,
          subjects: branch.subjects,
        })),
      }));

      await Branch.insertMany(branches);
      logger.info(`Seeded ${branches.length} branches × ${seedConfig.classes.length} classes`);
    }

    for (const [role, userData] of Object.entries(seedConfig.users)) {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
        logger.info(`${role} user ${userData.email} already exists. Skipping.`);
        continue;
      }

      const commonFields = {
        name: userData.name,
        email: userData.email,
        password: userData.password,
        role,
        branch: 'Computer Science Engineering',
        className: role === 'student' ? 'First Year' : 'Faculty Pool',
        section: role === 'student' ? 'CS1' : '',
        isActive: true,
        ...(role === 'coordinator' && {
          className: 'Second Year',
          section: 'CS1',
          subjects: ['Data Structures', 'Algorithms', 'Database Systems'],
        }),
        ...(role === 'faculty' && {
          className: 'Second Year',
          section: 'CS1',
          subjects: ['Data Structures', 'Algorithms', 'Database Systems'],
        }),
      };

      await User.create(commonFields);
      logger.info(`Created ${role} user: ${userData.email} / password: ${userData.password}`);
    }

    logger.info('Seed complete');
    logger.info('Credentials:');
    logger.info(JSON.stringify(seedConfig.users, null, 2));
  } catch (error) {
    logger.error({ error: error.message }, 'Seeding failed');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedDatabase();
