// skinColor.js
const canvas = require("canvas");
const convert = require("color-convert");

/**
 * Pick better skin sampling points using FaceLandmarks68 getters.
 * We avoid jawline (often shadow/beard) and eyebrows (dark hair).
 *
 * Returns 3 points: [cheekLeft, cheekRight, forehead]
 */
function pickSkinSamplePoints(faceLandmarks) {
    const jaw = faceLandmarks.getJawOutline();      // 17 points
    const nose = faceLandmarks.getNose();           // 9 points
    const leftEye = faceLandmarks.getLeftEye();     // 6 points
    const rightEye = faceLandmarks.getRightEye();   // 6 points
    const leftBrow = faceLandmarks.getLeftEyeBrow();// 5 points
    const rightBrow = faceLandmarks.getRightEyeBrow();// 5 points

    const mid = (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });

    // Side-of-face points (higher than jaw corners)
    const leftSide = jaw[4];
    const rightSide = jaw[12];

    // Nose center-ish point (stable)
    const noseCenter = nose[3] ?? nose[Math.floor(nose.length / 2)];

    // Start cheeks as midpoint between nose and side face
    let cheekLeft = mid(noseCenter, leftSide);
    let cheekRight = mid(noseCenter, rightSide);

    // Push cheeks slightly down (avoid under-eye shadow area)
    const eyeLineY = (leftEye[0].y + rightEye[3].y) / 2;
    cheekLeft.y = (cheekLeft.y + eyeLineY) / 2 + 10;
    cheekRight.y = (cheekRight.y + eyeLineY) / 2 + 10;

    // Forehead: mid between brows, then move up (avoid eyebrows)
    const browMid = mid(leftBrow[2], rightBrow[2]);
    const forehead = { x: browMid.x, y: browMid.y - 25 };

    return [cheekLeft, cheekRight, forehead];
}

/**
 * Extract average skin stats from cheek + forehead regions.
 * Input:
 *  - imagePath: string
 *  - faceLandmarks: FaceLandmarks68 object (detection.landmarks)
 *
 * Returns:
 * {
 *   rgbAvg: { r, g, b },
 *   hsvAvg: { h, s, v },
 *   labAvg: { l, a, b }
 * }
 */
async function extractSkinStats(imagePath, faceLandmarks) {
    const img = await canvas.loadImage(imagePath);
    const c = canvas.createCanvas(img.width, img.height);
    const ctx = c.getContext("2d");

    ctx.drawImage(img, 0, 0);

    const samplePoints = pickSkinSamplePoints(faceLandmarks);

    let rTotal = 0;
    let gTotal = 0;
    let bTotal = 0;
    let count = 0;

    // adjust as needed (smaller radius = less hair/background risk)
    const radius = 12;

    for (const point of samplePoints) {
        const xStart = Math.max(0, Math.floor(point.x - radius));
        const yStart = Math.max(0, Math.floor(point.y - radius));

        // ✅ clamp width/height so getImageData never goes out of bounds
        const width = Math.min(radius * 2, img.width - xStart);
        const height = Math.min(radius * 2, img.height - yStart);

        if (width <= 0 || height <= 0) continue;

        const imageData = ctx.getImageData(xStart, yStart, width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            // ignore transparent pixels (just in case)
            if (a === 0) continue;

            // ✅ reject very dark shadows + very bright highlights
            const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            if (luminance < 30 || luminance > 245) continue;

            // ✅ reject near-gray pixels (often glare/background)
            const maxc = Math.max(r, g, b);
            const minc = Math.min(r, g, b);
            if (maxc - minc < 8) continue;

            rTotal += r;
            gTotal += g;
            bTotal += b;
            count++;
        }
    }

    // If everything got filtered out, fallback to unfiltered sampling (so app still works)
    if (count === 0) {
        let r2 = 0, g2 = 0, b2 = 0, c2 = 0;

        for (const point of samplePoints) {
            const xStart = Math.max(0, Math.floor(point.x - radius));
            const yStart = Math.max(0, Math.floor(point.y - radius));
            const width = Math.min(radius * 2, img.width - xStart);
            const height = Math.min(radius * 2, img.height - yStart);
            if (width <= 0 || height <= 0) continue;

            const imageData = ctx.getImageData(xStart, yStart, width, height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                r2 += data[i];
                g2 += data[i + 1];
                b2 += data[i + 2];
                c2++;
            }
        }

        if (c2 === 0) {
            throw new Error("Could not sample skin pixels. Try a clearer photo with better lighting.");
        }

        rTotal = r2;
        gTotal = g2;
        bTotal = b2;
        count = c2;
    }

    const rAvg = rTotal / count;
    const gAvg = gTotal / count;
    const bAvg = bTotal / count;

    // HSV (for debug)
    const [h, s, v] = convert.rgb.hsv(rAvg, gAvg, bAvg);

    // LAB (for classification)
    const [l, labA, labB] = convert.rgb.lab(rAvg, gAvg, bAvg);

    return {
        rgbAvg: { r: rAvg, g: gAvg, b: bAvg },
        hsvAvg: { h, s: s / 100, v: v / 100 },
        labAvg: { l, a: labA, b: labB },
    };
}

module.exports = { extractSkinStats };
