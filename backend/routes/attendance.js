const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Attendance = require('../models/Attendance');
const { protect } = require('../middleware/auth');

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${req.user.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 5000000 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) return cb(null, true);
        cb('Error: Only images allowed!');
    }
});

// @route   POST /api/attendance/mark
// @desc    Mark attendance with selfie capture
router.post('/mark', protect, upload.single('selfie'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a live selfie' });
        }

        const attendance = new Attendance({
            userId: req.user.id,
            selfieUrl: `/uploads/${req.file.filename}`,
            location: req.body.location ? JSON.parse(req.body.location) : null
        });

        await attendance.save();
        res.status(201).json({ message: 'Attendance marked successfully', attendance });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

module.exports = router;
