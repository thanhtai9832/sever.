const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware để xử lý JSON
app.use(express.json());

// Tạo biến lưu trữ dữ liệu từ Python
let countdownData = {
    unpack_at: null,
    extra_now: null,
    tiktok_id: null,
};

// API nhận dữ liệu từ Python
app.post('/set-data', (req, res) => {
    const { unpack_at, extra_now, tiktok_id } = req.body;

    if (!unpack_at || !extra_now || !tiktok_id) {
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết!' });
    }

    // Lưu dữ liệu vào biến toàn cục
    countdownData = { unpack_at, extra_now, tiktok_id };
    console.log('Dữ liệu nhận được:', countdownData);

    res.json({ message: 'Dữ liệu đã được lưu thành công!' });
});

// Phục vụ file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket để gửi remainingTime
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
    setInterval(() => {
        if (countdownData.unpack_at && countdownData.extra_now) {
            const currentTime = Date.now(); // Thời gian hiện tại trên server
            const offset = currentTime - countdownData.extra_now; // Sai lệch giữa server và extra_now
            const remainingTime = Math.max(countdownData.unpack_at * 1000 - (currentTime - offset), 0);

            // Gửi dữ liệu đến client qua WebSocket
            ws.send(
                JSON.stringify({
                    remaining_time: remainingTime,
                    tiktok_id: countdownData.tiktok_id,
                    unpack_at: countdownData.unpack_at,
                })
            );
        }
    }, 100); // Cập nhật mỗi 100ms
});

const server = app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
