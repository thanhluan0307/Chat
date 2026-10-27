/** Tạo ứng dụng Express và HTTP server dùng chung với Socket.IO. */
import "dotenv/config";
import express from "express";
import { createServer } from "node:http";
import { setupSocket } from "./setupSocket.js";

const app = express();
const server = createServer(app);
const io = setupSocket(server);
export { app, server, io };
