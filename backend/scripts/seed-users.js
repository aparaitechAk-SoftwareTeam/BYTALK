import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../src/models/User.js';

const uri = process.env.MONGODB_URI;
if (!uri) {
  throw new Error('MONGODB_URI must be configured in backend/.env before seeding.');
}

const testUsers = [
  {
    name: 'Avery Stone',
    email: 'avery.stone.test@bytalk.example',
    password: 'BytalkTest123!',
    profilePhotoUrl: 'https://i.pravatar.cc/200?img=12',
    bio: 'Fictional BYTALK test account for English practice.',
    country: 'Canada',
    nativeLanguage: 'French',
    learningLanguage: 'English',
    level: 'Intermediate',
  },
  {
    name: 'Milo River',
    email: 'milo.river.test@bytalk.example',
    password: 'BytalkTest123!',
    profilePhotoUrl: 'https://i.pravatar.cc/200?img=32',
    bio: 'Fictional BYTALK test account for conversation testing.',
    country: 'Australia',
    nativeLanguage: 'English',
    learningLanguage: 'Spanish',
    level: 'Beginner',
  },
  {
    name: 'Nora Vale',
    email: 'nora.vale.test@bytalk.example',
    password: 'BytalkTest123!',
    profilePhotoUrl: 'https://i.pravatar.cc/200?img=47',
    bio: 'Fictional BYTALK test account for calls and messaging.',
    country: 'Ireland',
    nativeLanguage: 'English',
    learningLanguage: 'Japanese',
    level: 'Intermediate',
  },
];

await mongoose.connect(uri);
try {
  for (const testUser of testUsers) {
    const { password, ...profile } = testUser;
    await User.updateOne(
      { email: profile.email.toLowerCase() },
      {
        $set: profile,
        $setOnInsert: { passwordHash: await bcrypt.hash(password, 12) },
      },
      { upsert: true, runValidators: true }
    );
    console.log(`Seeded ${profile.email}`);
  }
  console.log(`Seed complete: ${testUsers.length} fictional users are available.`);
} finally {
  await mongoose.disconnect();
}
