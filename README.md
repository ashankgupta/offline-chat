# Offline Chat

A WhatsApp-style offline peer-to-peer chat application with a professional responsive UI that works over local network using Socket.IO.

## Features

- Real-time private messaging
- File sharing with 10MB size limit
- Typing indicators
- QR code for easy access on mobile devices
- Professional responsive UI
- Emoji picker
- User name customization
- Toast notifications for errors

## Prerequisites

- Node.js (version 14 or higher)
- npm (comes with Node.js)

## Installation

1. Clone the repository or download the source code:
   ```
   git clone https://github.com/ashankgupta/offline-chat.git
   cd offline-chat
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

### Step-by-Step Guide

1. Start the server:
   ```
   npm start
   ```

2. The server will start on port 5000. You'll see output like:
   ```
   Server running on port 5000
   Open this URL on any device in the same Wi-Fi: http://192.168.1.100:5000
   ```
   Followed by a QR code in the terminal.

3. Open the displayed URL in a web browser on any device connected to the same local network (Wi-Fi).

4. Alternatively, scan the QR code with your phone's camera or a QR scanner app to open the chat app directly.

5. Set your name by clicking the edit button in the header.

6. Select a user from the chat list to start messaging.

7. Type messages, use emojis, or attach files to send.

### Development Mode

For development with auto-restart:
```
npm run dev
```

### File Sharing

- Click the paperclip icon to attach files (max 10MB).
- Files are uploaded to the `uploads` folder on the server.
- Shared files can be downloaded by other users in the chat.

## Building

To create a standalone executable:
```
npx pkg server.js --out-path dist
```

## Docker

Build the Docker image:
```
docker build -t offline-chat .
```

Run the container:
```
docker run -p 5000:5000 offline-chat
```

**Note:** When running in Docker, the server logs and QR code will display the container's internal IP, which is not accessible from other devices on your network. To access the chat app from other devices, use your host machine's IP address instead. For example, if your host IP is `192.168.1.100`, open `http://192.168.1.100:5000` in your browser. The QR code generated inside the container points to the Docker network and won't work for external access—use the host IP manually.

## Technologies

- Node.js
- Express
- Socket.IO
- HTML5/CSS3/JavaScript

## License

MIT
