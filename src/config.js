module.exports = {
    PORT: process.env.PORT || 3000,
    RETURN_DEBUG: process.env.RETURN_DEBUG === "true",
    UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
};
