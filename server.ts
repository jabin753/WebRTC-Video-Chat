import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '*',
        methods: ['GET', 'POST']
    }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle joining a room
    socket.on('join', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Handle WebRTC signaling
    socket.on('offer', (data) => {
        console.log(`Received offer from ${socket.id} for room ${data.roomId}`);
        socket.to(data.roomId).emit('offer', data.offer);
    });

    socket.on('answer', (data) => {
        console.log(`Received answer from ${socket.id} for room ${data.roomId}`);
        socket.to(data.roomId).emit('answer', data.answer);
    });

    socket.on('ice-candidate', (data) => {
        console.log(`Received ICE candidate from ${socket.id} for room ${data.roomId}`);
        socket.to(data.roomId).emit('ice-candidate', data.candidate);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3001;

// Export the Express API for Vercel
export default app;

// Start the server if running locally
if (process.env.NODE_ENV !== 'production') {
    httpServer.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
} 