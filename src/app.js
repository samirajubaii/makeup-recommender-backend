const path = require("path");
const express = require("express");
const cors = require("cors");
const { UPLOAD_DIR } = require("./config");

const analyzeRoutes = require("./routes/analyze");
const productRoutes = require("./routes/products");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const authRoutes = require("./routes/auth"); // Ensure auth.js is imported
const adminRoutes = require("./routes/admin");
const brandsRouter = require("./routes/brands");
const categoriesRouter = require("./routes/categories");


const app = express();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors());
app.use(express.json());


app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api", analyzeRoutes);
app.use("/api/products", productRoutes);
app.use("/api", cartRoutes);
app.use("/api/orders", orderRoutes);  // Change this line to mount orders route correctly
app.use("/api/auth", authRoutes); // Make sure the auth route is prefixed with /api/auth
app.use("/api/admin", adminRoutes);
app.use("/api/brands", brandsRouter);
app.use("/api/categories", categoriesRouter);

module.exports = app;
