// routes/cart.js
const express = require("express");
const prisma = require("../prismaClient");
const { verifyToken } = require("../middleware/auth");  // Make sure you're using the correct middleware for token verification

const router = express.Router();

// POST /api/cart/items (Add item to cart)
router.post("/cart/items", verifyToken, async (req, res) => {
    const { productId, quantity, shadeId } = req.body;

    if (!productId || !quantity) {
        return res.status(400).json({ error: "productId and quantity are required" });
    }

    try {
        // 1) Ensure cart exists
        const cart = await prisma.cart.upsert({
            where: { userId: req.userId },
            update: {},
            create: { userId: req.userId },
        });

        // 2) Get product price
        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { price: true },
        });

        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        // 3) Check if same product+shade already exists
        const existing = await prisma.cartItem.findFirst({
            where: {
                cartId: cart.id,
                productId,
                shadeId: shadeId ?? null,
            },
        });

        if (existing) {
            // ✅ Increase quantity instead of creating duplicate
            await prisma.cartItem.update({
                where: { id: existing.id },
                data: {
                    quantity: existing.quantity + Number(quantity),
                },
            });
        } else {
            // ✅ Create new row
            await prisma.cartItem.create({
                data: {
                    cartId: cart.id,
                    productId,
                    shadeId: shadeId ?? null,
                    quantity: Number(quantity),
                    unitPrice: product.price,
                },
            });
        }

        // 4) Return full cart with product + shade
        const fullCart = await prisma.cart.findUnique({
            where: { id: cart.id },
            include: {
                items: {
                    include: {
                        product: true,
                        shade: true,
                    },
                },
            },
        });

        return res.json(fullCart);
    } catch (error) {
        console.error("Add to cart error:", error);
        return res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;

// GET /api/cart (Get user's cart)
// GET /api/cart (Get user's cart)
router.get("/cart", verifyToken, async (req, res) => {
    try {
        const cart = await prisma.cart.findUnique({
            where: { userId: req.userId },
            include: {
                items: {
                    include: {
                        product: true,
                        shade: true,
                    },
                },
            },
        });

        // ✅ return empty cart instead of 404 (prevents Flutter crash)
        if (!cart) {
            return res.json({ id: null, userId: req.userId, items: [] });
        }

        return res.json(cart);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
});


// PATCH /api/cart/items/:id (Change quantity of cart item)
router.patch("/cart/items/:id", verifyToken, async (req, res) => {
    const { id } = req.params;  // Cart item ID
    const { quantity } = req.body;

    if (!quantity) {
        return res.status(400).json({ error: "Quantity is required" });
    }

    try {
        // Update the quantity of the cart item
        const cartItem = await prisma.cartItem.update({
            where: { id },
            data: { quantity },
        });

        return res.json(cartItem);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
});

// DELETE /api/cart/items/:id (Remove item from cart)
router.delete("/cart/items/:id", verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Delete the cart item
        await prisma.cartItem.delete({
            where: { id },
        });

        return res.json({ message: "Item removed from cart" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;

