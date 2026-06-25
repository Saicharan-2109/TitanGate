const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // 1. Look for the wristband in the headers
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: "Access Denied! No VIP wristband found." });
    }

    // 2. Extract the token (cut off the "Bearer " part)
    const token = authHeader.split(' ')[1];

    // 3. Inspect the wristband using your secret key
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Attach the user's ID to the request and open the door!
        req.user = decoded;
        next(); 
    } catch (error) {
        console.error("Bouncer Error:", error.message);
        return res.status(403).json({ success: false, message: "Invalid or expired wristband." });
    }
};

module.exports = verifyToken;