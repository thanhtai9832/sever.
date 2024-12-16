const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const countdownData = {};

app.post('/set-data', (req, res) => {
    const { unpack_at, extra_now, envelope_id, diamond_count, people_count, expiry_time } = req.body;

    if (!unpack_at || !extra_now || !envelope_id) {
        console.error("Thiếu thông tin bắt buộc:", { unpack_at, extra_now, envelope_id });
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết!' });
    }

    const time_id = envelope_id; 
    const end_time = unpack_at * 1000; 

    // Lưu dữ liệu vào countdownData
    countdownData[time_id] = {
        tiktok_id,
        end_time,
        extra_now,
        expiry_time,
        diamond_count: diamond_count || 0,
        people_count: people_count || 0,
    };

    console.log(`Dữ liệu đã lưu thành công cho time_id ${time_id}:`, countdownData[time_id]);
    res.json({ message: 'Dữ liệu đã được lưu thành công!', time_id });
});

// Phục vụ file tĩnh
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket Server
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
    const urlParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
    const time_id = urlParams.get('time_id');

    console.log(`Kết nối mới với time_id: ${time_id}`);

    if (!time_id || !countdownData[time_id]) {
        ws.send(JSON.stringify({ error: 'Không tìm thấy dữ liệu cho time_id này!' }));
        console.error(`Không tìm thấy dữ liệu cho time_id: ${time_id}`);
        return ws.close();
    }

    const data = countdownData[time_id];

    // Gửi dữ liệu đếm ngược
    const intervalId = setInterval(() => {
        const currentTime = Date.now();
        const remainingTime = Math.max(data.end_time - currentTime, 0);

        if (remainingTime === 0) {
            ws.send(JSON.stringify({ status: 'Hết giờ', time_id }));
            clearInterval(intervalId);
            console.log(`Time_id ${time_id} đã hết giờ.`);
            return;
        }

        ws.send(
            JSON.stringify({
                remaining_time: remainingTime,
                tiktok_id,
                expiry_time: data.expiry_time,
                end_time: data.end_time,
                diamond_count: data.diamond_count,
                people_count: data.people_count,
            })
        );
    }, 100);

    // Dọn dẹp khi kết nối WebSocket đóng
    ws.on('close', () => {
        clearInterval(intervalId);
        console.log(`Kết nối đã đóng cho time_id: ${time_id}`);
    });
});

const server = app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
