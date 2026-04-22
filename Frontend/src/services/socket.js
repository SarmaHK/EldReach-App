import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log(`[Socket.IO] Connected to backend: ${SOCKET_URL}`);
});

socket.on("disconnect", () => {
  console.log(`[Socket.IO] Disconnected from backend.`);
});

socket.on("connect_error", (error) => {
  console.error(`[Socket.IO] Connection error:`, error);
});

export default socket;
