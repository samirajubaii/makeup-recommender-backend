const productRepo = require("../repositories/productRepository");

function normalizeSkinType(s) {
    const key = (s ?? "").toString().trim().toLowerCase();
    if (key === "oily") return "oily";
    if (key === "dry") return "dry";
    if (key === "combination") return "combination";
    return "normal";
}

function finishMatchesSkinType(finish, skinType) {
    const f = (finish ?? "").toString().trim().toLowerCase();

    // if you didn't add finish yet, don't filter
    if (!f) return true;

    if (skinType === "oily") return f === "matte" || f === "natural";
    if (skinType === "dry") return f === "dewy" || f === "natural";
    if (skinType === "combination") return f === "natural";
    return true; // normal -> allow all
}

// returns { foundations: [...], concealers: [...] }
async function getRecommendations({ tone, undertone, skinType }) {
    const st = normalizeSkinType(skinType);

    const foundationsRaw = await productRepo.findRecommendedShades({
        tone,
        undertone,
        typeName: "Foundation",
        limit: 20, // fetch more then filter
    });

    const concealersRaw = await productRepo.findRecommendedShades({
        tone,
        undertone,
        typeName: "Concealer",
        limit: 20,
    });

    const foundations = foundationsRaw
        .filter((p) => finishMatchesSkinType(p.finish, st))
        .slice(0, 5);

    const concealers = concealersRaw
        .filter((p) => finishMatchesSkinType(p.finish, st))
        .slice(0, 5);

    return { foundations, concealers };
}

module.exports = { getRecommendations };

