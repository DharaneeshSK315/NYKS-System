const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const tf = require('@tensorflow/tfjs');

// --- TENSORFLOW-NODE MOCK (Bypass native addon issues) ---
try {
    const mockPath = require.resolve('@tensorflow/tfjs-node');
    require.cache[mockPath] = {
        id: mockPath,
        filename: mockPath,
        loaded: true,
        exports: tf
    };
} catch (e) {
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function() {
        if (arguments[0] === '@tensorflow/tfjs-node') return tf;
        return originalRequire.apply(this, arguments);
    };
}

const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

// --- FACE-API SETUP ---
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const MODEL_URL = path.join(__dirname, 'node_modules', '@vladmandic', 'face-api', 'model');

async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL);
    console.log('✅ AI Face Models Optimized for Speed');
}
loadModels();

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- UTILS ---
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// --- DATABASE PERSISTENCE ---
const USERS_FILE = path.join(__dirname, 'users.json');
let users = [];
if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE));
} else {
    users = [
        { 
            id: '1', 
            username: 'Admin', 
            password: 'hashed_Admin123', 
            role: 'admin', 
            email: 'admin@nyks.gov.in',
            profilePic: 'https://i.pravatar.cc/150?u=admin' 
        },
        { 
            id: '2', 
            username: 'Dharaneesh S K', 
            password: 'hashed_Mugilarasi', 
            role: 'field_officer', 
            email: 'dharask525@gmail.com',
            profilePic: '/dharaneesh.jpeg',
            geofence: { lat: 11.6809, lng: 78.1777, radius: 100 },
            schedule: { from: "00:00", to: "23:59" }
        },
        { 
            id: '3', 
            username: 'Premanand', 
            password: 'hashed_Prem12345', 
            role: 'field_officer', 
            email: 'premanand@example.com',
            profilePic: '/prem.jpeg',
            geofence: { lat: 11.6809, lng: 78.1777, radius: 100 },
            schedule: { from: "00:00", to: "23:59" }
        }
    ];
}

const saveUsers = () => fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));

const LOCATIONS_FILE = path.join(__dirname, 'locations.json');
let locations = [];
if (fs.existsSync(LOCATIONS_FILE)) {
    locations = JSON.parse(fs.readFileSync(LOCATIONS_FILE));
} else {
    locations = [
        { id: 'loc1', name: 'Dharmapuri Office', lat: 11.6809, lng: 78.1777, radius: 100 },
        { id: 'loc2', name: 'Salem Office', lat: 11.6643, lng: 78.1460, radius: 100 }
    ];
}
const saveLocations = () => fs.writeFileSync(LOCATIONS_FILE, JSON.stringify(locations, null, 2));

const attendanceRecords = [];
const descriptorCache = {}; 
let FACE_THRESHOLD = 0.55; // Slightly more lenient (approx 45% similarity allowed)

