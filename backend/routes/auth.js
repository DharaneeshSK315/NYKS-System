const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// @route   POST /api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({ username, email, password, role });
        await user.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        const user = await User.findOne({ username });
        if (!user) return res.status(401).json({ message: 'Invalid Credentials' });

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid Credentials' });

        // Create JWT
        const token = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
});

// @route   POST /api/auth/google
// @desc    Google Sign-In integration (Mock)
router.post('/google', async (req, res) => {
    try {
        const { googleToken } = req.body;
        // In a real app, verify the token with Google API
        // For now, we simulate a successful login
        res.json({ message: 'Google Sign-In successful', token: 'mock-jwt-token' });
    } catch (err) {
        res.status(500).json({ message: 'Google Auth Error' });
    }
});

// @route   POST /api/auth/forgot-password
// @desc    Forgot Password (Mock)
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    // Real app would send an email with a reset link
    res.json({ message: `Password reset link sent to ${email}` });
});

// @route   GET /api/auth/profile
// @desc    Get current user profile (Protected)
const { protect } = require('../middleware/auth');
router.get('/profile', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
