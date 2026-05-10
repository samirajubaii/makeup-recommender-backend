const express = require("express");
const prisma = require("../prismaClient");

const router = express.Router();

// Get all brands
router.get("/", async (req, res) => {
    try {
        const brands = await prisma.brand.findMany(); // Assuming your brand model exists in Prisma

        if (brands.length === 0) {
            return res.status(404).json({ error: "No brands found" });
        }

        return res.json(brands);
    } catch (error) {
        console.error("Error during database query:", error);
        return res.status(500).json({ error: "Failed to fetch brands" });
    }
});

module.exports = router;
