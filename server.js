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
app.use(cors()); // Kích hoạt CORS cho tất cả nguồn
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

// API lấy tất cả giá trị unpack_at
app.get('/get-unpack-at', async (req, res) => {
    try {
        const data = await collection.find({}).toArray(); // Lấy tất cả các bản ghi trong collection
        if (!data.length) {
            return res.status(404).json({ error: 'Không có dữ liệu unpack_at nào!' });
        }
        const currentTime = Math.floor(Date.now() / 1000); // Lấy thời gian hiện tại
        const response = data.map(item => ({
            envelope_id: item.envelope_id,
            unpackAt: item.unpack_at,
            remainingTime: Math.max(item.unpack_at - currentTime, 0)
        }));
        res.json(response);
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
