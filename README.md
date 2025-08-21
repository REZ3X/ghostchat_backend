# 👻 GhostChat Backend

A Node.js backend server for GhostChat - an anonymous, encrypted, and ephemeral messaging platform. Provides real-time communication, temporary file storage, and Redis-based message persistence with automatic cleanup.

![GhostChat Backend](https://img.shields.io/badge/Status-Active-success)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-4.18.2-blue)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.7.5-orange)
![Redis](https://img.shields.io/badge/Redis-4.6.12-red)

## ✨ Features

- 🔌 **Real-time Communication** - WebSocket connections via Socket.IO
- 💾 **Redis Integration** - Temporary message storage with TTL
- 📸 **File Upload Support** - Image handling with auto-cleanup
- ⏰ **Automatic Cleanup** - TTL-based message and file deletion
- 🛡️ **CORS Protection** - Configurable cross-origin policies
- 🏥 **Health Monitoring** - Built-in health check endpoints
- 🔒 **Secure File Handling** - Validated uploads with temporary storage
- 📊 **Room Management** - Multi-room support with participant tracking

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Redis Cloud account (or local Redis instance)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/REZ3X/ghostchat_backend.git
   cd ghostchat_backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   FRONTEND_URL=http://localhost:3000

   # Redis Cloud Configuration
   REDIS_HOST=your-redis-host.com
   REDIS_PORT=your-redis-port
   REDIS_USERNAME=default
   REDIS_PASSWORD=your-redis-password
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Start production server**
   ```bash
   npm start
   ```

## 📁 Project Structure

```
src/
└── app.js                 # Main application file
uploads/                   # Temporary image storage
├── .env                   # Environment configuration
├── .gitignore            # Git ignore rules
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3001` | No |
| `NODE_ENV` | Environment mode | `development` | No |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` | No |
| `REDIS_HOST` | Redis server hostname | - | Yes |
| `REDIS_PORT` | Redis server port | - | Yes |
| `REDIS_USERNAME` | Redis username | `default` | No |
| `REDIS_PASSWORD` | Redis password | - | Yes |

### Redis Configuration

#### Redis Cloud Setup

1. **Create Redis Cloud Account**
   - Visit [Redis Cloud](https://redis.com/redis-enterprise-cloud/)
   - Create a free account
   - Create a new database

2. **Get Connection Details**
   ```env
   REDIS_HOST=redis-12345.c123.us-east-1-2.ec2.cloud.redislabs.com
   REDIS_PORT=12345
   REDIS_USERNAME=default
   REDIS_PASSWORD=your-password-here
   ```

#### Local Redis Setup

```bash
# Install Redis locally
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server

# Configure for local development
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=
```

## 🌐 API Endpoints

### Health & Monitoring

#### `GET /api/health`
Check server health and Redis connectivity.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "activeRooms": 3,
  "totalParticipants": 8,
  "redis": "connected"
}
```

#### `GET /api/redis/test`
Test Redis connection with read/write operations.

**Response:**
```json
{
  "success": true,
  "message": "Redis test successful",
  "result": "Hello Redis Cloud!"
}
```

### Room Management

#### `GET /api/room/:token/stats`
Get statistics for a specific room.

**Parameters:**
- `token` - Room token (format: ABC-123-XYZ)

**Response:**
```json
{
  "roomToken": "ABC-123-XYZ",
  "participantCount": 3,
  "messageCount": 25,
  "createdAt": "2024-01-20T09:15:00.000Z"
}
```

#### `GET /api/room/:token/messages`
Retrieve message history for a room.

**Parameters:**
- `token` - Room token

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_1234567890_abc123",
      "type": "text",
      "message": "Hello World!",
      "sender": "Ghost-456",
      "timestamp": "2024-01-20T10:00:00.000Z",
      "ttl": 3600
    },
    {
      "id": "msg_1234567891_def456",
      "type": "image",
      "imageData": {
        "id": "img_1234567891_ghi789",
        "name": "screenshot.png",
        "filename": "msg_1234567891_def456_1234567891_abc123.png",
        "imageUrl": "/api/image/msg_1234567891_def456_1234567891_abc123.png",
        "size": 245760,
        "mimeType": "image/png",
        "dimensions": { "width": 800, "height": 600 }
      },
      "caption": "Check this out!",
      "sender": "Shadow-789",
      "timestamp": "2024-01-20T10:01:00.000Z",
      "ttl": 3600
    }
  ],
  "count": 2,
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Image Handling

