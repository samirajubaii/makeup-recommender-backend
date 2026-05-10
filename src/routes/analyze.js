const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const { UPLOAD_DIR, RETURN_DEBUG } = require("../config");
const { analyzeImage } = require("../services/analysisService");
const { getRecommendations } = require("../services/recommendationService");

const router = express.Router();

function normalizeTone(tone) {
    const map = {
        "very light": "Very Light",
        "light": "Light",
        "medium": "Medium",
        "tan": "Tan",
        "deep": "Deep",
    };
    const key = (tone ?? "").toString().trim().toLowerCase();
    return map[key] || tone;
}

function normalizeUndertone(u) {
    const map = { warm: "Warm", cool: "Cool", neutral: "Neutral" };
    const key = (u ?? "").toString().trim().toLowerCase();
    return map[key] || u;
}
function normalizeSkinType(s) {
    const map = {
        oily: "oily",
        dry: "dry",
        combination: "combination",
        normal: "normal",
    };
    const key = (s ?? "").toString().trim().toLowerCase();
    return map[key] || "normal"; // default normal
}


if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
const upload = multer({ dest: UPLOAD_DIR });

async function safeDelete(filePath, attempts = 5) {
    for (let i = 0; i < attempts; i++) {
        try {
            await fs.promises.unlink(filePath);
            return;
        } catch (err) {
            if (err.code === "EPERM" || err.code === "EBUSY") {
                await new Promise((r) => setTimeout(r, 250));
                continue;
            }
            if (err.code === "ENOENT") return;
            throw err;
        }
    }
}

router.post("/analyze", upload.single("photo"), async (req, res) => {
    let imagePath;

    try {
        console.log("FILE:", req.file);
        if (!req.file) return res.status(400).json({ error: "photo is required" });

        imagePath = path.resolve(req.file.path);

        const { tone, undertone, stats } = await analyzeImage(imagePath);

        // normalize right here
        const normTone = normalizeTone(tone);
        const normUndertone = normalizeUndertone(undertone);

        const skinType = normalizeSkinType(req.body.skinType);

        const { foundations, concealers } = await getRecommendations({
            tone: normTone,
            undertone: normUndertone,
            skinType,
        });


        const response = {
            tone: normTone,
            undertone: normUndertone,
            skinType,
            recommendations: { foundations, concealers },

        };


        if (RETURN_DEBUG) {
            response.debug = { rgbAvg: stats.rgbAvg, hsvAvg: stats.hsvAvg };
        }
        console.log("LAB values:", stats.labAvg);
        console.log("Tone:", tone, "Undertone:", undertone);
        return res.json(response);
    } catch (err) {
        return res.status(err.status || 500).json({ error: err.message || "Server error" });
    } finally {
        if (imagePath) await safeDelete(imagePath);
    }
});

module.exports = router;
