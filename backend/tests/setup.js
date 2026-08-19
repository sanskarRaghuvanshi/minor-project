import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Branch from '../models/Branch.js';
import User from '../models/User.js';

let mongoServer;

export const startDb = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
};

export const stopDb = async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
};

export const clearDb = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

export const seedTestData = async () => {
  await Branch.create({
    name: 'Computer Science Engineering',
    code: 'CS',
    sections: ['CS1', 'CS2', 'CS3', 'CS4'],
    classes: [
      {
        name: 'First Year',
        subjects: ['Data Structures', 'Algorithms', 'Database Systems'],
      },
    ],
  });

  const admin = await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    password: await bcrypt.hash('admin123', 12),
    role: 'admin',
    branch: 'Computer Science Engineering',
    className: 'First Year',
  });

  const coordinator = await User.create({
    name: 'Coordinator',
    email: 'coordinator@test.com',
    password: await bcrypt.hash('coordinator123', 12),
    role: 'coordinator',
    branch: 'Computer Science Engineering',
    className: 'First Year',
    section: 'CS1',
    subjects: ['Data Structures', 'Algorithms'],
  });

  const faculty = await User.create({
    name: 'Faculty',
    email: 'faculty@test.com',
    password: await bcrypt.hash('faculty123', 12),
    role: 'faculty',
    branch: 'Computer Science Engineering',
    className: 'First Year',
    section: 'CS1',
    subjects: ['Data Structures', 'Algorithms'],
  });

  const student = await User.create({
    name: 'Student',
    email: 'student@test.com',
    password: await bcrypt.hash('student123', 12),
    role: 'student',
    branch: 'Computer Science Engineering',
    className: 'First Year',
    section: 'CS1',
  });

  return { admin, coordinator, faculty, student };
};
