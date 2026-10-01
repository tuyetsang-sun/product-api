require('dotenv').config({ quiet: true });

const mongoose = require('mongoose');
const app = require('./app');
const Product = require('./models/Product');

mongoose.set('bufferCommands', false);

async function start() {
    const port = Number(process.env.PORT);
    const host = process.env.HOST;

    if (!process.env.MONGODB_URI || !host) {
        throw new Error('Thieu MONGODB_URI hoac HOST trong .env');
    }

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('PORT trong .env khong hop le');
    }

    // Kết nối đến MongoDB.
    await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000
    });

    // Đợi tạo index để bảo đảm pid không bị trùng.
    await Product.init();

    console.log('MongoDB connected');

    // Chỉ khởi động API sau khi kết nối MongoDB thành công.
    const server = app.listen(port, host, () => {
        console.log(`Product API running on port ${port}`);
    });

    server.on('error', err => {
        console.error('HTTP server error:', err.message);
        process.exit(1);
    });

    // Đóng server và kết nối MongoDB khi dừng ứng dụng.
    let closing = false;

    function shutdown() {
        if (closing) return;
        closing = true;

        const timer = setTimeout(() => process.exit(1), 10000);
        timer.unref();

        server.close(() => {
            mongoose.disconnect()
                .then(() => process.exit(0))
                .catch(() => process.exit(1));
        });
    }

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

start().catch(err => {
    console.error('Startup failed:', err.message);
    process.exit(1);
});