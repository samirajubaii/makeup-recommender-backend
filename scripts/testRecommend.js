const { findRecommendedShades } = require("../src/repositories/productRepository");

async function main() {
    const result = await findRecommendedShades({
        tone: "Medium",
        undertone: "Warm",
        typeName: "Foundation",
        limit: 10,
    });

    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
}

main().catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
});