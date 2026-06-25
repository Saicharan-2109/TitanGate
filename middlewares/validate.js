// middlewares/validate.js
const { validationResult } = require('express-validator');

const validateInputs = (req, res, next) => {
    // The bouncer generates a report of all the bad inputs
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        // If there are errors, stop right here and send them back to the frontend
        return res.status(400).json({ 
            success: false, 
            errors: errors.array() 
        });
    }
    
    // If everything is clean, let them through to the controller!
    next();
};

module.exports = { validateInputs };