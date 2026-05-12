const express = require("express");
const prisma = require("../prismaClient");
const { verifyToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/requireAdmin");

const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
router.use(verifyToken, requireAdmin);
const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });


// keep original extension + save with safe filename
const storage = multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOAD_DIR),
    filename: (_, file, cb) => {
        const ext = (path.extname(file.originalname || "") || ".jpg").toLowerCase();
        const safeName =
            Date.now() + "-" + Math.random().toString(16).slice(2) + ext;
        cb(null, safeName);
    },
});

const upload = multer({ storage });

// POST /api/admin/upload (multipart/form-data, key: photo)
router.post("/upload", upload.single("photo"), (req, res) => {
    if (!req.file) return res.status(400).json({ error: "photo is required" });

    return res.json({ imageUrl: `/uploads/${req.file.filename}` });
});



/**
 * POST /api/admin/brands
 * Body: { name, logoUrl? }
 */
router.post("/brands", async (req, res) => {
    const { name, logoUrl } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    try {
        const brand = await prisma.brand.create({
            data: { name: name.trim(), logoUrl: logoUrl ?? null },
        });
        return res.status(201).json(brand);
    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: "Brand already exists or invalid data" });
    }
});
router.delete("/brands/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Find products belonging to this brand
        const products = await prisma.product.findMany({
            where: { brandId: id },
            select: { id: true },
        });

        const productIds = products.map((p) => p.id);

        // Delete shades first (FK dependency)
        if (productIds.length) {
            await prisma.shade.deleteMany({
                where: { productId: { in: productIds } },
            });

            // Delete products
            await prisma.product.deleteMany({
                where: { id: { in: productIds } },
            });
        }

        // Delete the brand
        await prisma.brand.delete({ where: { id } });

        return res.json({ message: "Brand deleted" });
    } catch (err) {
        console.error(err);
        return res.status(404).json({ error: "Brand not found or could not be deleted" });
    }
});

/**
 * DELETE /api/admin/categories/:id
 * Deletes a category + all dependent products + shades
 */
router.delete("/categories/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // Find products belonging to this category
        const products = await prisma.product.findMany({
            where: { categoryId: id },
            select: { id: true },
        });

        const productIds = products.map((p) => p.id);

        // Delete shades first (FK dependency)
        if (productIds.length) {
            await prisma.shade.deleteMany({
                where: { productId: { in: productIds } },
            });

            // Delete products
            await prisma.product.deleteMany({
                where: { id: { in: productIds } },
            });
        }

        // Delete the category
        await prisma.category.delete({ where: { id } });

        return res.json({ message: "Category deleted" });
    } catch (err) {
        console.error(err);
        return res
            .status(404)
            .json({ error: "Category not found or could not be deleted" });
    }
});

/**
 * POST /api/admin/categories
 * Body: { name }
 */
router.post("/categories", async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    try {
        const category = await prisma.category.create({
            data: { name: name.trim() },
        });
        return res.status(201).json(category);
    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: "Category already exists or invalid data" });
    }
});

/**
 * POST /api/admin/products
 * Body:
 * {
 *   name, description?, imageUrl?, price, stock?,
 *   brandId, categoryId,
 *   finish?, suitableForAllSkinTypes?,
 *   shades?: [{ name, tone, undertone }]
 * }
 */
