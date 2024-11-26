const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Dùng cổng do dịch vụ cung cấp

// Biến để lưu giá trị unpack_at
let unpackAt = null;

// Middleware để xử lý JSON
app.use(express.json());

// API lấy giá trị unpack_at
app.get('/get-unpack-at', (req, res) => {
    if (!unpackAt) {
        return res.status(404).json({ error: 'unpack_at chưa được thiết lập!' });
    }
    const currentTime = Math.floor(Date.now() / 1000); // Lấy thời gian hiện tại
    const remainingTime = Math.max(unpackAt - currentTime, 0); // Tính thời gian còn lại
    res.json({ unpackAt, remainingTime });
});

// API để thiết lập giá trị unpack_at
app.post('/set-unpack-at', (req, res) => {
    const { unpack_at } = req.body;
    if (!unpack_at || isNaN(unpack_at)) {
        return res.status(400).json({ error: 'Giá trị unpack_at không hợp lệ!' });
    }
    unpackAt = parseInt(unpack_at, 10);
    res.json({ message: 'unpack_at đã được thiết lập!', unpackAt });
});

// Chạy máy chủ
app.listen(port, () => {
    console.log(`Server đang chạy tại cổng ${port}`);
});