// --- BIOMETRIC FACE COMPARISON ENDPOINT ---
app.post('/api/face/compare', async (req, res) => {
    try {
        const { selfie, username, latitude, longitude } = req.body;
        const user = users.find(u => u.username === username);
        
        if (!user) return res.status(404).json({ match: false, message: 'User not found.' });

        // 1. Get Reference Descriptor
        let refDescriptor;
        if (descriptorCache[username]) {
            refDescriptor = descriptorCache[username];
        } else {
            let refImg;
            if (user.profilePic.startsWith('data:image')) {
                const refBuffer = Buffer.from(user.profilePic.replace(/^data:image\/\w+;base64,/, ""), 'base64');
                refImg = await canvas.loadImage(refBuffer);
            } else {
                let refPath = path.join(__dirname, 'public', user.profilePic);
                if (!fs.existsSync(refPath)) return res.status(404).json({ match: false, message: 'Registered photo not found.' });
                refImg = await canvas.loadImage(refPath);
            }
            
            const refDetection = await faceapi.detectSingleFace(refImg, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
            if (!refDetection) return res.status(400).json({ match: false, message: 'Face not detected in registered photo.' });
            refDescriptor = refDetection.descriptor;
            descriptorCache[username] = refDescriptor;
        }

        // 2. Load Captured Selfie
        const selfieBuffer = Buffer.from(selfie.replace(/^data:image\/\w+;base64,/, ""), 'base64');
        const selfieImg = await canvas.loadImage(selfieBuffer);
        const selfieDetection = await faceapi.detectSingleFace(selfieImg, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

        if (!selfieDetection) return res.status(400).json({ match: false, message: 'No face detected in selfie.' });

        // 3. Compare
        const distance = faceapi.euclideanDistance(refDescriptor, selfieDetection.descriptor);
        const similarity = Math.round((1 - distance) * 100);
        const isFaceMatch = distance <= FACE_THRESHOLD;

        if (!isFaceMatch) {
            return res.json({ 
                match: false, 
                similarity, 
                message: "Face did not match the registered profile.",
                attendance: "Rejected"
            });
        }

        // 4. Mapped Location & Time Check
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        let activeGeofence = user.geofence || { lat: 11.6809, lng: 78.1777, radius: 100 };
        let activeSchedule = user.schedule || { from: "00:00", to: "23:59" };

        if (user.dailySchedules && user.dailySchedules[today]) {
            const daily = user.dailySchedules[today];
            activeGeofence = daily.geofence || activeGeofence;
            activeSchedule = daily.schedule || activeSchedule;
        }

        const { lat, lng, radius } = activeGeofence;
        const { from, to } = activeSchedule;

        // Geofence Validation
        let isLocationValid = false;
        let distFromTarget = -1;
        if (latitude && longitude) {
            distFromTarget = calculateDistance(latitude, longitude, lat, lng);
            isLocationValid = distFromTarget <= radius;
        }

        // Time Validation
        const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        const isTimeValid = currentTime >= from && currentTime <= to;

        const attendanceStatus = (isLocationValid && isTimeValid) ? "Marked" : "Rejected";
        let message = "Attendance Marked Successfully ✅";
        
        if (!isLocationValid) message = "Location Mismatch: You are not at the assigned duty location.";
        else if (!isTimeValid) message = "Time Mismatch: It is outside your assigned duty hours.";

        const record = {
            id: Date.now(),
            username,
            similarity,
            latitude: latitude || "",
            longitude: longitude || "",
            location_status: isLocationValid ? "Inside" : "Outside",
            time_status: isTimeValid ? "Valid" : "Invalid",
            attendance: attendanceStatus,
            message,
            timestamp: new Date().toISOString()
        };

        attendanceRecords.push(record);

        return res.json({
            match: true,
            similarity,
            attendance: attendanceStatus,
            location_status: record.location_status,
            gps_status: latitude ? "ON" : "OFF",
            latitude: latitude || "",
            longitude: longitude || "",
            message
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// --- ADMIN ROUTES ---
app.get('/api/admin/config', (req, res) => res.json({ threshold: Math.round((1 - FACE_THRESHOLD) * 100) }));
app.post('/api/admin/config', (req, res) => {
    FACE_THRESHOLD = 1 - (req.body.threshold / 100);
    res.json({ threshold: req.body.threshold });
});

app.get('/api/admin/users', (req, res) => res.json(users.map(u => ({ ...u, password: '***' }))));

app.post('/api/admin/users', (req, res) => {
    const newUser = { 
        id: Date.now().toString(), 
        ...req.body, 
        role: req.body.role || 'field_officer', 
        profilePic: req.body.profilePic || '/images/default.jpg' 
    };
    users.push(newUser);
    saveUsers();
    res.status(201).json(newUser);
});

app.patch('/api/admin/users/:id', (req, res) => {
    const user = users.find(u => u.id === req.params.id);
    if (user) {
        if (req.body.dailySchedules) {
            user.dailySchedules = { ...user.dailySchedules, ...req.body.dailySchedules };
        } else {
            Object.assign(user, req.body);
        }
        saveUsers();
        return res.json(user);
    }
    res.status(404).json({ message: 'User not found' });
});

app.delete('/api/admin/users/:id', (req, res) => {
    users = users.filter(u => u.id !== req.params.id);
    saveUsers();
    res.json({ message: 'Deleted' });
});

// --- LOCATIONS ROUTES ---
app.get('/api/admin/locations', (req, res) => res.json(locations));

app.post('/api/admin/locations', (req, res) => {
    const newLoc = { 
        id: Date.now().toString(), 
        name: req.body.name,
        lat: parseFloat(req.body.lat), 
        lng: parseFloat(req.body.lng), 
        radius: parseFloat(req.body.radius || 100) 
    };
    locations.push(newLoc);
    saveLocations();
    res.status(201).json(newLoc);
});

app.delete('/api/admin/locations/:id', (req, res) => {
    locations = locations.filter(l => l.id !== req.params.id);
    saveLocations();
    res.json({ message: 'Deleted' });
});

// Bulk assign location mapping
app.post('/api/admin/mappings/bulk', (req, res) => {
    const { userIds, date, locationId, from, to } = req.body;
    const loc = locations.find(l => l.id === locationId);
    if (!loc) return res.status(404).json({ message: 'Location not found' });

    userIds.forEach(uid => {
        const user = users.find(u => u.id === uid);
        if (user) {
            if (!user.dailySchedules) user.dailySchedules = {};
            user.dailySchedules[date] = {
                geofence: { lat: loc.lat, lng: loc.lng, radius: loc.radius },
                schedule: { from: from || "00:00", to: to || "23:59" }
            };
        }
    });
    saveUsers();
    res.json({ message: 'Bulk assignment successful' });
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    console.log(`🔑 Login attempt for: ${username}`);
    const user = users.find(u => u.username === username);
    if (user && (password === user.password || `hashed_${password}` === user.password)) {
        console.log(`✅ Login successful: ${username}`);
        const token = jwt.sign({ id: user.id, role: user.role }, 'secret', { expiresIn: '1d' });
        return res.json({ token, user: { id: user.id, username: user.username, role: user.role, profilePic: user.profilePic } });
    }
    console.log(`❌ Login failed for: ${username}`);
    res.status(401).json({ message: 'Invalid Credentials' });
});

const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.post('/api/auth/google', async (req, res) => {
    try {
        const { idToken } = req.body;
        const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        const { sub, email, name, picture } = payload;
        
        let user = users.find(u => u.email === email);
        if (!user) {
            user = { id: sub, username: name, email, profilePic: picture, role: 'field_officer' };
            users.push(user);
            saveUsers();
        }
        const token = jwt.sign({ id: user.id, role: user.role }, 'secret', { expiresIn: '1d' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, profilePic: user.profilePic } });
    } catch (err) { 
        console.error("Google Auth Error:", err);
        res.status(401).json({ message: 'Google Auth Failed' }); 
    }
});

// Delete specific daily mapping
app.delete('/api/admin/users/:id/mappings/:date', (req, res) => {
    const { id, date } = req.params;
    const user = users.find(u => String(u.id) === String(id));
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.dailySchedules && user.dailySchedules[date]) {
        delete user.dailySchedules[date];
        saveUsers();
        res.json({ message: `Mapping for ${date} deleted successfully` });
    } else {
        res.status(404).json({ message: "Mapping not found for this date" });
    }
});

app.get('/api/attendance/logs', (req, res) => res.json(attendanceRecords));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 AI Server running on http://localhost:${PORT}`));
