// src/middleware/auth.js

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";  // Make sure to change this in production!

function verifyToken(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1];  // Bearer token

    if (!token) {
        return res.status(403).json({ error: "No token provided" });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        req.userId = decoded.userId;  // Save user ID for later use
        next();
    });
}

module.exports = { verifyToken };