router.post("/products", async (req, res) => {
    const {
        name,
        description,
        imageUrl,
        price,
        stock,
        brandId,
        categoryId,
        finish,
        suitableForAllSkinTypes,
        shades,
    } = req.body;

    if (!name || price == null || !brandId || !categoryId) {
        return res.status(400).json({
            error: "name, price, brandId, categoryId are required",
        });
    }

    try {
        const product = await prisma.product.create({
            data: {
                name: name.trim(),
                description: description ?? null,
                imageUrl: imageUrl ?? null,
                price: parseFloat(price),
                stock: stock == null ? 0 : parseInt(stock, 10),
                brandId,
                categoryId,
                finish: finish ?? null, // must be "MATTE" | "NATURAL" | "DEWY" or null
                suitableForAllSkinTypes: Boolean(suitableForAllSkinTypes),

                shades: shades?.length
                    ? {
                        create: shades.map((s) => ({
                            name: (s.name ?? "").trim(),
                            tone: (s.tone ?? "").trim(),
                            undertone: (s.undertone ?? "").trim(),
                        })),
                    }
                    : undefined,
            },
            include: { shades: true, brand: true, category: true },
        });

        return res.status(201).json(product);
    } catch (err) {
        console.error("Create product error:", err);
        return res.status(500).json({ error: "Failed to create product" });
    }
});

// DELETE /api/admin/products/:productId/shades/:shadeId
router.delete("/products/:productId/shades/:shadeId", async (req, res) => {
    const { productId, shadeId } = req.params;

    try {
        // ensure shade belongs to product
        const shade = await prisma.shade.findUnique({ where: { id: shadeId } });
        if (!shade || shade.productId !== productId) {
            return res.status(404).json({ error: "Shade not found" });
        }

        await prisma.shade.delete({ where: { id: shadeId } });
        return res.json({ message: "Shade deleted" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to delete shade" });
    }
});



/**
 * PUT /api/admin/products/:id
 * Body: any fields you want to update
 */
router.put("/products/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const updated = await prisma.product.update({
            where: { id },
            data: {
                ...req.body,
                // if price/stock are sent as strings, normalize:
                price: req.body.price != null ? parseFloat(req.body.price) : undefined,
                stock: req.body.stock != null ? parseInt(req.body.stock, 10) : undefined,
            },
        });

        return res.json(updated);
    } catch (err) {
        console.error(err);
        return res.status(404).json({ error: "Product not found or invalid data" });
    }
});

/**
 * DELETE /api/admin/products/:id
 */
router.delete("/products/:id", async (req, res) => {
    const { id } = req.params;

    try {
        // delete dependents first (FK constraints)
        await prisma.cartItem.deleteMany({ where: { productId: id } });
        await prisma.orderItem.deleteMany({ where: { productId: id } });

        // delete shades then product
        await prisma.shade.deleteMany({ where: { productId: id } });
        await prisma.product.delete({ where: { id } });

        return res.json({ message: "Product deleted" });
    } catch (err) {
        console.error("Delete product error:", err);
        return res.status(400).json({ error: "Product could not be deleted" });
    }
});

// GET /api/admin/orders
router.get("/orders", async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                user: { select: { id: true, name: true, email: true } },
                items: {
                    include: {
                        product: true,
                        shade: true,
                    },
                },
            },

        });

        return res.json(orders);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to load orders" });
    }
});

// PUT /api/admin/orders/:id/status  Body: { status }
router.put("/orders/:id/status", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const updated = await prisma.order.update({
            where: { id },
            data: { status },
        });
        return res.json(updated);
    } catch (err) {
        console.error(err);
        return res.status(400).json({ error: err.message });
    }
});


/**
 * POST /api/admin/products/:id/shades
 * Body: { shades: [{ name, tone, undertone }] }
 */
router.post("/products/:id/shades", async (req, res) => {
    const { id } = req.params;
    const { shades } = req.body;

    if (!Array.isArray(shades) || shades.length === 0) {
        return res.status(400).json({ error: "shades must be a non-empty array" });
    }

    try {
        // ensure product exists
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) return res.status(404).json({ error: "Product not found" });

        const created = await prisma.shade.createMany({
            data: shades.map((s) => ({
                productId: id,
                name: (s.name ?? "").trim(),
                tone: (s.tone ?? "").trim(),
                undertone: (s.undertone ?? "").trim(),
            })),
        });

        return res.status(201).json({ message: "Shades added", count: created.count });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to add shades" });
    }
});

module.exports = router;
