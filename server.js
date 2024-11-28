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
    const { unpack_at, extra_now, tiktok_id, diamond_count, people_count } = req.body;

    if (!unpack_at || !extra_now || !tiktok_id) {
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết!' });
    }

    // Tính toán end_time và lưu vào danh sách
    const end_time = unpack_at * 1000; // end_time là timestamp (ms)
    countdownData[tiktok_id] = {
        end_time,
        extra_now,
        diamond_count: diamond_count || 0, // Lưu diamond_count mặc định là 0 nếu không có
        people_count: people_count || 0, // Lưu people_count mặc định là 0 nếu không có
    };
    console.log(`Dữ liệu nhận được cho tiktok_id ${tiktok_id}:`, countdownData[tiktok_id]);

    res.json({ message: 'Dữ liệu đã được lưu thành công!' });
});

// Phục vụ file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket để gửi remainingTime
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
    // Lấy tiktok_id từ query string
    const tiktok_id = new URL(req.url, `http://${req.headers.host}`).searchParams.get('tiktok_id');

    if (!tiktok_id || !countdownData[tiktok_id]) {
        ws.send(JSON.stringify({ error: 'Không tìm thấy dữ liệu cho tiktok_id này!' }));
        return ws.close();
    }

    const data = countdownData[tiktok_id];
    const intervalId = setInterval(() => {
        if (data) {
            const currentTime = Date.now(); // Thời gian hiện tại trên server
            const remainingTime = Math.max(data.end_time - currentTime, 0);

            // Nếu hết hạn, gửi trạng thái "Hết giờ" và dừng gửi
            if (remainingTime === 0) {
                ws.send(JSON.stringify({ status: 'Hết giờ', tiktok_id }));
                clearInterval(intervalId);
                return;
            }

            // Gửi dữ liệu đến client qua WebSocket
            ws.send(
                JSON.stringify({
                    remaining_time: remainingTime,
                    tiktok_id,
                    end_time: data.end_time,
                    diamond_count: data.diamond_count, // Thêm diamond_count
                    people_count: data.people_count, // Thêm people_count
                })
            );
        }
    }, 100); // Cập nhật mỗi 100ms
});

// Sử dụng HTTP server thông thường (Render tự động thêm HTTPS)
const server = app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});

// Cấu hình WebSocket Secure
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
