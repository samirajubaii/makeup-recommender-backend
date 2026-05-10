const prisma = require("../src/prismaClient");

async function test() {
    const count = await prisma.brand.count();
    console.log("Brand count:", count);
    process.exit(0);
}

test().catch(console.error);