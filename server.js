const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware để xử lý JSON
app.use(express.json());

// Tạo danh sách lưu dữ liệu bộ đếm theo tiktok_id
const countdownData = {};

// API nhận dữ liệu từ Python
app.post('/set-data', (req, res) => {
    const { unpack_at, extra_now, tiktok_id } = req.body;

    if (!unpack_at || !extra_now || !tiktok_id) {
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết!' });
    }

    // Lưu dữ liệu vào danh sách theo tiktok_id
    countdownData[tiktok_id] = { unpack_at, extra_now };
    console.log(Dữ liệu nhận được cho tiktok_id ${tiktok_id}:, countdownData[tiktok_id]);

    res.json({ message: 'Dữ liệu đã được lưu thành công!' });
});

// Phục vụ file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket để gửi remainingTime
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
    // Lấy tiktok_id từ query string
    const tiktok_id = new URL(req.url, http://${req.headers.host}).searchParams.get('tiktok_id');

    if (!tiktok_id || !countdownData[tiktok_id]) {
        ws.send(JSON.stringify({ error: 'Không tìm thấy dữ liệu cho tiktok_id này!' }));
        return ws.close();
    }

    setInterval(() => {
        const data = countdownData[tiktok_id];
        if (data) {
            const currentTime = Date.now(); // Thời gian hiện tại trên server
            const offset = currentTime - data.extra_now; // Sai lệch giữa server và extra_now
            const remainingTime = Math.max(data.unpack_at * 1000 - (currentTime - offset), 0);

            // Gửi dữ liệu đến client qua WebSocket
            ws.send(
                JSON.stringify({
                    remaining_time: remainingTime,
                    tiktok_id,
                    unpack_at: data.unpack_at,
                })
            );
        }
    }, 100); // Cập nhật mỗi 100ms
});

// Sử dụng HTTP server thông thường (Render tự động thêm HTTPS)
const server = app.listen(port, () => {
    console.log(Server đang chạy tại http://localhost:${port});
});

// Cấu hình WebSocket Secure
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
