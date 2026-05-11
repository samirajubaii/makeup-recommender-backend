require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
    console.log("🌱 Seeding database...");

    // ---------------------------
    // 1) Create Admin (safe)
    // ---------------------------
  const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
    throw new Error("❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in environment variables");
}
const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
});

if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    await prisma.user.create({
        data: {
            name: "Admin",
            email: adminEmail,
            passwordHash: hashedPassword,
            role: "admin",
        },
    });

    console.log(`✅ Admin user created: ${adminEmail}`);
} else {
    console.log("ℹ️ Admin already exists");
}

    // ---------------------------
    // 2) Categories
    // ---------------------------
    const categoryNames = [
        "Foundation",
        "Concealer",
        "Blush",
        "Mascara",
        "Highlighter",
        "Eyeshadow",
    ];

    for (const name of categoryNames) {
        await prisma.category.upsert({
            where: { name },
            update: {},
            create: { name },
        });
    }

    const categories = {};
    for (const name of categoryNames) {
        categories[name] = await prisma.category.findUnique({ where: { name } });
    }

    // ---------------------------
    // 3) Brands
    // ---------------------------
    const brandNames = [
        "Maybelline",
        "L'Oréal Paris",
        "NYX",
        "e.l.f.",
        "Revlon",
        "MAC",
        "NARS",
        "Fenty Beauty",
        "Huda Beauty",
        "Dior",
    ];

    for (const name of brandNames) {
        await prisma.brand.upsert({
            where: { name },
            update: {},
            create: { name, logoUrl: null },
        });
    }

    const brands = {};
    for (const name of brandNames) {
        brands[name] = await prisma.brand.findUnique({ where: { name } });
    }

    // ---------------------------
    // 4) Products list
    // ---------------------------
    const products = [
        // ---------------- Foundation ----------------
        { name: "Fit Me Foundation", brand: "Maybelline", category: "Foundation",imageUrl: "/uploads/fit-me-foundation.jpg", finish: "NATURAL", price: 12.99, stock: 80 },
        { name: "Super Stay Foundation", brand: "Maybelline", category: "Foundation", finish: "MATTE", price: 13.99, stock: 70 },
        { name: "True Match Foundation", brand: "L'Oréal Paris", category: "Foundation", finish: "NATURAL", price: 15.99, stock: 65 },
        { name: "Infallible Fresh Wear Foundation", brand: "L'Oréal Paris", category: "Foundation", finish: "NATURAL", price: 16.99, stock: 60 },
        { name: "Pro Filt'r Foundation", brand: "Fenty Beauty", category: "Foundation", finish: "MATTE", price: 39.0, stock: 40 },
        { name: "Studio Fix Fluid", brand: "MAC", category: "Foundation", finish: "MATTE", price: 38.0, stock: 35 },

        // ---------------- Concealer ----------------
        { name: "Fit Me Concealer", brand: "Maybelline", category: "Concealer", finish: "NATURAL", price: 10.99, stock: 100 },
        { name: "Instant Age Rewind Concealer", brand: "Maybelline", category: "Concealer", finish: "NATURAL", price: 11.5, stock: 90 },
        { name: "Infallible Full Wear Concealer", brand: "L'Oréal Paris", category: "Concealer", finish: "MATTE", price: 12.99, stock: 80 },
        { name: "Radiant Creamy Concealer", brand: "NARS", category: "Concealer", finish: "NATURAL", price: 32.0, stock: 35 },
        { name: "16HR Camo Concealer", brand: "e.l.f.", category: "Concealer", finish: "MATTE", price: 7.0, stock: 120 },

        // ---------------- Blush ----------------
        { name: "Powder Blush - Melba", brand: "MAC", category: "Blush", finish: null, price: 28.0, stock: 35 },
        { name: "Orgasm Blush", brand: "NARS", category: "Blush", finish: null, price: 32.0, stock: 30 },
        { name: "Sweet Cheeks Blush", brand: "NYX", category: "Blush", finish: null, price: 9.99, stock: 80 },
        { name: "Putty Blush", brand: "e.l.f.", category: "Blush", finish: null, price: 7.0, stock: 100 },

        // ---------------- Mascara ----------------
        { name: "Lash Sensational Mascara", brand: "Maybelline", category: "Mascara", finish: null, price: 9.99, stock: 120 },
        { name: "Sky High Mascara", brand: "Maybelline", category: "Mascara", finish: null, price: 11.99, stock: 110 },
        { name: "Better Than Sex Mascara", brand: "Dior", category: "Mascara", finish: null, price: 28.0, stock: 40 },

        // ---------------- Highlighter ----------------
        { name: "Killawatt Highlighter", brand: "Fenty Beauty", category: "Highlighter", finish: null, price: 40.0, stock: 25 },
        { name: "Baked Highlighter", brand: "Revlon", category: "Highlighter", finish: null, price: 12.99, stock: 70 },
        { name: "Born To Glow Highlighter", brand: "NYX", category: "Highlighter", finish: null, price: 10.0, stock: 80 },

        // ---------------- Eyeshadow ----------------
        { name: "Nude Eyeshadow Palette", brand: "Huda Beauty", category: "Eyeshadow", finish: null, price: 35.0, stock: 30 },
        { name: "Ultimate Shadow Palette", brand: "NYX", category: "Eyeshadow", finish: null, price: 18.0, stock: 45 },
        { name: "Bite Size Eyeshadow", brand: "e.l.f.", category: "Eyeshadow", finish: null, price: 3.0, stock: 120 },
    ];

    // ---------------------------
    // 5) Shade generator (ONLY for foundation + concealer)
    // ---------------------------
    const undertones = ["Warm", "Neutral", "Cool"];

    function toneForIndex(i) {
        if (i < 2) return "Very Light";
        if (i < 4) return "Light";
        if (i < 6) return "Medium";
        if (i < 7) return "Tan";
        return "Deep";
    }

    // ---------------------------
    // 6) Insert products (+ shades when needed)
    // ---------------------------
    for (const p of products) {
    const brandId = brands[p.brand].id;
    const categoryId = categories[p.category].id;

    const existing = await prisma.product.findFirst({
        where: {
            name: p.name,
            brandId,
            categoryId,
        },
    });

    const product = existing
        ? await prisma.product.update({
              where: { id: existing.id },
              data: {
                  imageUrl: p.imageUrl,
              },
          })
        : await prisma.product.create({
              data: {
                  name: p.name,
                  description: null,
                  imageUrl: p.imageUrl,
                  price: p.price,
                  stock: p.stock,
                  brandId,
                  categoryId,
                  finish: p.finish,
                  suitableForAllSkinTypes: true,
              },
          });

        // Only create shades for Foundation & Concealer
        if (p.category === "Foundation" || p.category === "Concealer") {
            const shadeCount = await prisma.shade.count({
                where: { productId: product.id },
            });

            if (shadeCount === 0) {
                const shades = [];
                for (let i = 0; i < 8; i++) {
                    const tone = toneForIndex(i);
                    const undertone = undertones[i % undertones.length];

                    shades.push({
                        productId: product.id,
                        name: `${i + 1} - ${tone} ${undertone}`,
                        tone,
                        undertone,
                    });
                }

                await prisma.shade.createMany({ data: shades });
            }
        }
    }

    console.log("✅ Seed complete (Foundation, Concealer + Blush, Mascara, Highlighter, Eyeshadow)");
}

main()
    .catch((e) => {
        console.error("❌ Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
