import mongoose from 'mongoose';
import 'dotenv/config';

async function clearUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smart-attendance');
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const result = await User.deleteMany({});
    console.log(`Deleted ${result.deletedCount} users`);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

clearUsers();