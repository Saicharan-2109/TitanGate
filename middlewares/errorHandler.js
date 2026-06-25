// middlewares/errorHandler.js

const errorHandler = (err, req, res, next) => {
    console.error(`❌ Server Crash Averted: ${err.message}`);

    // If the error doesn't have a specific status code, default to 500 (Server Error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode).json({
        success: false,
        message: err.message,
        // Only show the messy stack trace if we are developing, hide it from users!
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;