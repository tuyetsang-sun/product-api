const express = require('express');
const mongoose = require('mongoose');
const Product = require('./models/Product');

const app = express();

app.disable('x-powered-by');

// Ghi log mỗi request để thuận tiện kiểm tra.
app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`${req.method} ${req.path} ${res.statusCode}`);
    });
    next();
});

// Đọc dữ liệu JSON từ request.
app.use(express.json({ limit: '100kb' }));

// Kiểm tra dữ liệu khi thêm hoặc cập nhật sản phẩm.
function validateProduct(req, res, next) {
    const body = req.body;

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return res.status(400).json({
            message: 'Body phai la object JSON'
        });
    }

    const allowed = ['pid', 'pname', 'price', 'quantity'];

    if (Object.keys(body).some(key => !allowed.includes(key))) {
        return res.status(400).json({
            message: 'Chi chap nhan pid, pname, price, quantity'
        });
    }

    if (
        typeof body.pid !== 'string' ||
        !/^[A-Za-z0-9_-]{1,50}$/.test(body.pid)
    ) {
        return res.status(400).json({
            message: 'pid gom 1-50 ky tu: chu, so, dau gach ngang hoac gach duoi'
        });
    }

    if (
        typeof body.pname !== 'string' ||
        body.pname.trim().length === 0 ||
        body.pname.trim().length > 120
    ) {
        return res.status(400).json({
            message: 'pname phai co tu 1 den 120 ky tu'
        });
    }

    if (
        typeof body.price !== 'number' ||
        !Number.isFinite(body.price) ||
        body.price < 0
    ) {
        return res.status(400).json({
            message: 'price phai la so khong am'
        });
    }

    if (!Number.isSafeInteger(body.quantity) || body.quantity < 0) {
        return res.status(400).json({
            message: 'quantity phai la so nguyen khong am trong pham vi an toan'
        });
    }

    next();
}

// Kiểm tra sức khỏe API và kết nối MongoDB.
app.get('/health', async(req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                status: 'error',
                mongodb: 'disconnected'
            });
        }

        await mongoose.connection.db.admin().ping();

        res.json({
            status: 'ok',
            mongodb: 'connected'
        });
    } catch {
        res.status(503).json({
            status: 'error',
            mongodb: 'unavailable'
        });
    }
});

// CREATE: Thêm sản phẩm.
app.post('/api/products', validateProduct, async(req, res) => {
    const product = await Product.create(req.body);
    res.status(201).json(product);
});

// READ: Xem danh sách sản phẩm.
app.get('/api/products', async(req, res) => {
    const products = await Product.find().sort({ pid: 1 });
    res.json(products);
});

// READ: Xem chi tiết theo pid.
app.get('/api/products/:pid', async(req, res) => {
    const product = await Product.findOne({
        pid: req.params.pid
    });

    if (!product) {
        return res.status(404).json({
            message: 'Khong tim thay san pham'
        });
    }

    res.json(product);
});

// UPDATE: Gửi đủ 4 trường và giữ nguyên pid.
app.put('/api/products/:pid', validateProduct, async(req, res) => {
    if (req.body.pid !== req.params.pid) {
        return res.status(400).json({
            message: 'pid trong body phai trung voi pid tren URL'
        });
    }

    const product = await Product.findOneAndUpdate({ pid: req.params.pid }, {
        $set: {
            pname: req.body.pname,
            price: req.body.price,
            quantity: req.body.quantity
        }
    }, {
        returnDocument: 'after',
        runValidators: true
    });

    if (!product) {
        return res.status(404).json({
            message: 'Khong tim thay san pham'
        });
    }

    res.json(product);
});

// DELETE: Xóa sản phẩm theo pid.
app.delete('/api/products/:pid', async(req, res) => {
    const product = await Product.findOneAndDelete({
        pid: req.params.pid
    });

    if (!product) {
        return res.status(404).json({
            message: 'Khong tim thay san pham'
        });
    }

    res.json({
        message: 'Da xoa san pham',
        pid: product.pid
    });
});

// Xử lý đường dẫn không tồn tại.
app.use((req, res) => {
    res.status(404).json({
        message: 'Duong dan khong ton tai'
    });
});

// Xử lý lỗi tập trung, đặt sau các route.
app.use((err, req, res, next) => {
    if (err.code === 11000) {
        return res.status(409).json({
            message: 'pid da ton tai'
        });
    }

    if (err.name === 'ValidationError' || err.name === 'CastError') {
        return res.status(400).json({
            message: 'Du lieu san pham khong hop le'
        });
    }

    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({
            message: 'JSON khong hop le'
        });
    }

    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            message: 'Body vuot qua gioi han 100kb'
        });
    }

    console.error(err.message);

    res.status(500).json({
        message: 'Loi he thong'
    });
});

module.exports = app;