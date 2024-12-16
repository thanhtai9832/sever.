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
        return res.status(400).json({ error: 'Thiếu thông tin cần thiết!' });
    }

    const time_id = envelope_id; 
    const end_time = unpack_at * 1000; 

    countdownData[time_id] = {
        end_time,
        extra_now,
        expiry_time,
        diamond_count: diamond_count || 0, 
        people_count: people_count || 0, 
    };
    console.log(`Dữ liệu nhận được cho time_id ${time_id}:`, countdownData[time_id]);

    res.json({ message: 'Dữ liệu đã được lưu thành công!' });
});

app.use(express.static(path.join(__dirname, 'public')));

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
    const time_id = new URL(req.url, `http://${req.headers.host}`).searchParams.get('time_id'); 
    if (!time_id || !countdownData[time_id]) {
        ws.send(JSON.stringify({ error: 'Không tìm thấy dữ liệu cho time_id này!' }));
        return ws.close();
    }

    const data = countdownData[time_id];
    const intervalId = setInterval(() => {
        if (data) {
            const currentTime = Date.now(); 
            const remainingTime = Math.max(data.end_time - currentTime, 0);

            if (remainingTime === 0) {
                ws.send(JSON.stringify({ status: 'Hết giờ', time_id }));
                clearInterval(intervalId);
                return;
            }

            ws.send(
                JSON.stringify({
                    remaining_time: remainingTime,
                    time_id,
                    expiry_time: data.expiry_time,
                    end_time: data.end_time,
                    diamond_count: data.diamond_count, 
                    people_count: data.people_count, 
                })
            );
        }
    }, 100); 
});

const server = app.listen(port, () => {
    console.log(`Server đang chạy tại http://localhost:${port}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
