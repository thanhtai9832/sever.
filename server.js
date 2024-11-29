const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware để xử lý JSON
app.use(express.json());

// Tạo danh sách lưu trữ dữ liệu bộ đếm theo tiktok_id và extra_now
const countdownData = {};

// API nhận dữ liệu từ Python
app.post('/set-data', (req, res) => {
    const { unpack_at, extra_now, tiktok_id, diamond_count, people_count, expiry_time } = req.body;

    if (!unpack_at || !extra_now || !tiktok_id) {
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết!' });
    }

    // Tính toán end_time và lưu vào danh sách
    const end_time = unpack_at * 1000; // end_time là timestamp (ms)
    if (!countdownData[tiktok_id]) {
        countdownData[tiktok_id] = {};
    }
    countdownData[tiktok_id][extra_now] = {
        end_time,
        extra_now,
        expiry_time,
        diamond_count: diamond_count || 0, // Lưu diamond_count mặc định là 0 nếu không có
        people_count: people_count || 0, // Lưu people_count mặc định là 0 nếu không có
    };
    console.log(`Dữ liệu nhận được cho tiktok_id ${tiktok_id} với extra_now ${extra_now}:`, countdownData[tiktok_id]);

    res.json({ message: 'Dữ liệu đã được lưu thành công!' });
});

// Phục vụ file tĩnh trong thư mục public
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket để gửi remainingTime
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
    // Lấy tiktok_id và extra_now từ query string
    const queryParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const tiktok_id = queryParams.get('tiktok_id');
    const extra_now = queryParams.get('extra_now');

    // Kiểm tra dữ liệu tồn tại
    if (!tiktok_id || !extra_now || !countdownData[tiktok_id] || !countdownData[tiktok_id][extra_now]) {
        ws.send(JSON.stringify({ error: 'Không tìm thấy dữ liệu cho tiktok_id hoặc extra_now này!' }));
        return ws.close();
    }

    // Lấy dữ liệu phù hợp
    const data = countdownData[tiktok_id][extra_now];

    // Bắt đầu gửi dữ liệu định kỳ
    const intervalId = setInterval(() => {
        if (data) {
            const currentTime = Date.now(); // Thời gian hiện tại trên server
            const remainingTime = Math.max(data.end_time - currentTime, 0);

            if (remainingTime === 0) {
                ws.send(JSON.stringify({ status: 'Hết giờ', tiktok_id, extra_now }));
                clearInterval(intervalId);
                return;
            }

            // Gửi dữ liệu qua WebSocket
            ws.send(
                JSON.stringify({
                    remaining_time: remainingTime,
                    tiktok_id,
                    extra_now,
                    expiry_time: data.expiry_time,
                    end_time: data.end_time,
                    diamond_count: data.diamond_count,
                    people_count: data.people_count,
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
