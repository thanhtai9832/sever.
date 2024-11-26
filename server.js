const express = require('express');
const { MongoClient } = require('mongodb');
const app = express();
const port = process.env.PORT || 3000; // Cổng do Render hoặc dịch vụ cung cấp

// MongoDB URL (thay bằng URL của bạn từ MongoDB Atlas)
const mongoUrl = "mongodb+srv://0332708028tai:JF6EuT9ea_rzjiG@cluster0.fr7ad.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(mongoUrl);

let db, collection;

// Middleware xử lý JSON
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

// API lấy giá trị unpack_at
app.get('/get-unpack-at', async (req, res) => {
    try {
        const data = await collection.findOne({});
        if (!data || !data.unpack_at) {
            return res.status(404).json({ error: 'unpack_at chưa được thiết lập!' });
        }
        const currentTime = Math.floor(Date.now() / 1000); // Lấy thời gian hiện tại
        const remainingTime = Math.max(data.unpack_at - currentTime, 0); // Tính thời gian còn lại
        res.json({ unpackAt: data.unpack_at, remainingTime });
    } catch (err) {
        res.status(500).json({ error: 'Lỗi khi truy xuất dữ liệu!' });
    }
});

// API thiết lập giá trị unpack_at
app.post('/set-unpack-at', async (req, res) => {
    const { unpack_at } = req.body;
    if (!unpack_at || isNaN(unpack_at)) {
        return res.status(400).json({ error: 'Giá trị unpack_at không hợp lệ!' });
    }
    try {
        await collection.updateOne(
            {}, // Không có điều kiện -> cập nhật dữ liệu duy nhất
            { $set: { unpack_at: parseInt(unpack_at, 10) } }, // Thiết lập giá trị unpack_at
            { upsert: true } // Nếu không có dữ liệu, tạo mới
        );
        res.json({ message: 'unpack_at đã được thiết lập!', unpackAt: parseInt(unpack_at, 10) });
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
