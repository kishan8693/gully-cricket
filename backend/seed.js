import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';
import Team from './models/Team.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/night_cricket';

const DEFAULT_TEAMS = [
  {
    name: 'Kolkata Knight Riders',
    shortName: 'KKR',
    logo: 'https://upload.wikimedia.org/wikipedia/en/4/4c/Kolkata_Knight_Riders_Logo.svg',
    primaryColor: '#3a1f8c',
    secondaryColor: '#f0c040'
  },
  {
    name: 'Chennai Super Kings',
    shortName: 'CSK',
    logo: 'https://upload.wikimedia.org/wikipedia/en/2/2e/Chennai_Super_Kings_Logo.svg',
    primaryColor: '#1a3a8c',
    secondaryColor: '#f0c040'
  },
  {
    name: 'Gujarat Titans',
    shortName: 'GT',
    logo: 'https://upload.wikimedia.org/wikipedia/en/0/09/Gujarat_Titans_Logo.svg',
    primaryColor: '#1a5c8c',
    secondaryColor: '#c07820'
  }
];

const DEFAULT_ADMIN_PICTURE = 'https://ui-avatars.com/api/?name=Admin&background=1e293b&color=f8fafc';
const DEFAULT_USER_PICTURE = 'https://ui-avatars.com/api/?name=User&background=334155&color=f8fafc';

// Note: User schema requires minimum password length 6.
// So we seed with 123123 (instead of 123).
const DEFAULT_PASSWORD = '123123';

const ADMIN_USERNAMES = new Set(['jaysingh', 'kishan', 'shankar', 'bhavin']);

const SEED_USERNAMES = [
  'Jaysingh',
  'Vipul',
  'Harish',
  'Dhaval',
  'Jigo',
  'Ajay',
  'Suman',
  'Abhishek',
  'Sachin',
  'Devo',
  'Kallu',
  'Bhavu',
  'Kishan',
  'Raja',
  'Nandu',
  'Gopal',
  'Arjun',
  'Kano',
  'Aryan',
  'RCB Jaymin',
  'Gokul',
  'Bholo',
  'Shankar',
  'Mayur',
  'Vishal Alu Kaka',
  'Rahul',
  'Rudra',
  'Jatin',
  'Gedo',
  'Raj Baua',
  'Nilesh',
  'Vishal',
  // Explicitly included since requested as admin.
  'Bhavin'
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected');

    // Keep legacy admin account.
    const existingAdmin = await User.findOne({ username: 'admin' });
    if (!existingAdmin) {
      await User.create({
        username: 'admin',
        password: 'admin123',
        role: 'admin',
        profileImage: DEFAULT_ADMIN_PICTURE
      });
      console.log('Admin created: admin / admin123');
    } else {
      if (!existingAdmin.profileImage) {
        existingAdmin.profileImage = DEFAULT_ADMIN_PICTURE;
        await existingAdmin.save();
      }
      console.log('Admin already exists');
    }

    // Seed requested users.
    let createdCount = 0;
    let updatedCount = 0;
    for (const username of SEED_USERNAMES) {
      const role = ADMIN_USERNAMES.has(username.toLowerCase()) ? 'admin' : 'user';
      const profileImage = role === 'admin' ? DEFAULT_ADMIN_PICTURE : DEFAULT_USER_PICTURE;

      const existing = await User.findOne({ username });
      if (!existing) {
        await User.create({
          username,
          password: DEFAULT_PASSWORD,
          role,
          profileImage
        });
        createdCount += 1;
      } else {
        let changed = false;
        if (existing.role !== role) {
          existing.role = role;
          changed = true;
        }
        if (!existing.profileImage) {
          existing.profileImage = profileImage;
          changed = true;
        }
        if (changed) {
          await existing.save();
          updatedCount += 1;
        }
      }
    }
    console.log(`Users seeded. created=${createdCount}, updated=${updatedCount}, password=${DEFAULT_PASSWORD}`);

    for (const t of DEFAULT_TEAMS) {
      const exists = await Team.findOne({ name: t.name });
      if (!exists) {
        await Team.create(t);
        console.log('Team created:', t.name);
      } else {
        let changed = false;
        if (!exists.logo && t.logo) {
          exists.logo = t.logo;
          changed = true;
        }
        if (!exists.primaryColor && t.primaryColor) {
          exists.primaryColor = t.primaryColor;
          changed = true;
        }
        if (!exists.secondaryColor && t.secondaryColor) {
          exists.secondaryColor = t.secondaryColor;
          changed = true;
        }
        if (changed) {
          await exists.save();
          console.log('Team updated with branding:', t.name);
        } else {
          console.log('Team exists:', t.name);
        }
      }
    }
    console.log('Seed done.');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