#### `POST /api/upload-image`
Upload image file (multipart/form-data).

**Parameters:**
- `image` - Image file (max 10MB)
- `messageId` - Optional message ID
- `ttl` - Time to live in seconds

**Response:**
```json
{
  "success": true,
  "imageId": "img_1234567890_abc123",
  "filename": "msg_1234567890_abc123_1234567890_def456.png",
  "imageUrl": "/api/image/msg_1234567890_abc123_1234567890_def456.png",
  "size": 245760,
  "mimeType": "image/png"
}
```

#### `GET /api/image/:filename`
Serve uploaded images.

**Parameters:**
- `filename` - Image filename

**Headers:**
- `Content-Type` - Appropriate MIME type
- `Cache-Control` - `public, max-age=3600`

#### `DELETE /api/image/:imageId`
Delete image by ID.

**Parameters:**
- `imageId` - Image identifier

**Response:**
```json
{
  "success": true,
  "imageId": "img_1234567890_abc123"
}
```

## 🔌 WebSocket Events

### Client → Server Events

#### `join-room`
Join a chat room.

**Payload:**
```javascript
{
  roomToken: "ABC-123-XYZ",
  agentId: "Ghost-456"
}
```

#### `send-message`
Send a text message.

**Payload:**
```javascript
{
  roomToken: "ABC-123-XYZ",
  message: "Hello World!",
  sender: "Ghost-456",
  ttl: 3600
}
```

#### `send-image`
Send an image with optional caption.

**Payload:**
```javascript
{
  roomToken: "ABC-123-XYZ",
  imageData: {
    id: "img_1234567890_abc123",
    name: "screenshot.png",
    data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    size: 245760,
    mimeType: "image/png",
    dimensions: { width: 800, height: 600 }
  },
  caption: "Check this out!",
  sender: "Ghost-456",
  ttl: 3600
}
```

### Server → Client Events

#### `room-joined`
Confirmation of successful room join.

**Payload:**
```javascript
{
  roomToken: "ABC-123-XYZ",
  participants: ["Ghost-456", "Shadow-789"]
}
```

#### `participant-joined`
New participant joined the room.

**Payload:**
```javascript
{
  agentId: "Phantom-123"
}
```

#### `participant-left`
Participant left the room.

**Payload:**
```javascript
{
  agentId: "Phantom-123"
}
```

#### `new-message`
New message received.

**Payload:**
```javascript
{
  id: "msg_1234567890_abc123",
  type: "text",
  message: "Hello World!",
  sender: "Ghost-456",
  timestamp: "2024-01-20T10:00:00.000Z",
  ttl: 3600,
  roomToken: "ABC-123-XYZ"
}
```

#### `message-expired`
Message has expired and should be removed.

**Payload:**
```javascript
{
  messageId: "msg_1234567890_abc123"
}
```

#### `error`
Error occurred during operation.

**Payload:**
```javascript
{
  message: "Invalid room token or agent ID"
}
```

## 📸 Image Processing

### Supported Formats

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **GIF** (.gif)
- **WebP** (.webp)

### File Constraints

- **Maximum Size**: 10MB
- **Validation**: MIME type and extension checking
- **Storage**: Temporary filesystem storage
- **Cleanup**: Automatic deletion based on TTL

### File Naming Convention

```
msg_{messageId}_{timestamp}_{random}.{extension}
```

**Example:**
```
msg_1234567890_abc123_1234567890_def456789.png
```

### Automatic Cleanup

#### TTL-based Deletion
- **Standard Messages**: Deleted after TTL expires
- **Burn-after-reading**: Deleted after 30 seconds
- **Orphaned Files**: Cleaned up every hour (files older than 25 hours)

