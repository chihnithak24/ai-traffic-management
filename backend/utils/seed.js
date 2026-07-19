/**
 * seed.js - Database Seeder
 * Populates the database with sample traffic data for demonstration
 * Run: node utils/seed.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });

const Traffic = require('../models/Traffic');
const User = require('../models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/traffic_management';

const sampleTrafficData = [
  { areaName: 'MG Road Junction', latitude: 12.9716, longitude: 77.5946, vehicleCount: 85, signalStatus: 'Red' },
  { areaName: 'Silk Board Flyover', latitude: 12.9172, longitude: 77.6228, vehicleCount: 120, signalStatus: 'Red' },
  { areaName: 'Hebbal Interchange', latitude: 13.0358, longitude: 77.5970, vehicleCount: 45, signalStatus: 'Yellow' },
  { areaName: 'Whitefield Main Road', latitude: 12.9698, longitude: 77.7499, vehicleCount: 60, signalStatus: 'Green' },
  { areaName: 'Marathahalli Bridge', latitude: 12.9561, longitude: 77.7009, vehicleCount: 95, signalStatus: 'Red' },
  { areaName: 'KR Puram Signal', latitude: 13.0050, longitude: 77.6942, vehicleCount: 20, signalStatus: 'Green' },
  { areaName: 'Indiranagar 100ft Road', latitude: 12.9784, longitude: 77.6408, vehicleCount: 35, signalStatus: 'Green' },
  { areaName: 'Koramangala 7th Block', latitude: 12.9352, longitude: 77.6245, vehicleCount: 75, signalStatus: 'Yellow' },
  { areaName: 'BTM Layout Junction', latitude: 12.9165, longitude: 77.6101, vehicleCount: 50, signalStatus: 'Yellow' },
  { areaName: 'Electronic City Toll', latitude: 12.8458, longitude: 77.6646, vehicleCount: 110, signalStatus: 'Red' },
  { areaName: 'Yeshwantpur Circle', latitude: 13.0218, longitude: 77.5450, vehicleCount: 15, signalStatus: 'Green' },
  { areaName: 'Rajajinagar 5th Block', latitude: 12.9919, longitude: 77.5539, vehicleCount: 40, signalStatus: 'Green' },
];

const seedDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected for seeding');

    // Clear existing data
    await Traffic.deleteMany({});
    console.log('🗑️  Cleared existing traffic data');

    // Insert sample data
    await Traffic.insertMany(sampleTrafficData);
    console.log(`✅ Seeded ${sampleTrafficData.length} traffic locations`);

    // Create demo admin user if not exists
    const existingUser = await User.findOne({ email: 'admin@traffic.com' });
    if (!existingUser) {
      await User.create({
        name: 'Admin User',
        email: 'admin@traffic.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('✅ Demo admin created: admin@traffic.com / admin123');
    }

    console.log('\n🎉 Database seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err.message);
    process.exit(1);
  }
};

seedDB();
