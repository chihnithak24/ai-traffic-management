/**
 * seed.js — Comprehensive India-wide traffic seed
 * 150+ real locations across all major states and cities
 * Run: node seed.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/traffic_management';

// ── Schemas ─────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, default: 'admin' }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const trafficSchema = new mongoose.Schema({
  areaName: String, city: String, state: String,
  latitude: Number, longitude: Number,
  vehicleCount: Number,
  vehicleBreakdown: {
    cars: Number, bikes: Number, buses: Number,
    trucks: Number, autos: Number, emergency: Number
  },
  trafficDensity: Number, averageSpeed: Number,
  signalStatus: String, congestionLevel: String,
  isEmergency: { type: Boolean, default: false },
  emergencyType: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const User    = mongoose.models.User    || mongoose.model('User',    userSchema);
const Traffic = mongoose.models.Traffic || mongoose.model('Traffic', trafficSchema);

// ── Helpers ──────────────────────────────────────────────────────────────────
const rand  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick  = arr => arr[rand(0, arr.length - 1)];

const calcAll = (vc) => {
  let density, level;
  if (vc < 50)       { density = Math.min(vc * 1.5, 40);                         level = 'Low'; }
  else if (vc <= 150){ density = 40 + ((vc - 50) / 100) * 30;                    level = 'Medium'; }
  else if (vc <= 300){ density = 70 + ((vc - 150) / 150) * 20;                   level = 'High'; }
  else               { density = Math.min(90 + ((vc - 300) / 100) * 10, 100);    level = 'High'; }
  const speed = Math.max(5, Math.round(80 - (density / 100) * 65));
  return { density: Math.round(density), level, speed };
};

const breakdown = (vc) => ({
  cars: Math.round(vc * 0.44), bikes: Math.round(vc * 0.37),
  buses: Math.round(vc * 0.06), trucks: Math.round(vc * 0.07),
  autos: Math.round(vc * 0.04), emergency: Math.max(1, Math.round(vc * 0.02))
});

const SIGNALS = ['Green', 'Red', 'Yellow', 'Green', 'Green', 'Green'];

// ── Location Master Data (150+ real Indian locations) ───────────────────────
// Format: [areaName, city, state, lat, lng, minVehicles, maxVehicles]
const RAW = [

  // ── TELANGANA ──────────────────────────────────────────────────────────────
  ['Madhapur Junction',            'Hyderabad',      'Telangana',        17.4483, 78.3915, 180, 340],
  ['HITEC City Main Gate',         'Hyderabad',      'Telangana',        17.4435, 78.3772, 200, 380],
  ['Ameerpet X Roads',             'Hyderabad',      'Telangana',        17.4375, 78.4483, 120, 260],
  ['Begumpet Flyover',             'Hyderabad',      'Telangana',        17.4456, 78.4594, 80,  170],
  ['Charminar Circle',             'Hyderabad',      'Telangana',        17.3616, 78.4747, 260, 420],
  ['Secunderabad Clock Tower',     'Hyderabad',      'Telangana',        17.4360, 78.4990, 100, 210],
  ['Gachibowli Ring Road',         'Hyderabad',      'Telangana',        17.4402, 78.3489, 150, 290],
  ['Jubilee Hills Check Post',     'Hyderabad',      'Telangana',        17.4322, 78.4078, 60,  140],
  ['Kukatpally Y Junction',        'Hyderabad',      'Telangana',        17.4849, 78.3996, 140, 280],
  ['LB Nagar Junction',            'Hyderabad',      'Telangana',        17.3490, 78.5497, 160, 300],
  ['Dilsukhnagar Main Rd',         'Hyderabad',      'Telangana',        17.3688, 78.5277, 130, 260],
  ['Tolichowki Signal',            'Hyderabad',      'Telangana',        17.3997, 78.4155, 90,  190],
  ['Miyapur Metro Station',        'Hyderabad',      'Telangana',        17.4967, 78.3562, 110, 220],
  ['Shamshabad Airport Road',      'Hyderabad',      'Telangana',        17.2403, 78.4294, 80,  170],
  ['Warangal Station Road',        'Warangal',       'Telangana',        17.9784, 79.5941, 60,  130],
  ['Kazipet Junction',             'Warangal',       'Telangana',        17.9680, 79.5050, 50,  110],
  ['Nizamabad Bus Stand',          'Nizamabad',      'Telangana',        18.6725, 78.0941, 40,  100],
  ['Karimnagar Main Road',         'Karimnagar',     'Telangana',        18.4386, 79.1288, 50,  120],

  // ── ANDHRA PRADESH ─────────────────────────────────────────────────────────
  ['Tadepalligudem Bus Stand',     'Tadepalligudem', 'Andhra Pradesh',   16.8126, 81.5236, 70,  150],
  ['Tadepalligudem NH-16',         'Tadepalligudem', 'Andhra Pradesh',   16.8200, 81.5300, 60,  130],
  ['Vijayawada Benz Circle',       'Vijayawada',     'Andhra Pradesh',   16.5062, 80.6480, 200, 370],
  ['Vijayawada Auto Nagar',        'Vijayawada',     'Andhra Pradesh',   16.4990, 80.6725, 150, 280],
  ['Vijayawada Governorpet',       'Vijayawada',     'Andhra Pradesh',   16.5193, 80.6304, 120, 240],
  ['RK Beach Road Vizag',          'Visakhapatnam',  'Andhra Pradesh',   17.7341, 83.3379, 60,  140],
  ['Dwaraka Nagar Vizag',          'Visakhapatnam',  'Andhra Pradesh',   17.7231, 83.3133, 80,  170],
  ['Gajuwaka Junction Vizag',      'Visakhapatnam',  'Andhra Pradesh',   17.6868, 83.2185, 100, 200],
  ['Steel Plant Area Vizag',       'Visakhapatnam',  'Andhra Pradesh',   17.6850, 83.2000, 90,  180],
  ['Guntur Brodipet',              'Guntur',         'Andhra Pradesh',   16.3067, 80.4365, 100, 210],
  ['Guntur Naaz Center',           'Guntur',         'Andhra Pradesh',   16.2991, 80.4575, 80,  170],
  ['Tirupati Alipiri',             'Tirupati',       'Andhra Pradesh',   13.6321, 79.4192, 120, 250],
  ['Tirupati Bus Stand',           'Tirupati',       'Andhra Pradesh',   13.6350, 79.4200, 140, 280],
  ['Kurnool Bus Station',          'Kurnool',        'Andhra Pradesh',   15.8281, 78.0373, 70,  150],
  ['Nellore Grand Trunk Rd',       'Nellore',        'Andhra Pradesh',   14.4426, 79.9865, 80,  160],
  ['Kakinada Main Road',           'Kakinada',       'Andhra Pradesh',   16.9891, 82.2475, 70,  150],
  ['Rajahmundry Bridge Road',      'Rajahmundry',    'Andhra Pradesh',   17.0005, 81.8040, 90,  180],
  ['Eluru Bus Stand',              'Eluru',          'Andhra Pradesh',   16.7140, 81.0960, 60,  130],
  ['Ongole Center',                'Ongole',         'Andhra Pradesh',   15.5057, 80.0498, 50,  120],

  // ── KARNATAKA ──────────────────────────────────────────────────────────────
  ['MG Road Signal Bengaluru',     'Bengaluru',      'Karnataka',        12.9756, 77.6059, 200, 370],
  ['Silk Board Junction',          'Bengaluru',      'Karnataka',        12.9172, 77.6227, 320, 480],
  ['Whitefield Main Road',         'Bengaluru',      'Karnataka',        12.9698, 77.7499, 180, 310],
  ['Koramangala 5th Block',        'Bengaluru',      'Karnataka',        12.9352, 77.6245, 90,  190],
  ['Hebbal Flyover',               'Bengaluru',      'Karnataka',        13.0358, 77.5970, 220, 390],
  ['Electronic City Toll',         'Bengaluru',      'Karnataka',        12.8458, 77.6624, 260, 420],
  ['Marathahalli Bridge',          'Bengaluru',      'Karnataka',        12.9591, 77.7022, 210, 360],
  ['KR Puram Signal',              'Bengaluru',      'Karnataka',        13.0094, 77.6961, 140, 270],
  ['Yeshwanthpur Circle',          'Bengaluru',      'Karnataka',        13.0283, 77.5502, 160, 300],
  ['Indiranagar 100 Feet Rd',      'Bengaluru',      'Karnataka',        12.9784, 77.6408, 120, 240],
  ['Mysuru Road Circle',           'Bengaluru',      'Karnataka',        12.9508, 77.5217, 130, 250],
  ['Mysuru Devaraja Market',       'Mysuru',         'Karnataka',        12.3052, 76.6551, 90,  190],
  ['Mysuru Ring Road',             'Mysuru',         'Karnataka',        12.2958, 76.6394, 70,  160],
  ['Hubli Station Road',           'Hubli',          'Karnataka',        15.3647, 75.1240, 80,  170],
  ['Mangaluru Hampankatta',        'Mangaluru',      'Karnataka',        12.8698, 74.8431, 100, 200],
  ['Belagavi Khanapur Road',       'Belagavi',       'Karnataka',        15.8497, 74.4977, 60,  140],

  // ── TAMIL NADU ─────────────────────────────────────────────────────────────
  ['Anna Salai Junction',          'Chennai',        'Tamil Nadu',       13.0569, 80.2521, 160, 290],
  ['Koyambedu Bus Stand',          'Chennai',        'Tamil Nadu',       13.0695, 80.1953, 210, 360],
  ['T Nagar Signal',               'Chennai',        'Tamil Nadu',       13.0418, 80.2341, 130, 260],
  ['Tambaram Toll Plaza',          'Chennai',        'Tamil Nadu',       12.9249, 80.1000, 180, 320],
  ['OMR Sholinganallur',           'Chennai',        'Tamil Nadu',       12.9010, 80.2279, 200, 350],
  ['Guindy Signal',                'Chennai',        'Tamil Nadu',       13.0067, 80.2206, 150, 270],
  ['Vadapalani Junction',          'Chennai',        'Tamil Nadu',       13.0527, 80.2120, 110, 230],
  ['Coimbatore Gandhipuram',       'Coimbatore',     'Tamil Nadu',       11.0183, 76.9725, 120, 250],
  ['Coimbatore RS Puram',          'Coimbatore',     'Tamil Nadu',       10.9971, 76.9556, 90,  190],
  ['Madurai Periyar Bus Stand',    'Madurai',        'Tamil Nadu',       9.9195,  78.1193, 110, 220],
  ['Salem Junction Road',          'Salem',          'Tamil Nadu',       11.6557, 78.1613, 80,  170],
  ['Tiruchirappalli Chatram',      'Tiruchirappalli','Tamil Nadu',       10.7905, 78.7047, 90,  190],
  ['Tirunelveli Palayamkottai',    'Tirunelveli',    'Tamil Nadu',       8.7139,  77.7567, 70,  150],

  // ── MAHARASHTRA ────────────────────────────────────────────────────────────
  ['Dadar West Junction',          'Mumbai',         'Maharashtra',      19.0176, 72.8561, 290, 440],
  ['Andheri East Signal',          'Mumbai',         'Maharashtra',      19.1136, 72.8697, 250, 400],
  ['Bandra-Worli Sea Link Entry',  'Mumbai',         'Maharashtra',      19.0596, 72.8295, 190, 340],
  ['Kurla LBS Road',               'Mumbai',         'Maharashtra',      19.0728, 72.8826, 210, 370],
  ['Thane Station Road',           'Thane',          'Maharashtra',      19.1924, 72.9615, 180, 320],
  ['Navi Mumbai Vashi Bridge',     'Navi Mumbai',    'Maharashtra',      19.0771, 73.0014, 160, 290],
  ['Borivali Dahisar Check Naka',  'Mumbai',         'Maharashtra',      19.2607, 72.8620, 220, 370],
  ['Pune FC Road',                 'Pune',           'Maharashtra',      18.5236, 73.8478, 130, 250],
  ['Pune Shivajinagar Circle',     'Pune',           'Maharashtra',      18.5308, 73.8474, 110, 220],
  ['Hinjawadi IT Park Gate',       'Pune',           'Maharashtra',      18.5912, 73.7389, 190, 330],
  ['Katraj Bypass Pune',           'Pune',           'Maharashtra',      18.4529, 73.8655, 140, 270],
  ['Nashik CBS',                   'Nashik',         'Maharashtra',      19.9975, 73.7898, 90,  190],
  ['Aurangabad Cidco',             'Aurangabad',     'Maharashtra',      19.8762, 75.3433, 80,  170],
  ['Nagpur Zero Mile',             'Nagpur',         'Maharashtra',      21.1458, 79.0882, 100, 210],
  ['Kolhapur Rajaram Road',        'Kolhapur',       'Maharashtra',      16.7050, 74.2433, 70,  150],

  // ── DELHI ──────────────────────────────────────────────────────────────────
  ['Connaught Place Outer Ring',   'New Delhi',      'Delhi',            28.6315, 77.2167, 210, 380],
  ['ITO Crossing',                 'New Delhi',      'Delhi',            28.6276, 77.2444, 270, 420],
  ['Karol Bagh Main Road',         'New Delhi',      'Delhi',            28.6517, 77.1889, 170, 300],
  ['Lajpat Nagar Central Market',  'New Delhi',      'Delhi',            28.5677, 77.2432, 140, 270],
  ['Rohini Sector 10',             'New Delhi',      'Delhi',            28.7393, 77.1159, 120, 240],
  ['Dwarka Sector 10',             'New Delhi',      'Delhi',            28.5893, 77.0457, 130, 260],
  ['Noida Sector 18',              'Noida',          'Uttar Pradesh',    28.5706, 77.3219, 160, 300],
  ['Gurgaon Golf Course Road',     'Gurgaon',        'Haryana',          28.4595, 77.0266, 200, 360],
  ['Gurgaon NH-48',                'Gurgaon',        'Haryana',          28.4726, 77.0409, 220, 380],
  ['Faridabad Old Bypass',         'Faridabad',      'Haryana',          28.4089, 77.3178, 110, 220],

  // ── WEST BENGAL ────────────────────────────────────────────────────────────
  ['Esplanade Junction Kolkata',   'Kolkata',        'West Bengal',      22.5726, 88.3639, 200, 360],
  ['Howrah Bridge Approach',       'Kolkata',        'West Bengal',      22.5851, 88.3468, 250, 400],
  ['Park Street Kolkata',          'Kolkata',        'West Bengal',      22.5531, 88.3517, 130, 260],
  ['Salt Lake Sector V',           'Kolkata',        'West Bengal',      22.5764, 88.4298, 140, 270],
  ['Dumdum Junction',              'Kolkata',        'West Bengal',      22.6441, 88.4003, 110, 220],
  ['Asansol GT Road',              'Asansol',        'West Bengal',      23.6739, 86.9524, 70,  150],

  // ── GUJARAT ───────────────────────────────────────────────────────────────
  ['Ahmedabad BRTS Naroda',        'Ahmedabad',      'Gujarat',          23.0470, 72.6419, 150, 290],
  ['Ahmedabad Sarkhej',            'Ahmedabad',      'Gujarat',          22.9828, 72.4990, 120, 240],
  ['Ahmedabad SG Road',            'Ahmedabad',      'Gujarat',          23.0433, 72.5275, 180, 320],
  ['Surat Ring Road',              'Surat',          'Gujarat',          21.1702, 72.8311, 140, 270],
  ['Surat Majura Gate',            'Surat',          'Gujarat',          21.2049, 72.8365, 100, 200],
  ['Vadodara Alkapuri',            'Vadodara',       'Gujarat',          22.3072, 73.1812, 90,  190],
  ['Rajkot Kalawad Road',          'Rajkot',         'Gujarat',          22.3039, 70.8022, 80,  170],
  ['Gandhinagar Sector 21',        'Gandhinagar',    'Gujarat',          23.2156, 72.6369, 60,  140],

  // ── RAJASTHAN ─────────────────────────────────────────────────────────────
  ['Jaipur MI Road',               'Jaipur',         'Rajasthan',        26.9124, 75.7873, 150, 280],
  ['Jaipur Vaishali Nagar',        'Jaipur',         'Rajasthan',        26.9291, 75.7470, 110, 220],
  ['Jodhpur Clock Tower',          'Jodhpur',        'Rajasthan',        26.2967, 73.0236, 80,  170],
  ['Udaipur Chetak Circle',        'Udaipur',        'Rajasthan',        24.5854, 73.7125, 70,  150],
  ['Kota Gumanpura',               'Kota',           'Rajasthan',        25.1810, 75.8387, 80,  160],

  // ── UTTAR PRADESH ─────────────────────────────────────────────────────────
  ['Lucknow Hazratganj',           'Lucknow',        'Uttar Pradesh',    26.8467, 80.9462, 160, 300],
  ['Lucknow Charbagh',             'Lucknow',        'Uttar Pradesh',    26.8289, 80.9099, 180, 330],
  ['Kanpur Mall Road',             'Kanpur',         'Uttar Pradesh',    26.4499, 80.3319, 130, 250],
  ['Agra MG Road',                 'Agra',           'Uttar Pradesh',    27.1767, 78.0081, 110, 220],
  ['Varanasi Godowlia',            'Varanasi',       'Uttar Pradesh',    25.3176, 83.0062, 100, 210],
  ['Allahabad Civil Lines',        'Prayagraj',      'Uttar Pradesh',    25.4358, 81.8463, 90,  190],
  ['Meerut Hapur Bypass',          'Meerut',         'Uttar Pradesh',    28.9845, 77.7064, 100, 200],
  ['Ghaziabad Raj Nagar',          'Ghaziabad',      'Uttar Pradesh',    28.6692, 77.4538, 130, 260],

  // ── MADHYA PRADESH ────────────────────────────────────────────────────────
  ['Bhopal New Market',            'Bhopal',         'Madhya Pradesh',   23.2332, 77.4341, 120, 240],
  ['Bhopal DB Mall Road',          'Bhopal',         'Madhya Pradesh',   23.2149, 77.4439, 90,  190],
  ['Indore Vijay Nagar',           'Indore',         'Madhya Pradesh',   22.7533, 75.8937, 140, 270],
  ['Indore Rajwada',               'Indore',         'Madhya Pradesh',   22.7196, 75.8577, 110, 220],
  ['Jabalpur Russell Chowk',       'Jabalpur',       'Madhya Pradesh',   23.1815, 79.9864, 80,  170],
  ['Gwalior Lashkar',              'Gwalior',        'Madhya Pradesh',   26.2124, 78.1772, 80,  160],

  // ── PUNJAB & HARYANA ──────────────────────────────────────────────────────
  ['Chandigarh Sector 17',         'Chandigarh',     'Chandigarh',       30.7402, 76.7764, 100, 210],
  ['Chandigarh Tribune Chowk',     'Chandigarh',     'Chandigarh',       30.7046, 76.8003, 110, 220],
  ['Ludhiana Ferozepur Road',      'Ludhiana',       'Punjab',           30.8766, 75.8344, 130, 260],
  ['Amritsar Hall Bazaar',         'Amritsar',       'Punjab',           31.6340, 74.8723, 110, 220],
  ['Jalandhar Bus Stand',          'Jalandhar',      'Punjab',           31.3260, 75.5762, 90,  180],
  ['Ambala Highway',               'Ambala',         'Haryana',          30.3752, 76.7821, 80,  160],

  // ── BIHAR ─────────────────────────────────────────────────────────────────
  ['Patna Gandhi Maidan',          'Patna',          'Bihar',            25.6093, 85.1235, 130, 260],
  ['Patna Station Road',           'Patna',          'Bihar',            25.6059, 85.1198, 110, 230],
  ['Gaya Bus Stand',               'Gaya',           'Bihar',            24.7914, 84.9994, 70,  150],
  ['Bhagalpur Station Chowk',      'Bhagalpur',      'Bihar',            25.2425, 87.0021, 60,  130],

  // ── JHARKHAND ─────────────────────────────────────────────────────────────
  ['Ranchi Main Road',             'Ranchi',         'Jharkhand',        23.3441, 85.3096, 90,  190],
  ['Jamshedpur Bistupur',          'Jamshedpur',     'Jharkhand',        22.8046, 86.2029, 80,  170],
  ['Dhanbad Bank More',            'Dhanbad',        'Jharkhand',        23.7957, 86.4304, 70,  150],

  // ── ODISHA ────────────────────────────────────────────────────────────────
  ['Bhubaneswar Raj Mahal',        'Bhubaneswar',    'Odisha',           20.2961, 85.8245, 100, 210],
  ['Puri Grand Road',              'Puri',           'Odisha',           19.7983, 85.8245, 70,  150],
  ['Cuttack College Square',       'Cuttack',        'Odisha',           20.4625, 85.8830, 80,  170],

  // ── KERALA ────────────────────────────────────────────────────────────────
  ['Kochi MG Road',                'Kochi',          'Kerala',           9.9312,  76.2673, 130, 260],
  ['Kochi Edapally Junction',      'Kochi',          'Kerala',           10.0261, 76.3083, 160, 300],
  ['Thiruvananthapuram Palayam',   'Thiruvananthapuram','Kerala',        8.5241,  76.9366, 110, 220],
  ['Kozhikode Mananchira',         'Kozhikode',      'Kerala',           11.2588, 75.7804, 90,  190],
  ['Thrissur Round',               'Thrissur',       'Kerala',           10.5276, 76.2144, 80,  170],

  // ── ASSAM & NORTHEAST ─────────────────────────────────────────────────────
  ['Guwahati Paltan Bazaar',       'Guwahati',       'Assam',            26.1844, 91.7458, 100, 210],
  ['Guwahati GS Road',             'Guwahati',       'Assam',            26.1433, 91.7362, 90,  180],
  ['Silchar Rangirkhari',          'Silchar',        'Assam',            24.8333, 92.7789, 50,  120],
  ['Imphal BT Road',               'Imphal',         'Manipur',          24.8170, 93.9368, 50,  110],
  ['Agartala Motor Stand',         'Agartala',       'Tripura',          23.8315, 91.2868, 40,  100],

  // ── HIMACHAL & UTTARAKHAND ────────────────────────────────────────────────
  ['Shimla The Mall',              'Shimla',         'Himachal Pradesh', 31.1048, 77.1734, 60,  140],
  ['Dehradun Paltan Bazaar',       'Dehradun',       'Uttarakhand',      30.3165, 78.0322, 90,  190],
  ['Haridwar Har Ki Pauri',        'Haridwar',       'Uttarakhand',      29.9457, 78.1642, 110, 230],
  ['Rishikesh Triveni Ghat',       'Rishikesh',      'Uttarakhand',      30.1025, 78.2931, 70,  150],

  // ── J&K & LADAKH ──────────────────────────────────────────────────────────
  ['Srinagar Lal Chowk',           'Srinagar',       'J&K',              34.0836, 74.7973, 70,  150],
  ['Jammu Trikuta Nagar',          'Jammu',          'J&K',              32.7266, 74.8570, 80,  170],

  // ── GOA ───────────────────────────────────────────────────────────────────
  ['Panaji Panjim Circle',         'Panaji',         'Goa',              15.4909, 73.8278, 70,  150],
  ['Margao City Center',           'Margao',         'Goa',              15.2832, 73.9862, 60,  130],

  // ── NATIONAL HIGHWAYS ─────────────────────────────────────────────────────
  ['NH-44 Nagpur Bypass',          'Nagpur',         'Maharashtra',      21.0928, 79.0386, 120, 250],
  ['NH-16 Vijayawada Toll',        'Vijayawada',     'Andhra Pradesh',   16.4415, 80.6157, 150, 290],
  ['NH-48 Bangalore Tumkur Rd',    'Bengaluru',      'Karnataka',        13.1081, 77.5547, 200, 360],
  ['NH-8 Jaipur Delhi Bypass',     'Jaipur',         'Rajasthan',        27.0148, 75.8490, 170, 310],
  ['Yamuna Expressway Toll',       'Agra',           'Uttar Pradesh',    27.2765, 78.0039, 180, 330],
  ['Mumbai-Pune Expressway Toll',  'Pune',           'Maharashtra',      18.7298, 73.4048, 220, 380],
  ['Golden Quadrilateral Chennai', 'Chennai',        'Tamil Nadu',       13.1827, 80.2804, 190, 340],
];

// ── Build documents ────────────────────────────────────────────────────────
const buildDocs = () =>
  RAW.map(([areaName, city, state, lat, lng, minV, maxV]) => {
    const vc   = rand(minV, maxV);
    const { density, level, speed } = calcAll(vc);
    return {
      areaName, city, state,
      latitude: lat, longitude: lng,
      vehicleCount: vc,
      vehicleBreakdown: breakdown(vc),
      trafficDensity: density,
      averageSpeed: speed,
      congestionLevel: level,
      signalStatus: pick(SIGNALS),
      isEmergency: false,
      lastUpdated: new Date()
    };
  });

// ── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected\n');

  // Admin user
  const exists = await User.findOne({ email: 'admin@traffic.ai' });
  if (!exists) {
    const admin = new User({ name: 'Admin', email: 'admin@traffic.ai', password: 'Admin@1234', role: 'admin' });
    await admin.save();
    console.log('👤 Admin created  →  admin@traffic.ai  /  Admin@1234');
  } else {
    console.log('👤 Admin already exists — skipped');
  }

  // Traffic locations
  await Traffic.deleteMany({});
  const docs = buildDocs();
  await Traffic.insertMany(docs);

  const cities   = [...new Set(docs.map(d => d.city))];
  const states   = [...new Set(docs.map(d => d.state))];
  const highCnt  = docs.filter(d => d.congestionLevel === 'High').length;
  const medCnt   = docs.filter(d => d.congestionLevel === 'Medium').length;
  const lowCnt   = docs.filter(d => d.congestionLevel === 'Low').length;
  const totalVeh = docs.reduce((s, d) => s + d.vehicleCount, 0);

  console.log(`\n✅ ${docs.length} locations seeded`);
  console.log(`🏙️  ${cities.length} cities  |  🗺️  ${states.length} states`);
  console.log(`🔴 High: ${highCnt}  🟡 Medium: ${medCnt}  🟢 Low: ${lowCnt}`);
  console.log(`🚗 Total vehicles: ${totalVeh.toLocaleString()}`);
  console.log(`\n🔐 Login: admin@traffic.ai  /  Admin@1234`);
  console.log('🎉 Seed complete! Restart backend and refresh the dashboard.\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
