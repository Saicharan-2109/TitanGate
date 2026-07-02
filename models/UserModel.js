const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name!']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email'],
        unique: true,
        lowercase: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false // This hides the password from database queries by default!
    }
}, { timestamps: true });

// 🔥 PRE-SAVE HOOK: Automatically scramble the password before saving it to MongoDB
// 🔥 NEW VERSION (Paste this)
userSchema.pre('save', async function() {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) return;

    // Hash the password with a salt of 12 (The Shredder!)
    this.password = await bcrypt.hash(this.password, 12);
});

// 🔥 HELPER FUNCTION: Check if the typed password matches the scrambled database password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

module.exports = mongoose.model('User', userSchema);