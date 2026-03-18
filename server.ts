import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import next from "next";
import { parse } from "url";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Game State
type Player = {
  id: string;
  sessionId: string;
  name: string;
  isReady: boolean;
  savedBy: string | null;
  reason: string | null;
};

type GameState = {
  status: "waiting" | "playing" | "finished";
  players: Player[];
};

let gameState: GameState = {
  status: "waiting",
  players: [],
};

app.prepare().then(() => {
  const server = express();
  const httpServer = createServer(server);
  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Send initial state
    socket.emit("gameState", gameState);

    socket.on("join", ({ name, sessionId }: { name: string, sessionId: string }) => {
      const existingPlayer = gameState.players.find((p) => p.name === name);
      
      if (existingPlayer) {
        if (existingPlayer.sessionId === sessionId || name.toLowerCase() === "admin") {
          // Update socket id if rejoining (admin can always rejoin for simplicity)
          existingPlayer.id = socket.id;
          socket.emit("joinSuccess", name);
          io.emit("gameState", gameState);
        } else {
          // Name is taken by someone else
          socket.emit("joinError", "This name is already taken by another player.");
        }
      } else {
        gameState.players.push({
          id: socket.id,
          sessionId,
          name,
          isReady: true,
          savedBy: null,
          reason: null,
        });
        socket.emit("joinSuccess", name);
        io.emit("gameState", gameState);
      }
    });

    socket.on("startGame", () => {
      gameState.status = "playing";
      io.emit("gameState", gameState);
    });

    socket.on("resetGame", () => {
      gameState = {
        status: "waiting",
        players: [],
      };
      io.emit("gameState", gameState);
    });

    socket.on("submitChoice", ({ savedBy, reason }: { savedBy: string; reason: string }) => {
      const player = gameState.players.find((p) => p.id === socket.id);
      if (player) {
        player.savedBy = savedBy;
        player.reason = reason;
        
        // Check if all players have submitted (excluding admin if admin is in players list)
        const activePlayers = gameState.players.filter(p => p.name.toLowerCase() !== "admin");
        const allSubmitted = activePlayers.every((p) => p.savedBy !== null);
        
        if (allSubmitted && activePlayers.length > 0) {
          gameState.status = "finished";
        }
        
        io.emit("gameState", gameState);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
      // We don't remove players on disconnect so they can rejoin
    });
  });

  server.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
