const express = require("express");
const prisma = require("../prismaClient");

const router = express.Router();

// Get products with search functionality
router.get("/", async (req, res) => {
    const { search, category, brand, minPrice, maxPrice } = req.query;

    try {
        console.log("Fetching products with search:", search);

        const parsedMinPrice = minPrice ? parseFloat(minPrice) : undefined;
        const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : undefined;

        const products = await prisma.product.findMany({
            where: {
                AND: [
                    search ? {
                        name: {
                            contains: search,  // Using contains without 'mode'
                        }
                    } : {},
                    category ? { category: { name: category } } : {},
                    brand ? { brand: { name: brand } } : {},
                    parsedMinPrice ? { price: { gte: parsedMinPrice } } : {},
                    parsedMaxPrice ? { price: { lte: parsedMaxPrice } } : {},
                ],
            },
            include: {
                brand: true,
                category: true,
                shades: true,
            },
        });

        return res.json(products);



    } catch (error) {
        console.error("Error during database query:", error);
        return res.status(500).json({ error: "Failed to fetch products" });
    }
});
// Get product details by id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const product = await prisma.product.findUnique({
            where: { id },
            include: {
                brand: true,
                category: true,
                shades: true,
            },
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        return res.json(product);
    } catch (error) {
        console.error("Error fetching product details:", error);
        return res.status(500).json({ error: "Failed to fetch product details" });
    }
});


module.exports = router;




