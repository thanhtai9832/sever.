const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors'); // Import thư viện CORS
const app = express();
const port = process.env.PORT || 3000; // Cổng do Render hoặc dịch vụ cung cấp

// MongoDB URL (thay bằng URL của bạn từ MongoDB Atlas)
const mongoUrl = "mongodb+srv://0332708028tai:bEesGelJds0ubpVL@cluster0.fr7ad.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(mongoUrl);

let db, collection;

// Middleware xử lý JSON và CORS
const corsOptions = {
    origin: ['https://thanhtai9832.github.io'], // Chỉ cho phép domain GitHub Pages
    methods: ['GET', 'POST'], // Chỉ cho phép các phương thức cần thiết
    allowedHeaders: ['Content-Type'], // Cho phép các header cần thiết
};

app.use(cors(corsOptions)); // Sử dụng cấu hình CORS
app.use(express.json());

// Kết nối MongoDB
async function connectToDB() {
    try {
        await client.connect();
        db = client.db("countdown"); // Tên database
        collection = db.collection("unpack_data"); // Tên collection
        console.log("Kết nối MongoDB thành công!");
    } catch (err) {
        console.error("Lỗi kết nối MongoDB:", err);
        process.exit(1);
    }
}

// API lấy giá trị unpack_at dựa trên tham số query
app.get('/get-unpack-at', async (req, res) => {
    const { unpack_at } = req.query; // Lấy giá trị unpack_at từ query string
    if (!unpack_at || isNaN(unpack_at)) {
        return res.status(400).json({ error: 'Giá trị unpack_at không hợp lệ!' });
    }

    try {
        const currentTime = Math.floor(Date.now() / 1000); // Thời gian hiện tại
        const item = await collection.findOne({ unpack_at: parseInt(unpack_at, 10) }); // Tìm dữ liệu theo unpack_at

        if (!item) {
            return res.status(404).json({ error: 'Không tìm thấy dữ liệu với unpack_at đã cung cấp!' });
        }

        // Trả về thông tin của mục cụ thể
        res.json({
            envelope_id: item.envelope_id,
            unpackAt: item.unpack_at,
            remainingTime: Math.max(item.unpack_at - currentTime, 0),
        });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi truy xuất dữ liệu!' });
    }
});

// API thiết lập giá trị unpack_at
app.post('/set-unpack-at', async (req, res) => {
    const { unpack_at, envelope_id } = req.body;
    if (!unpack_at || isNaN(unpack_at)) {
        return res.status(400).json({ error: 'Giá trị unpack_at không hợp lệ!' });
    }
    if (!envelope_id) {
        return res.status(400).json({ error: 'envelope_id là bắt buộc!' });
    }
    try {
        await collection.updateOne(
            { envelope_id }, // Lọc theo envelope_id
            { $set: { unpack_at: parseInt(unpack_at, 10), envelope_id } }, // Lưu dữ liệu
            { upsert: true } // Nếu không có dữ liệu, tạo mới
        );
        res.json({ message: 'unpack_at đã được thiết lập!', envelope_id, unpackAt: parseInt(unpack_at, 10) });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi thiết lập dữ liệu!' });
    }
});

// Kết nối MongoDB và chạy máy chủ
connectToDB().then(() => {
    app.listen(port, () => {
        console.log(`Server đang chạy tại cổng ${port}`);
    });
});
