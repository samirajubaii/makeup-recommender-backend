const { faceapi, loadModels } = require("./faceApiSetup");
const canvas = require("canvas");
const { extractSkinStats } = require("./skinColor");
const { recommend } = require("./recommend");

function classifyTone(v) {
    if (v >= 0.85) return "Very Light";
    if (v >= 0.75) return "Light";
    if (v >= 0.62) return "Medium";
    if (v >= 0.48) return "Tan";
    return "Deep";
}

function classifyUndertone(h, s) {
    if (s < 0.15) return "Neutral";

    // Borderline zone
    if (h > 15 && h < 25) return "Neutral";

    if (h >= 25 && h <= 70) return "Warm";
    if (h >= 290 || h <= 15) return "Cool";

    return "Neutral";
}


async function run() {
    await loadModels();

    const imagePath = "./testFace.jpg";
    const img = await canvas.loadImage(imagePath);

    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks();
    if (!detection) {
        console.log("❌ No face detected");
        return;
    }

    console.log("✅ Face detected! Landmarks:", detection.landmarks.positions.length);

    const stats = await extractSkinStats(imagePath, detection.landmarks.positions);

    console.log("RGB avg:", stats.rgbAvg);
    console.log("HSV avg:", stats.hsvAvg);

    const tone = classifyTone(stats.hsvAvg.v);
    const undertone = classifyUndertone(stats.hsvAvg.h, stats.hsvAvg.s);

    console.log("🎨 Tone:", tone);
    console.log("🌡 Undertone:", undertone);
    const user = { tone, undertone };

    const foundations = recommend(user, "foundation");
    const concealers = recommend(user, "concealer");

    console.log("💄 Top foundations:", foundations);
    console.log("🧴 Top concealers:", concealers);
}

run();

