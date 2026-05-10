const prisma = require("../prismaClient");

// typeName = "Foundation" or "Concealer"
async function findRecommendedShades({ tone, undertone, typeName, limit = 5 }) {
    const shades = await prisma.shade.findMany({
        where: {
            tone,
            undertone,
            product: {
                category: { name: typeName },
            },
        },
        include: {
            product: {
                include: { brand: true, category: true },
            },
        },
        take: limit,
    });

    return shades.map((s) => ({
        shadeId: s.id,
        shade: s.name,
        tone: s.tone,
        undertone: s.undertone,
        productId: s.product.id,
        productName: s.product.name,
        brand: s.product.brand.name,
        category: s.product.category.name,
        finish: s.product.finish,
        price: s.product.price,
        imageUrl: s.product.imageUrl,
        stock: s.product.stock,
    }));
}

module.exports = { findRecommendedShades };