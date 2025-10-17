import http from "http";
import { Server } from "socket.io";
import { config } from "./config.js";

const activeRooms = new Map();
let ioRef = null;

export function createSocketServer(app) {
  const server = http.createServer(app);
  ioRef = new Server(server, {
    cors: {
      origin: config.corsOrigin,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  ioRef.on("connection", (socket) => {
    socket.on("join_order", (orderId) => {
      socket.join(orderId);
      let clients = activeRooms.get(orderId) || new Set();
      clients.add(socket.id);
      activeRooms.set(orderId, clients);
    });

    socket.on("leave_order", (orderId) => {
      socket.leave(orderId);
      const clients = activeRooms.get(orderId);
      if (clients) {
        clients.delete(socket.id);
        if (clients.size === 0) activeRooms.delete(orderId);
        else activeRooms.set(orderId, clients);
      }
    });

    socket.on("disconnect", () => {
      activeRooms.forEach((clients, orderId) => {
        if (clients.has(socket.id)) {
          clients.delete(socket.id);
          if (clients.size === 0) activeRooms.delete(orderId);
        }
      });
    });
  });

  return { server, io: ioRef };
}

export function emitOrderPaid(orderCode) {
  if (ioRef) ioRef.to(orderCode).emit("order_paid", { orderCode });
}

