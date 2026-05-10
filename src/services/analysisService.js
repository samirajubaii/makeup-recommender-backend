const canvas = require("canvas");
const { faceapi, loadModels } = require("../../faceApiSetup");
const { extractSkinStats } = require("../../skinColor");

/**
 * Tone classification using LAB L channel
 */
function classifyTone(L) {
    if (L >= 80) return "Very Light";
    if (L >= 70) return "Light";
    if (L >= 60) return "Medium";
    if (L >= 50) return "Tan";
    return "Deep";
}

/**
 * Undertone classification using LAB A and B
 */
function classifyUndertone(a, b) {
    // LAB notes:
    // +a = red/pink, +b = yellow
    // Neutral often means low chroma OR a and b are close.

    const chroma = Math.sqrt(a * a + b * b); // strength of color (bigger = more tinted)
    const diff = b - a; // positive => warmer (more yellow); negative => cooler (more pink)

    // 1) If color is weak, call it Neutral
    if (chroma < 18) return "Neutral";

    // 2) If a and b are close, call it Neutral (balanced)
    if (Math.abs(diff) <= 3) return "Neutral";

    // 3) Otherwise decide warm/cool based on which dominates
    if (diff > 3) return "Warm";
    if (diff < -3) return "Cool";

    return "Neutral";
}


async function analyzeImage(imagePath) {
    await loadModels();

    const img = await canvas.loadImage(imagePath);
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks();

    if (!detection) {
        const err = new Error("No face detected. Use a clearer front-facing photo.");
        err.status = 400;
        throw err;
    }

    const stats = await extractSkinStats(imagePath, detection.landmarks);


    const tone = classifyTone(stats.labAvg.l);
    const undertone = classifyUndertone(stats.labAvg.a, stats.labAvg.b);

    return { tone, undertone, stats };
}

module.exports = { analyzeImage };