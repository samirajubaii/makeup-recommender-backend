const app = require("./src/app");
const { PORT } = require("./src/config");

// Update to bind server to all network interfaces
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend running on http://0.0.0.0:${PORT}`);
});


