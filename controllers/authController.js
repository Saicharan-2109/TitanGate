const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');

// 🎟️ THE WRISTBAND MACHINE: This little function makes the JWT
const signToken = (id) => {
    return jwt.sign({ id: id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

// 📝 ACTION 1: SIGNUP (Adding a new user to the club)
const signup = async (req, res) => {
    try {
        // 1. Grab their info from the frontend form
        const { name, email, password } = req.body;

        // 2. Create them in the database (The shredder automatically hides the password!)
        const newUser = await User.create({
            name,
            email,
            password
        });

        // 3. Print their VIP wristband
        const token = signToken(newUser._id);

        // 4. Send them in!
        res.status(201).json({
            success: true,
            message: "Welcome to TitanGate! Your account is created.",
            token: token, // 👈 Here is the wristband!
            data: { user: newUser }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 🤝 ACTION 2: LOGIN (Checking a returning user)
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Did they actually type an email and password?
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password!' });
        }

        // 2. Find the user in the database. 
        // (.select('+password') tells MongoDB to temporarily fetch the hidden password so we can check it)
        const user = await User.findOne({ email }).select('+password');

        // 3. Check if the user exists AND if the typed password matches the shredded database password
        if (!user || !(await user.correctPassword(password, user.password))) {
            return res.status(401).json({ success: false, message: 'Incorrect email or password, bro!' });
        }

        // 4. Password is correct! Print a fresh VIP wristband
        const token = signToken(user._id);

        // 5. Let them in! (But remove the password from the output so we don't accidentally send it to the frontend)
        user.password = undefined;

        res.status(200).json({
            success: true,
            message: "Login successful! Welcome back.",
            token: token, // 👈 Here is the fresh wristband!
            data: { user }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// 👤 ACTION 3: GET MY PROFILE
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        res.status(200).json({ success: true, data: { user } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { signup, login, getMe };