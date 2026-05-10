const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

function buildUserResponse(user) {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role, // ✅ IMPORTANT
    };
}

router.post("/signup", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: "Email already in use" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash: hashedPassword,
                // role will default to "user" from Prisma schema
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true, // ✅ SELECT ROLE
            },
        });

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role }, // ✅ include role
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({ token, user: buildUserResponse(user) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
});

router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                passwordHash: true
            },
        });

        if (!user) {
            return res.status(400).json({
                message: "Email not found"
            });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);

        if (!ok) {
            return res.status(400).json({
                message: "Password is incorrect"
            });
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        const { passwordHash, ...safeUser } = user;

        return res.json({ token, user: safeUser });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Something went wrong. Please try again."
        });
    }
});

module.exports = router;
