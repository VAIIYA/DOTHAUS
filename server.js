const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const MOVEMENT_SPEED = 5;
const MAP_WIDTH = 3000;
const MAP_HEIGHT = 3000;

// Room Management
class GameRoom {
    constructor(id, price, maxPlayers = 10) {
        this.id = id;
        this.price = price;
        this.maxPlayers = maxPlayers;
        this.players = {};
        this.food = {};
        this.status = "OPEN"; // OPEN, FULL, PLAYING, ENDED
        this.initFood();
    }

    initFood() {
        for (let i = 0; i < 100; i++) {
            this.addFood();
        }
    }

    addFood() {
        const id = `food-${Date.now()}-${Math.random()}`;
        this.food[id] = {
            id,
            x: Math.random() * MAP_WIDTH,
            y: Math.random() * MAP_HEIGHT,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            radius: 5,
        };
    }

    addPlayer(socket, playerData) {
        if (Object.keys(this.players).length >= this.maxPlayers) {
            return false;
        }

        this.players[socket.id] = {
            id: socket.id,
            name: playerData.name || "Guest",
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            x: Math.random() * MAP_WIDTH,
            y: Math.random() * MAP_HEIGHT,
            radius: 20,
            mass: 10,
            target: { x: 0, y: 0 },
            socket: socket, // Keep reference to socket if needed, but risky for serialization
        };

        if (Object.keys(this.players).length >= this.maxPlayers) {
            this.status = "FULL";
            // Maybe start countdown?
        }

        return this.players[socket.id];
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        if (Object.keys(this.players).length < this.maxPlayers && this.status === "FULL") {
            this.status = "OPEN";
        }
    }

    handleInput(socketId, inputData) {
        const player = this.players[socketId];
        if (player) {
            player.target = inputData;
        }
    }

    update() {
        // Basic physics loop (same as before)
        Object.values(this.players).forEach((player) => {
            if (player.target) {
                const dx = player.target.x - player.x;
                const dy = player.target.y - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 1) {
                    const speed = 200 / player.radius;
                    player.x += (dx / distance) * speed;
                    player.y += (dy / distance) * speed;
                    player.x = Math.max(0, Math.min(MAP_WIDTH, player.x));
                    player.y = Math.max(0, Math.min(MAP_HEIGHT, player.y));
                }
            }

            // Eat Food
            Object.values(this.food).forEach((food) => {
                const dx = player.x - food.x;
                const dy = player.y - food.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < player.radius) {
                    delete this.food[food.id];
                    player.mass += 1;
                    player.radius = Math.sqrt(player.mass * 10);
                    this.addFood(); // Immediate respawn
                }
            });

            // Player Collision
            Object.values(this.players).forEach((other) => {
                if (player.id !== other.id) {
                    const dx = player.x - other.x;
                    const dy = player.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < player.radius && player.mass > other.mass * 1.2) {
                        // Reset other player
                        other.x = Math.random() * MAP_WIDTH;
                        other.y = Math.random() * MAP_HEIGHT;
                        other.mass = 10;
                        other.radius = 20;
                        player.mass += other.mass;
                        player.radius = Math.sqrt(player.mass * 10);
                    }
                }
            });
        });
    }

    getState() {
        // Return sanitized state (without socket objects)
        const playersClean = {};
        Object.values(this.players).forEach(p => {
            playersClean[p.id] = { ...p, socket: undefined, target: undefined };
        });

        return {
            players: playersClean,
            food: this.food,
            mapWidth: MAP_WIDTH,
            mapHeight: MAP_HEIGHT,
            status: this.status
        };
    }
}

const rooms = {};

// Initialize static rooms
["1", "2", "3", "4", "5", "6", "7", "8"].forEach(id => {
    // Mock prices based on ID
    const prices = { "1": 0.1, "2": 0.5, "3": 1, "4": 2, "5": 5, "6": 10, "7": 25, "8": 50 };
    rooms[id] = new GameRoom(id, prices[id]);
});


app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            const { pathname, query } = parsedUrl;
            if (pathname === "/a") {
                await app.render(req, res, "/a", query);
            } else if (pathname === "/b") {
                await app.render(req, res, "/b", query);
            } else {
                await handle(req, res, parsedUrl);
            }
        } catch (err) {
            console.error("Error occurred handling", req.url, err);
            res.statusCode = 500;
            res.end("internal server error");
        }
    });

    const io = new Server(httpServer);

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);
        let currentRoomId = null;

        socket.on("join-room", ({ roomId, playerData }) => {
            const room = rooms[roomId];
            if (!room) {
                socket.emit("error", "Room not found");
                return;
            }

            if (currentRoomId) {
                // Leave previous room
                const prevRoom = rooms[currentRoomId];
                if (prevRoom) prevRoom.removePlayer(socket.id);
                socket.leave(currentRoomId);
            }

            const player = room.addPlayer(socket, playerData || {});
            if (player) {
                currentRoomId = roomId;
                socket.join(roomId);
                console.log(`Player ${socket.id} joined room ${roomId}`);

                // Send initial state
                socket.emit("game-state", room.getState());
                socket.to(roomId).emit("player-joined", { ...player, socket: undefined });
            } else {
                socket.emit("error", "Room is full");
            }
        });

        socket.on("input", (inputData) => {
            if (currentRoomId && rooms[currentRoomId]) {
                rooms[currentRoomId].handleInput(socket.id, inputData);
            }
        });

        socket.on("disconnect", () => {
            if (currentRoomId && rooms[currentRoomId]) {
                rooms[currentRoomId].removePlayer(socket.id);
                io.to(currentRoomId).emit("player-left", socket.id);
            }
        });
    });

    // Global Tick Loop
    setInterval(() => {
        Object.values(rooms).forEach(room => {
            room.update();
            io.to(room.id).emit("game-state", room.getState());
        });
    }, 1000 / 30);

    httpServer
        .once("error", (err) => {
            console.error(err);
            process.exit(1);
        })
        .listen(port, () => {
            console.log(`> Ready on http://${hostname}:${port}`);
        });
});
