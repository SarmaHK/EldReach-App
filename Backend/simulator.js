const axios = require("axios");

const API_URL = "http://localhost:5000/api/devices";

let x = 0;
let y = 0;

setInterval(async () => {
    try {
        // simulate walking
        x += (Math.random() - 0.5);
        y += (Math.random() - 0.5);

        const payload = {
            nodeId: "node_1",
            gatewayId: "192.168.1.10",
            roomId: "room_1",
            sensors: {
                radar: {
                    targets: [
                        {
                            x,
                            y,
                            velocity: Math.random(),
                            distance: Math.sqrt(x * x + y * y),
                        },
                    ],
                },
                presence: {
                    motionDetected: true,
                    breathingDetected: true,
                },
            },
        };

        await axios.post(API_URL, payload);

        console.log(`🚶 Moving: (${x.toFixed(2)}, ${y.toFixed(2)})`);
    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}, 1000);