#### Cleanup Schedule
```javascript
// Immediate cleanup for burn-after-reading
if (ttl === 0) {
  setTimeout(() => deleteFile(filePath), 30000);
}

// TTL-based cleanup
if (ttl > 0) {
  setTimeout(() => deleteFile(filePath), ttl * 1000);
}

// Hourly orphaned file cleanup
setInterval(() => cleanupOldFiles(), 3600000);
```

## 💾 Redis Data Structure

### Message Storage

**Key Pattern:** `message:{roomToken}:{messageId}`

**Text Message:**
```json
{
  "id": "msg_1234567890_abc123",
  "type": "text",
  "message": "Hello World!",
  "sender": "Ghost-456",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "ttl": 3600,
  "roomToken": "ABC-123-XYZ"
}
```

**Image Message (Metadata Only):**
```json
{
  "id": "msg_1234567890_abc123",
  "type": "image",
  "imageData": {
    "id": "img_1234567890_abc123",
    "name": "screenshot.png",
    "filename": "msg_1234567890_abc123_1234567890_def456.png",
    "imageUrl": "/api/image/msg_1234567890_abc123_1234567890_def456.png",
    "size": 245760,
    "mimeType": "image/png",
    "dimensions": { "width": 800, "height": 600 }
  },
  "caption": "Check this out!",
  "sender": "Ghost-456",
  "timestamp": "2024-01-20T10:00:00.000Z",
  "ttl": 3600,
  "roomToken": "ABC-123-XYZ"
}
```

### TTL Management

- **Redis TTL**: Automatic key expiration
- **Manual Cleanup**: Periodic cleanup of expired keys
- **Burn-after-reading**: TTL = 0, special handling

## 🛠️ Development

### Available Scripts

```bash
# Development with auto-restart
npm run dev

# Production server
npm start

# Run tests (placeholder)
npm test
```

### Development Features

- **Nodemon**: Auto-restart on file changes
- **CORS**: Configurable cross-origin support
- **Error Handling**: Comprehensive error responses
- **Logging**: Detailed console logging
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT

### Code Structure

```javascript
// Main components
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const redis = require('redis');
const multer = require('multer');

// Core functionality
- Room management (activeRooms, roomParticipants)
- WebSocket event handling
- File upload processing
- Redis integration
- Automatic cleanup systems
```

## 🔒 Security Features

### Input Validation

- **Room Token Format**: Validates ABC-123-XYZ pattern
- **File Type Validation**: MIME type and extension checking
- **File Size Limits**: 10MB maximum upload
- **Agent ID Validation**: Required for all operations

### CORS Configuration

```javascript
cors: {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ["GET", "POST"],
  credentials: true
}
```

### File Security

- **Secure Filename Generation**: Crypto-random naming
- **Path Traversal Protection**: Controlled upload directory
- **Temporary Storage**: No permanent file retention
- **Access Control**: Filename-based access only

## 🚀 Deployment

### Environment Setup

#### Development
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
REDIS_HOST=your_redis_host
REDIS_USERNAME=your_redis_username
REDIS_PORT=1
REDIS_PASSWORD=your_redis_password
NODE_ENV=development
```

#### Production
```env
PORT=3001
FRONTEND_URL=https://your-frontend-domain.com
REDIS_HOST=your_redis_host
REDIS_USERNAME=your_redis_username
REDIS_PORT=1
REDIS_PASSWORD=your_redis_password
NODE_ENV=production
```

### Platform-Specific Deployment

#### Railway
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

#### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set REDIS_HOST=your-redis-host
heroku config:set REDIS_PASSWORD=your-redis-password

# Deploy
git push heroku main
```

#### DigitalOcean App Platform
1. Connect repository
2. Configure environment variables
3. Set build command: `npm install`
4. Set run command: `npm start`

#### AWS EC2
```bash
# Install Node.js and PM2
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# Clone and setup
git clone https://github.com/REZ3X/ghostchat_backend.git
cd ghostchat_backend
npm install

# Start with PM2
pm2 start src/app.js --name ghostchat-backend
pm2 startup
pm2 save
```

### Docker Deployment

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY .env ./

EXPOSE 3001

