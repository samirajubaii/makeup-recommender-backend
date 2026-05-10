const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// change this if needed
const UPLOADS_PATH = path.join(__dirname, "..", "uploads");

function normalize(str) {
    return str.trim().toLowerCase();
}

async function main() {
    const files = fs.readdirSync(UPLOADS_PATH);

    const products = await prisma.product.findMany();

    let updatedCount = 0;

    for (const product of products) {
        const normalizedProductName = normalize(product.name);

        const matchingFile = files.find(file => {
            const nameWithoutExt = normalize(path.parse(file).name);
            return nameWithoutExt === normalizedProductName;
        });

        if (matchingFile) {
            const imageUrl = `/uploads/${matchingFile}`;

            await prisma.product.update({
                where: { id: product.id },
                data: { imageUrl }
            });

            console.log(`✅ Updated ${product.name} -> ${matchingFile}`);
            updatedCount++;
        }
    }

    console.log(`\n🎉 Done! ${updatedCount} products updated.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
