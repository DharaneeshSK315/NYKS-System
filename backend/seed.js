const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB for seeding...');

        await User.deleteMany();

        const users = [
            {
                username: 'admin',
                email: 'admin@nyks.gov.in',
                password: 'admin123',
                role: 'admin'
            },
            {
                username: 'district_user',
                email: 'district@nyks.gov.in',
                password: 'password123',
                role: 'district_officer'
            },
            {
                username: 'field_user',
                email: 'field@nyks.gov.in',
                password: 'password123',
                role: 'field_officer'
            }
        ];

        for (const u of users) {
            const newUser = new User(u);
            await newUser.save();
        }

        console.log('✅ Role-based users created successfully!');
        process.exit();
    } catch (err) {
        console.error('❌ Seeding Error:', err);
        process.exit(1);
    }
};

seedUsers();
