/**
 * seed.js — Seeds DB with 20 Indian city traffic locations
 * Run: node utils/seed.js
 */
require('dotenv').config({ path: '../.env' });
const mongoose     = require('mongoose');
const Traffic      = require('../models/Traffic');
const User         = require('../models/User');
const Notification = require('../models/Notification');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ai_traffic_v2';

const locations = [
  { areaName: 'Silk Board Junction',     city: 'Bengaluru',  state: 'Karnataka',      latitude: 12.9172, longitude: 77.6228, vehicleCount: 130, signalStatus: 'Red' },
  { areaName: 'MG Road',                 city: 'Bengaluru',  state: 'Karnataka',      latitude: 12.9756, longitude: 77.6097, vehicleCount: 75,  signalStatus: 'Yellow' },
  { areaName: 'Bandra-Kurla Complex',    city: 'Mumbai',     state: 'Maharashtra',    latitude: 19.0651, longitude: 72.8680, vehicleCount: 110, signalStatus: 'Red' },
  { areaName: 'Marine Drive',            city: 'Mumbai',     state: 'Maharashtra',    latitude: 18.9437, longitude: 72.8231, vehicleCount: 45,  signalStatus: 'Green' },
  { areaName: 'Connaught Place',         city: 'Delhi',      state: 'Delhi',          latitude: 28.6315, longitude: 77.2167, vehicleCount: 95,  signalStatus: 'Red' },
  { areaName: 'ITO Crossing',            city: 'Delhi',      state: 'Delhi',          latitude: 28.6279, longitude: 77.2410, vehicleCount: 120, signalStatus: 'Red' },
  { areaName: 'Anna Salai',              city: 'Chennai',    state: 'Tamil Nadu',     latitude: 13.0569, longitude: 80.2425, vehicleCount: 85,  signalStatus: 'Yellow' },
  { areaName: 'Koyambedu Junction',      city: 'Chennai',    state: 'Tamil Nadu',     latitude: 13.0693, longitude: 80.1948, vehicleCount: 60,  signalStatus: 'Green' },
  { areaName: 'Park Street',             city: 'Kolkata',    state: 'West Bengal',    latitude: 22.5553, longitude: 88.3516, vehicleCount: 55,  signalStatus: 'Green' },
  { areaName: 'Howrah Bridge',           city: 'Kolkata',    state: 'West Bengal',    latitude: 22.5851, longitude: 88.3467, vehicleCount: 100, signalStatus: 'Red' },
  { areaName: 'FC Road',                 city: 'Pune',       state: 'Maharashtra',    latitude: 18.5236, longitude: 73.8478, vehicleCount: 42,  signalStatus: 'Green' },
  { areaName: 'Shivaji Nagar',           city: 'Pune',       state: 'Maharashtra',    latitude: 18.5308, longitude: 73.8476, vehicleCount: 68,  signalStatus: 'Yellow' },
  { areaName: 'CG Road',                 city: 'Ahmedabad',  state: 'Gujarat',        latitude: 23.0302, longitude: 72.5564, vehicleCount: 73,  signalStatus: 'Yellow' },
  { areaName: 'Majestic Bus Stand',      city: 'Bengaluru',  state: 'Karnataka',      latitude: 12.9767, longitude: 77.5713, vehicleCount: 140, signalStatus: 'Red' },
  { areaName: 'Jubilee Hills Checkpost', city: 'Hyderabad',  state: 'Telangana',      latitude: 17.4326, longitude: 78.4071, vehicleCount: 88,  signalStatus: 'Red' },
  { areaName: 'Tank Bund Road',          city: 'Hyderabad',  state: 'Telangana',      latitude: 17.4239, longitude: 78.4738, vehicleCount: 35,  signalStatus: 'Green' },
  { areaName: 'Rajiv Chowk',             city: 'Delhi',      state: 'Delhi',          latitude: 28.6340, longitude: 77.2188, vehicleCount: 155, signalStatus: 'Red', congestionLevel: 'High' },
  { areaName: 'Linking Road',            city: 'Mumbai',     state: 'Maharashtra',    latitude: 19.0543, longitude: 72.8402, vehicleCount: 20,  signalStatus: 'Green' },
  { areaName: 'Whitefield Main',         city: 'Bengaluru',  state: 'Karnataka',      latitude: 12.9698, longitude: 77.7499, vehicleCount: 90,  signalStatus: 'Red' },
  { areaName: 'Electronic City Phase-1', city: 'Bengaluru',  state: 'Karnataka',      latitude: 12.8456, longitude: 77.6603, vehicleCount: 112, signalStatus: 'Red' },
];

const notifications = [
  { title: '🚦 High Congestion Alert', message: 'Rajiv Chowk Delhi — 155 vehicles detected', type: 'danger', area: 'Rajiv Chowk' },
  { title: '🚧 Peak Hour Warning',     message: 'Silk Board Bengaluru — Expect 45 min delay', type: 'warning', area: 'Silk Board' },
  { title: '✅ Signal Optimized',      message: 'Marine Drive Mumbai — AI adjusted to 20s', type: 'success', area: 'Marine Drive' },
  { title: '🚨 Emergency Active',      message: 'Ambulance routed via ITO Crossing', type: 'emergency', area: 'ITO Crossing' },
  { title: '📊 Daily Report Ready',    message: 'Traffic analytics report generated for today', type: 'info' },
];

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected');

    await Traffic.deleteMany({});
    await Notification.deleteMany({});
    await Traffic.insertMany(locations);
    console.log(`✅ Seeded ${locations.length} traffic locations`);

    await Notification.insertMany(notifications);
    console.log(`✅ Seeded ${notifications.length} notifications`);

    const exists = await User.findOne({ email: 'admin@traffic.ai' });
    if (!exists) {
      await User.create({ name: 'Admin User', email: 'admin@traffic.ai', password: 'admin123', role: 'admin' });
      console.log('✅ Demo user: admin@traffic.ai / admin123');
    }
    console.log('\n🎉 Seed complete!');
    process.exit(0);
  } catch (e) { console.error(e.message); process.exit(1); }
})();
