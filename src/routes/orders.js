// src/routes/orders.js
const express = require("express");
const prisma = require("../prismaClient");

const router = express.Router();

// POST /api/orders
router.post("/", async (req, res) => {

    const { userId, items, phone, addressLine1, addressLine2, city, notes } = req.body;

    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items must be a non-empty array" });
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1) validate user
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (!user) {
                throw Object.assign(new Error("User not found"), { status: 400 });
            }

            // 2) validate items + stock, build orderItems and compute total
            const orderItems = [];
            let total = 0;

            for (const item of items) {
                const productId = item.productId;
                const shadeId = item.shadeId ?? null;
                const quantity = Number(item.quantity ?? 0);

                if (!productId || !Number.isFinite(quantity) || quantity <= 0) {
                    throw Object.assign(new Error("Invalid item (productId/quantity)"), { status: 400 });
                }

                const product = await tx.product.findUnique({
                    where: { id: productId },
                    select: { id: true, price: true, stock: true },
                });

                if (!product) {
                    throw Object.assign(new Error(`Product not found: ${productId}`), { status: 400 });
                }

                // optional shade validation (only if shadeId provided)
                if (shadeId) {
                    const shade = await tx.shade.findUnique({
                        where: { id: shadeId },
                        select: { id: true, productId: true },
                    });

                    if (!shade) {
                        throw Object.assign(new Error(`Shade not found: ${shadeId}`), { status: 400 });
                    }

                    // make sure shade belongs to same product
                    if (shade.productId !== productId) {
                        throw Object.assign(new Error("Shade does not belong to this product"), { status: 400 });
                    }
                }

                // ✅ check stock
                if (product.stock < quantity) {
                    throw Object.assign(
                        new Error(`Not enough stock for product ${productId}. Available: ${product.stock}`),
                        { status: 400 }
                    );
                }

                // ✅ decrease stock (atomic decrement)
                await tx.product.update({
                    where: { id: productId },
                    data: { stock: { decrement: quantity } },
                });

                const unitPrice = product.price;
                total += unitPrice * quantity;

                orderItems.push({
                    productId,
                    shadeId,
                    quantity,
                    unitPrice,
                });
            }

            // 3) create order ✅ UPDATED: save delivery fields
            const order = await tx.order.create({
                data: {
                    userId,
                    total,

                    phone: phone ?? null,
                    addressLine1: addressLine1 ?? null,
                    addressLine2: addressLine2 ?? null,
                    city: city ?? null,
                    notes: notes ?? null,

                    items: { create: orderItems },
                },
                include: {
                    items: {
                        include: { product: true, shade: true },
                    },
                },
            });

            // 4) clear cart items
            await tx.cartItem.deleteMany({
                where: { cart: { userId } },
            });

            return order;
        });

        return res.status(201).json(result);
    } catch (error) {
        console.error("Create order error:", error);

        // handle our custom status errors
        if (error?.status) {
            return res.status(error.status).json({ error: error.message });
        }

        return res.status(500).json({ error: "Failed to create order" });
    }
});

// ✅ Get all orders for a user
// GET /api/orders?userId=xxx
router.get("/", async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: "userId query param is required" });
        }

        const orders = await prisma.order.findMany({
            where: { userId: String(userId) },
            orderBy: { createdAt: "desc" },
            include: {
                items: {
                    include: {
                        product: true,
                        shade: true,
                    },
                },
            },
        });

        return res.json(orders);
    } catch (error) {
        console.error("Error fetching orders:", error);
        return res.status(500).json({ error: "Failed to fetch orders" });
    }
});

// ✅ Get order by id
// GET /api/orders/:id
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                        shade: true,
                    },
                },
            },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        return res.json(order);
    } catch (error) {
        console.error("Error fetching order:", error);
        return res.status(500).json({ error: "Failed to fetch order" });
    }
});

// ✅ Update order status
// PUT /api/orders/:id
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: "status is required" });
        }

        const currentOrder = await prisma.order.findUnique({
            where: { id },
        });

        if (!currentOrder) {
            return res.status(404).json({ error: "Order not found" });
        }

        const validStatusChange = {
            PENDING: ["PAID"],
            PAID: ["SHIPPED"],
            SHIPPED: ["DELIVERED"],
        };

        if (currentOrder.status === "SHIPPED" || currentOrder.status === "DELIVERED") {
            return res.status(400).json({
                error: "Order has already been shipped or delivered and cannot be updated",
            });
        }

        if (!validStatusChange[currentOrder.status]?.includes(status)) {
            return res.status(400).json({
                error: `Invalid status change from ${currentOrder.status} to ${status}`,
            });
        }

        const updatedOrder = await prisma.order.update({
            where: { id },
            data: { status },
        });

        return res.json(updatedOrder);
    } catch (error) {
        console.error("Update order error:", error);
        return res.status(500).json({ error: "Failed to update order status" });
    }
});

// ✅ Cancel an order
// DELETE /api/orders/:id
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const order = await prisma.order.findUnique({
            where: { id },
        });

        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }

        if (order.status === "SHIPPED" || order.status === "DELIVERED") {
            return res.status(400).json({
                error: "Order has already been shipped or delivered and cannot be cancelled",
            });
        }

        await prisma.order.delete({
            where: { id },
        });

        return res.status(200).json({ message: "Order cancelled successfully" });
    } catch (error) {
        console.error("Cancel order error:", error);
        return res.status(500).json({ error: "Failed to cancel order" });
    }
});

module.exports = router;
