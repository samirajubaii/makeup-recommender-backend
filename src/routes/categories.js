const express = require("express");
const prisma = require("../prismaClient");

const router = express.Router();

// Get all categories
router.get("/", async (req, res) => {
    try {
        const categories = await prisma.category.findMany(); // Assuming your category model exists in Prisma

        if (categories.length === 0) {
            return res.status(404).json({ error: "No categories found" });
        }

        return res.json(categories);
    } catch (error) {
        console.error("Error during database query:", error);
        return res.status(500).json({ error: "Failed to fetch categories" });
    }
});

module.exports = router;
