import 'dotenv/config';
import mongoose from 'mongoose';
import Branch from '../models/Branch.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const FIRST_NAMES = ['Aarav', 'Aditi', 'Arjun', 'Bhavna', 'Chirag', 'Deepika', 'Divya', 'Gaurav', 'Isha', 'Karan',
  'Kavya', 'Lakshmi', 'Manish', 'Neha', 'Nikhil', 'Pooja', 'Prakash', 'Priya', 'Rahul', 'Riya',
  'Rohit', 'Sakshi', 'Sanjay', 'Shreya', 'Siddharth', 'Sneha', 'Soham', 'Sonia', 'Tanvi', 'Varun',
  'Vikas', 'Yash', 'Amit', 'Anjali', 'Ankit', 'Anushka', 'Ashish', 'Avni', 'Dhruv', 'Esha',
  'Harsh', 'Jyoti', 'Kriti', 'Lalit', 'Mohit', 'Nandini', 'Om', 'Parul', 'Rajesh', 'Ritu'];

const LAST_NAMES = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Das', 'Mishra', 'Yadav', 'Agarwal',
  'Joshi', 'Chauhan', 'Mehta', 'Rao', 'Nair', 'Reddy', 'Pandey', 'Khanna', 'Saxena', 'Desai'];

const rollNumberCounter = {};

const getStudentData = (branch, className, index) => {
  const first = FIRST_NAMES[index % FIRST_NAMES.length];
  const last = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const name = `${first} ${last}`;

  const key = `${branch.short}-${className.replace(/\s/g, '')}`;
  rollNumberCounter[key] = (rollNumberCounter[key] || 0) + 1;
  const roll = `${branch.short}${className === 'First Year' ? '1' : className === 'Second Year' ? '2' : className === 'Third Year' ? '3' : '4'}${String(rollNumberCounter[key]).padStart(2, '0')}`;
  const email = `${roll.toLowerCase()}@${branch.short.toLowerCase()}.edu`;
  const section = `${branch.code}${(index % 4) + 1}`;

  return { name, email, roll, password: 'student123', section };
};

const seedStudents = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/smart-attendance', {
      maxPoolSize: 10,
    });
    logger.info('Connected to MongoDB for student seeding');

    const branches = await Branch.find({ isActive: true });
    if (!branches.length) {
      logger.error('No branches found. Run npm run seed first.');
      process.exit(1);
    }

    let studentCount = 0;
    let facultyCount = 0;

    for (const branch of branches) {
      const branchShort = branch.name.split(' ').map((w) => w[0]).join('').toUpperCase();

      const existingFaculty = await User.findOne({ role: 'faculty', branch: branch.name });
      if (!existingFaculty) {
        await User.create({
          name: `Dr. ${branch.name.split(' ')[0]} Faculty`,
          email: `faculty.${branchShort.toLowerCase()}@test.com`,
          password: 'faculty123',
          role: 'faculty',
          branch: branch.name,
          className: 'Second Year',
          section: `${branch.code || branchShort}1`,
          subjects: branch.classes[0]?.subjects?.slice(0, 3) || [],
          isActive: true,
        });
        facultyCount++;
        logger.info(`Created faculty for ${branch.name} -> faculty.${branchShort.toLowerCase()}@test.com / faculty123`);
      } else {
        logger.info(`Faculty already exists for ${branch.name}, skipping`);
      }

      for (const classObj of branch.classes) {
        const existing = await User.countDocuments({ role: 'student', branch: branch.name, className: classObj.name });
        if (existing >= 5) {
          logger.info(`${branch.name} / ${classObj.name}: ${existing} students exist, skipping`);
          continue;
        }

        const studentsNeeded = Math.max(0, 5 - existing);
        const students = [];

        for (let i = 0; i < 5; i++) {
          const data = getStudentData({ name: branch.name, short: branchShort, code: branch.code || branchShort }, classObj.name, i + studentCount);
          students.push({
            name: data.name,
            email: data.email,
            password: data.password,
            role: 'student',
            branch: branch.name,
            className: classObj.name,
            section: data.section,
            isActive: true,
          });
        }

        const created = await User.create(students);
        studentCount += created.length;
        logger.info(`Created ${created.length} students for ${branch.name} / ${classObj.name} (password: student123)`);
      }
    }

    logger.info(`Seeding complete. Created ${studentCount} students, ${facultyCount} faculty.`);
    logger.info('All student passwords: student123');
    logger.info('All faculty passwords: faculty123');
    logger.info('Existing admin: admin@test.com / admin123');
    logger.info('Existing faculty: faculty@test.com / faculty123');
    logger.info('Existing student: student@test.com / student123');
  } catch (error) {
    logger.error({ error: error.message }, 'Seeding failed');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

seedStudents();
