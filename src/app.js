const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { createClient } = require('redis');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const redis = createClient({
  username: process.env.REDIS_USERNAME || 'default',
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    connectTimeout: 10000
  }
});

redis.on('error', (err) => {
  console.error('Redis Client Error:', err.message);
});

redis.on('connect', () => {
  console.log('Connected to Redis Cloud');
});

redis.on('reconnecting', () => {
  console.log('Reconnecting to Redis...');
});

redis.on('ready', () => {
  console.log('Redis client ready');
});

async function connectRedis() {
  try {
    console.log(`Attempting to connect to Redis at ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    console.log(`Using username: ${process.env.REDIS_USERNAME}`);
    
    await redis.connect();
    console.log('✅ Redis connection established');
    
    const testResult = await redis.ping();
    console.log('✅ Redis ping successful:', testResult);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error.message);

    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ Running in development mode without Redis');
      return false;
    }
    
    process.exit(1);
  }
}

const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());

const activeRooms = new Map();
const roomParticipants = new Map();
let redisConnected = false;

function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function isValidRoomToken(token) {
  return /^[A-Z0-9]{1,3}-[A-Z0-9]{1,3}-[A-Z0-9]{1,3}$/.test(token) || 
         /^[A-Z0-9]{6,9}$/.test(token.replace(/-/g, ''));
}

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('join-room', async (data) => {
    const { roomToken, agentId } = data;
    
    if (!isValidRoomToken(roomToken) || !agentId) {
      socket.emit('error', { message: 'Invalid room token or agent ID' });
      return;
    }

    try {
      socket.join(roomToken);

      socket.roomToken = roomToken;
      socket.agentId = agentId;

      if (!roomParticipants.has(roomToken)) {
        roomParticipants.set(roomToken, new Set());
      }
      roomParticipants.get(roomToken).add(agentId);

      if (!activeRooms.has(roomToken)) {
        activeRooms.set(roomToken, {
          createdAt: new Date(),
          messageCount: 0
        });
      }

      const participants = Array.from(roomParticipants.get(roomToken));

      socket.emit('room-joined', { 
        roomToken,
        participants 
      });

      socket.to(roomToken).emit('participant-joined', { 
        agentId 
      });
      
      console.log(`${agentId} joined room ${roomToken}`);
      
    } catch (error) {
      console.error('Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });

    socket.on('send-message', async (data) => {
    const { roomToken, message, sender, ttl = 86400 } = data;
    
    console.log('📥 Received message data:', { roomToken, sender, messageLength: message?.length, ttl });
    
    if (!roomToken || !message || !sender) {
      console.error('❌ Missing required message data:', { roomToken: !!roomToken, message: !!message, sender: !!sender });
      socket.emit('error', { message: 'Missing required message data' });
      return;
    }

    try {
      const messageId = generateMessageId();
      const timestamp = new Date().toISOString();
      
      const messageData = {
        id: messageId,
        message: message,
        sender,
        timestamp,
        ttl: parseInt(ttl),
        roomToken
      };
      
      console.log('📤 Broadcasting message to room:', roomToken, 'Message ID:', messageId);

      if (messageData.ttl > 0 && redis.isReady) {
        try {
          const redisKey = `message:${roomToken}:${messageId}`;
          await redis.setEx(redisKey, messageData.ttl, JSON.stringify(messageData));
          console.log(`💾 Message stored in Redis with TTL ${messageData.ttl}s`);
        } catch (redisError) {
          console.warn('⚠️ Redis storage failed, continuing without persistence:', redisError.message);
        }
      }

      const roomSockets = await io.in(roomToken).fetchSockets();
      console.log(`📢 Broadcasting to ${roomSockets.length} sockets in room ${roomToken}`);
      
      io.to(roomToken).emit('new-message', messageData);

      if (activeRooms.has(roomToken)) {
        activeRooms.get(roomToken).messageCount++;
      }
      
      if (messageData.ttl === 0) {
        setTimeout(() => {
          console.log('🔥 Auto-deleting burn-after-reading message:', messageId);
          io.to(roomToken).emit('message-expired', { messageId });
        }, 2000); 
      }
      
      console.log(`✅ Message sent in room ${roomToken} by ${sender} (TTL: ${messageData.ttl}s)`);
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    
    if (socket.roomToken && socket.agentId) {
      if (roomParticipants.has(socket.roomToken)) {
        roomParticipants.get(socket.roomToken).delete(socket.agentId);

        if (roomParticipants.get(socket.roomToken).size === 0) {
          roomParticipants.delete(socket.roomToken);
          activeRooms.delete(socket.roomToken);
        } else {
          socket.to(socket.roomToken).emit('participant-left', { 
            agentId: socket.agentId 
          });
        }
      }
    }
  });
});

app.get('/api/health', async (req, res) => {
  let redisStatus = 'disconnected';
  let redisError = null;
  
  if (redisConnected) {
    try {
      await redis.ping();
      redisStatus = 'connected';
    } catch (error) {
      redisStatus = 'error';
      redisError = error.message;
    }
  }
  
  const healthData = {
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeRooms: activeRooms.size,
    totalParticipants: Array.from(roomParticipants.values())
      .reduce((sum, participants) => sum + participants.size, 0),
    redis: redisStatus
  };
  
  if (redisError) {
    healthData.redisError = redisError;
  }
  
  res.json(healthData);
});

app.get('/api/room/:token/stats', (req, res) => {
  const { token } = req.params;
  
  if (!isValidRoomToken(token)) {
    return res.status(400).json({ error: 'Invalid room token' });
  }
  
  const room = activeRooms.get(token);
  const participants = roomParticipants.get(token);
  
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({
    roomToken: token,
    participantCount: participants ? participants.size : 0,
    messageCount: room.messageCount,
    createdAt: room.createdAt
  });
});

app.get('/api/room/:token/messages', async (req, res) => {
  const { token } = req.params;
  
  console.log(`📜 History request for room: ${token}`);
  
  if (!isValidRoomToken(token)) {
    console.log(`📜 Invalid room token: ${token}`);
    return res.status(400).json({ error: 'Invalid room token' });
  }

  if (!redisConnected || !redis.isReady) {
    console.log('📜 Redis not available, returning empty messages');
    return res.json({ 
      messages: [],
      note: 'Redis not available - no message history'
    });
  }

  try {
    console.log(`📜 Searching for messages with pattern: message:${token}:*`);
    const messageKeys = await redis.keys(`message:${token}:*`);
    console.log(`📜 Found ${messageKeys.length} message keys`);
    
    const messages = [];
    
    for (const key of messageKeys) {
      try {
        const messageData = await redis.get(key);
        if (messageData) {
          const parsedMessage = JSON.parse(messageData);

          const messageTime = new Date(parsedMessage.timestamp).getTime();
          const now = Date.now();
          const ttlMs = parsedMessage.ttl * 1000;

          if (parsedMessage.ttl === 0 || (messageTime + ttlMs) > now) {
            messages.push(parsedMessage);
            console.log(`📜 Added message ${parsedMessage.id} to history`);
          } else {
            console.log(`📜 Message ${parsedMessage.id} expired, skipping`);
            await redis.del(key);
          }
        }
      } catch (parseError) {
        console.warn(`📜 Failed to parse message ${key}:`, parseError.message);
      }
    }
    
    messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    console.log(`📜 Returning ${messages.length} messages for room ${token}`);
    res.json({ 
      messages,
      count: messages.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('📜 Error retrieving messages:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve messages',
      details: error.message
    });
  }
});

app.get('/api/redis/test', async (req, res) => {
  if (!redisConnected) {
    return res.status(503).json({
      success: false,
      message: 'Redis not connected'
    });
  }
  
  try {
    const testKey = 'test:' + Date.now();
    await redis.set(testKey, 'Hello Redis Cloud!');
    const result = await redis.get(testKey);
    await redis.del(testKey);
    
    res.json({
      success: true,
      message: 'Redis test successful',
      result: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Redis test failed',
      error: error.message
    });
  }
});

setInterval(async () => {
  if (!redisConnected) return;
  
  try {
    const keys = await redis.keys('message:*');
    let expiredCount = 0;
    
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`Cleaned up ${expiredCount} expired messages`);
    }
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}, 3600000); 

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;

async function startServer() {
  redisConnected = await connectRedis();
  
  server.listen(PORT, () => {
    console.log(`🕵️ GhostChat Backend running on port ${PORT}`);
    console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log(`Redis Host: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);
    console.log(`Redis Status: ${redisConnected ? '✅ Connected' : '❌ Disconnected'}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  try {
    if (redisConnected) {
      await redis.quit();
    }
    server.close(() => {
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  try {
    if (redisConnected) {
      await redis.quit();
    }
    server.close(() => {
      process.exit(0);
    });
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});