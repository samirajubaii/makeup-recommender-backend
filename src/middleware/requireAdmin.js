const prisma = require("../prismaClient");

async function requireAdmin(req, res, next) {
    try {
        // verifyToken must run before this (so req.userId exists)
        if (!req.userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.userId },
            select: { role: true },
        });

        if (!user) return res.status(401).json({ error: "Unauthorized" });

        if (user.role !== "admin") {
            return res.status(403).json({ error: "Admin access required" });
        }

        next();
    } catch (err) {
        console.error("requireAdmin error:", err);
        return res.status(500).json({ error: "Server error" });
    }
}

module.exports = { requireAdmin };