CMD ["npm", "start"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=${REDIS_HOST}
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    restart: unless-stopped
```

## 📊 Monitoring & Analytics

### Health Metrics

- **Active Rooms**: Number of rooms with participants
- **Total Participants**: Sum of all participants across rooms
- **Redis Status**: Connection health
- **Message Count**: Per-room message statistics

### Logging

```javascript
// Connection events
console.log(`Client connected: ${socket.id}`);
console.log(`${agentId} joined room ${roomToken}`);

// Message events
console.log(`📝 Text message sent in room ${roomToken}`);
console.log(`📸 Image sent in room ${roomToken}`);

// Error events
console.error('❌ Redis connection failed:', error);
console.error('❌ Error sending message:', error);

// Cleanup events
console.log(`🧹 Cleaned up ${count} expired files`);
console.log(`🔥 Burn-after-reading: Deleted ${filename}`);
```

### Performance Monitoring

```javascript
// Memory usage
process.memoryUsage();

// Active connections
io.engine.clientsCount;

// Redis performance
await redis.ping(); // Response time
```

## 🔧 Troubleshooting

### Common Issues

#### Redis Connection Failed
```bash
# Check Redis credentials
redis-cli -h your-host -p your-port -a your-password ping

# Verify environment variables
echo $REDIS_HOST
echo $REDIS_PASSWORD
```

#### CORS Errors
```javascript
// Update CORS configuration
const corsOptions = {
  origin: [
    "http://localhost:3000",
    "https://your-frontend-domain.com"
  ],
  credentials: true
};
```

#### File Upload Issues
```bash
# Check upload directory permissions
ls -la uploads/

# Verify disk space
df -h

# Check file size limits
# Increase if needed in multer config
```

#### Memory Issues
```bash
# Monitor memory usage
node --max-old-space-size=4096 src/app.js

# Enable garbage collection logs
node --expose-gc --trace-gc src/app.js
```

### Debugging

#### Enable Debug Logging
```env
NODE_ENV=development
DEBUG=socket.io*
```

#### Redis Debugging
```javascript
// Add Redis event logging
redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('reconnecting', () => console.log('Redis reconnecting'));
```

#### Socket.IO Debugging
```javascript
// Enable Socket.IO debugging
const io = socketIo(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000
});
```

## 📈 Performance Optimization

### Redis Optimization

```javascript
// Connection pooling
const redis = createClient({
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 1000),
    connectTimeout: 10000
  }
});

// Key expiration monitoring
redis.configSet('notify-keyspace-events', 'Ex');
```

### Memory Management

```javascript
// Cleanup intervals
setInterval(cleanupExpiredMessages, 3600000); // 1 hour
setInterval(cleanupOrphanedFiles, 3600000);   // 1 hour

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

### File System Optimization

```javascript
// Streaming for large files
app.get('/api/image/:filename', (req, res) => {
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

// Compression
app.use(compression());
```

## 🤝 Contributing

### Getting Started

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes with proper logging
4. Test with Redis and file uploads
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

### Code Guidelines

- **Error Handling**: Always catch and log errors
- **Async/Await**: Use modern async patterns
- **Validation**: Validate all inputs
- **Logging**: Add meaningful console logs
- **Cleanup**: Implement proper resource cleanup

### Testing Checklist

- [ ] Redis connection and operations
- [ ] WebSocket message flow
- [ ] File upload and retrieval
- [ ] TTL-based cleanup
- [ ] Error handling
- [ ] CORS functionality
- [ ] Health endpoints

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Related Projects

- **[GhostChat Frontend](https://github.com/REZ3X/ghostchat_frontend)**: Next.js frontend application
- **[GhostChat Mobile](https://github.com/REZ3X/ghostchat_mobile)**: React Native mobile app

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/REZ3X/ghostchat_backend/issues)
- **Discussions**: [GitHub Discussions](https://github.com/REZ3X/ghostchat_backend/discussions)
- **Email**: abim@rejaka.id

## 🙏 Acknowledgments

- **Express.js**: Fast, unopinionated web framework
- **Socket.IO**: Real-time bidirectional event-based communication
- **Redis**: In-memory data structure store
- **Multer**: Node.js middleware for handling multipart/form-data
- **Node.js Community**: For excellent documentation and support

---

**Built with ❤️ for privacy and security**

*GhostChat Backend - Powering anonymous conversations that disappear.*