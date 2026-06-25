const express = require('express');
const authController = require('../controllers/authController');
const { body } = require('express-validator'); // Import the rule-maker
const { validateInputs } = require('../middlewares/validate'); // Import our bouncer
const verifyToken = require('../middlewares/verifyToken');

const router = express.Router();

// 🛡️ Rules for Signing Up
const signupRules = [
    body('name').notEmpty().withMessage('Name is required').trim().escape(),
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
];

// 🛡️ Rules for Logging In
const loginRules = [
    body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required')
];

// When someone goes to these URLs, hand them over to the Bouncer first!
router.post('/signup', signupRules, validateInputs, authController.signup);
router.post('/login', loginRules, validateInputs, authController.login);

// 👤 Get logged-in user's profile
router.get('/me', verifyToken, authController.getMe);

module.exports = router;