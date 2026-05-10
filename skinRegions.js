function rectFromPoints(points, pad = 10) {
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);

    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;

    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function getSkinRegions(landmarks) {
    // dlib 68 landmark indices:
    // jaw: 0-16, eyebrows: 17-26, nose: 27-35, eyes: 36-47, mouth: 48-67

    // Cheeks: choose points around cheek area (approx)
    const leftCheekPts = [landmarks[2], landmarks[3], landmarks[4], landmarks[31]];
    const rightCheekPts = [landmarks[12], landmarks[13], landmarks[14], landmarks[35]];

    // Forehead: based on eyebrows, then move upward
    const browPts = [landmarks[19], landmarks[20], landmarks[23], landmarks[24]];
    const browRect = rectFromPoints(browPts, 12);

    const forehead = {
        x: browRect.x,
        y: browRect.y - browRect.h * 0.9,
        w: browRect.w,
        h: browRect.h * 0.8
    };

    return {
        leftCheek: rectFromPoints(leftCheekPts, 12),
        rightCheek: rectFromPoints(rightCheekPts, 12),
        forehead
    };
}

module.exports = { getSkinRegions };
