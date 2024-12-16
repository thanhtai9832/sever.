const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const countdownData = {}; 

app.post('/set-data', (req, res) => {
    const { envelope_id, unpack_at, extra_now, diamond_count, people_count, expiry_time } = req.body;

    if (!envelope_id || !unpack_at || !extra_now) {
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết!' });
    }

    const end_time = unpack_at * 1000; // Chuyển thành mili giây

    countdownData[envelope_id] = {
        end_time,
        extra_now,
        expiry_time,
        diamond_count: diamond_count || 0,
        people_count: people_count || 0,
    };

    console.log(`Dữ liệu nhận được cho envelope_id ${envelope_id}:`, countdownData[envelope_id]);
    res.json({ message: 'Dữ liệu đã được lưu thành công!', envelope_id });
});

app.use(express.static(path.join(__dirname, 'public')));

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
    const envelope_id = new URL(req.url, `http://${req.headers.host}`).searchParams.get('envelope_id');

    if (!envelope_id || !countdownData[envelope_id]) {
        ws.send(JSON.stringify({ error: 'Không tìm thấy dữ liệu cho envelope_id này!' }));
        return ws.close();
    }

    const data = countdownData[envelope_id];

    const intervalId = setInterval(() => {
        const currentTime = Date.now();
        const remainingTime = Math.max(data.end_time - currentTime, 0);

        if (remainingTime === 0) {
            ws.send(JSON.stringify({ status: 'Hết giờ', envelope_id }));
            clearInterval(intervalId);
            return;
        }

        ws.send(
            JSON.stringify({
                remaining_time: remainingTime,
                envelope_id,
                expiry_time: data.expiry_time,
                end_time: data.end_time,
                diamond_count: data.diamond_count,
                people_count: data.people_count,
            })
        );
    }, 100);

    ws.on('close', () => {
        clearInterval(intervalId);
        console.log(`Kết nối đã đóng cho envelope_id: ${envelope_id}`);
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
