const isAdmin = (req, res, next) => {
    // We assume verifyToken has already run and attached req.user
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: "Access Denied! You don't have admin privileges." 
        });
    }
    next();
};

module.exports = isAdmin;
