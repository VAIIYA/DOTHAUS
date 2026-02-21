/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv").config({ path: ".env.local" });

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");
const { createClient } = require("@libsql/client");
const gameConfig = require("./src/config/game-config.json");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const MAP_WIDTH = gameConfig.map.width;
const MAP_HEIGHT = gameConfig.map.height;
const HOUSE_FEE_RATE = gameConfig.houseFeeRate;
const ROOM_REGION = process.env.VERCEL_REGION || process.env.REGION || "auto";

const dbClient = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN
    ? createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    })
    : null;

async function applyStatsUpdate(walletAddress, wins, losses, totalEarnings) {
    if (!dbClient || !walletAddress) return;

    const defaultUsername = `User_${walletAddress.slice(0, 6)}`;
    await dbClient.execute({
        sql: "INSERT OR IGNORE INTO users (id, username, wins, losses, total_earnings, created_at, updated_at) VALUES (?, ?, 0, 0, 0, ?, ?)",
        args: [walletAddress, defaultUsername, Date.now(), Date.now()],
    });

    await dbClient.execute({
        sql: "UPDATE users SET wins = COALESCE(wins, 0) + ?, losses = COALESCE(losses, 0) + ?, total_earnings = COALESCE(total_earnings, 0) + ?, updated_at = ? WHERE id = ?",
        args: [wins || 0, losses || 0, totalEarnings || 0, Date.now(), walletAddress],
    });
}

// Room Management
class GameRoom {
    constructor(id, price, maxPlayers = 10) {
        this.id = id;
        this.price = price;
        this.maxPlayers = maxPlayers;
        this.players = {}; // Key: socket.id
        this.food = {};
        this.viruses = {};
        this.ejectedMass = {};
        this.status = "WAITING"; // WAITING, STARTING, ACTIVE, ENDED
        this.countdown = 0;
        this.winnerName = null;
        this.initEntities();
    }

    initEntities() {
        this.food = {};
        this.viruses = {};
        this.ejectedMass = {};
        for (let i = 0; i < 100; i++) this.addFood();
        for (let i = 0; i < 10; i++) this.addVirus();
    }

    addVirus() {
        const id = `virus-${Date.now()}-${Math.random()}`;
        this.viruses[id] = {
            id,
            x: Math.random() * MAP_WIDTH,
            y: Math.random() * MAP_HEIGHT,
            radius: 60,
            mass: 100,
        };
    }

    addFood() {
        const id = `food-${Date.now()}-${Math.random()}`;
        this.food[id] = {
            id,
            x: Math.random() * MAP_WIDTH,
            y: Math.random() * MAP_HEIGHT,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            radius: 8, // Standard food radius
            mass: 1,
        };
    }

    addPlayer(socket, playerData) {
        // Lobby (id "0") always allows joining if not full
        if (this.id !== "0" && this.status !== "WAITING" && this.status !== "STARTING") {
            // Only allow hot-join if room is ACTIVE but not full? 
            // The user said "people can join later on", so let's allow it for all rooms if not full.
            if (Object.keys(this.players).length >= this.maxPlayers) {
                return { error: "ROOM_FULL" };
            }
            // Allow joining active matches
        }

        if (Object.keys(this.players).length >= this.maxPlayers) {
            return { error: "ROOM_FULL" };
        }

        // Initialize player with single fragment
        this.players[socket.id] = {
            id: socket.id,
            name: playerData.name || "Player",
            walletAddress: playerData.walletAddress || null,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`,
            fragments: [{
                ...this.createSpawnFragment(0),
            }],
            target: { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 },
            socket: socket,
        };

        this.updatePlayerStats(socket.id);

        // If it's a lobby, set status to ACTIVE immediately
        if (this.id === "0") {
            this.status = "ACTIVE";
        } else if (Object.keys(this.players).length >= this.maxPlayers && this.status === "WAITING") {
            this.startCountdown();
        } else if (Object.keys(this.players).length >= 2 && this.status === "WAITING") {
            this.startCountdown();
        }

        return this.players[socket.id];
    }

    getUnitVector(fromX, fromY, toX, toY) {
        const dx = toX - fromX;
        const dy = toY - fromY;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.0001) {
            return { x: 1, y: 0 };
        }
        return { x: dx / dist, y: dy / dist };
    }

    createSpawnFragment(id = 0) {
        return {
            id,
            x: Math.random() * (MAP_WIDTH - 100) + 50,
            y: Math.random() * (MAP_HEIGHT - 100) + 50,
            mass: 10,
            radius: 20,
            vx: 0,
            vy: 0,
            splitTime: Date.now(),
        };
    }

    startCountdown() {
        if (this.status === "STARTING") return;
        this.status = "STARTING";
        this.countdown = 10;
        const timer = setInterval(() => {
            if (this.countdown <= 0) {
                clearInterval(timer);
                this.startMatch();
            }
            const playerCount = Object.keys(this.players).length;
            if (playerCount < 2) {
                clearInterval(timer);
                this.status = "WAITING";
                this.countdown = 0;
            }
            this.countdown--;
        }, 1000);
    }

    startMatch() {
        if (Object.keys(this.players).length < 2) {
            this.status = "WAITING";
            return;
        }
        this.status = "ACTIVE";
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        if (this.id !== "0" && this.status === "STARTING" && Object.keys(this.players).length < 2) {
            this.status = "WAITING";
            this.countdown = 0;
        }
    }
    handleInput(socketId, inputData) {
        const player = this.players[socketId];
        if (player && inputData) {
            const targetX = Number(inputData.x);
            const targetY = Number(inputData.y);
            if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) return;

            player.target = {
                x: Math.max(0, Math.min(MAP_WIDTH, targetX)),
                y: Math.max(0, Math.min(MAP_HEIGHT, targetY)),
            };
        }
    }

    handleSplit(socketId) {
        if (this.status !== "ACTIVE") return;
        const player = this.players[socketId];
        if (!player || player.fragments.length >= 16) return;

        const newFragments = [];
        player.fragments.forEach(frag => {
            if (frag.mass >= 20) {
                const halfMass = frag.mass / 2;
                frag.mass = halfMass;
                frag.splitTime = Date.now();

                // Direction to mouse
                const direction = this.getUnitVector(frag.x, frag.y, player.target.x, player.target.y);
                // Agar.io split launch burst
                const vx = direction.x * 25;
                const vy = direction.y * 25;

                newFragments.push({
                    id: Date.now() + Math.random(),
                    x: frag.x,
                    y: frag.y,
                    mass: halfMass,
                    radius: 0, // update stats will fix
                    vx: vx,
                    vy: vy,
                    splitTime: Date.now()
                });
            }
        });
        player.fragments.push(...newFragments);
        this.updatePlayerStats(socketId);
    }

    handleEject(socketId) {
        if (this.status !== "ACTIVE") return;
        const player = this.players[socketId];
        if (!player) return;

        player.fragments.forEach(frag => {
            if (frag.mass > 25) {
                frag.mass -= 15;
                const direction = this.getUnitVector(frag.x, frag.y, player.target.x, player.target.y);

                const id = `ejected-${Date.now()}-${Math.random()}`;
                this.ejectedMass[id] = {
                    id,
                    x: frag.x + direction.x * (frag.radius + 10),
                    y: frag.y + direction.y * (frag.radius + 10),
                    vx: direction.x * 20,
                    vy: direction.y * 20,
                    color: player.color,
                    mass: 10,
                    radius: 10
                };
            }
        });
        this.updatePlayerStats(socketId);
    }

    updatePlayerStats(socketId) {
        const player = this.players[socketId];
        if (!player) return;

        player.totalMass = 0;
        player.fragments.forEach(frag => {
            frag.radius = 12 + Math.sqrt(frag.mass) * 4;
            player.totalMass += frag.mass;
        });
    }

    update() {
        const now = Date.now();
        if (this.status === "WAITING" || this.status === "STARTING" || this.status === "ENDED") return;

        // Update Ejected Mass
        Object.keys(this.ejectedMass).forEach(id => {
            const em = this.ejectedMass[id];
            em.x += em.vx;
            em.y += em.vy;
            em.vx *= 0.9;
            em.vy *= 0.9;
            if (em.x < 0 || em.x > MAP_WIDTH || em.y < 0 || em.y > MAP_HEIGHT) delete this.ejectedMass[id];
        });

        const playerList = Object.values(this.players);
        playerList.forEach((player) => {
            player.fragments.forEach((frag, idx) => {
                // Physics
                frag.x += frag.vx;
                frag.y += frag.vy;
                frag.vx *= 0.85;
                frag.vy *= 0.85;

                const dx = player.target.x - frag.x;
                const dy = player.target.y - frag.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > 1) {
                    // Agario speed-mass inverse curve
                    const speed = 12 * Math.pow(frag.mass, -0.439);
                    frag.x += (dx / distance) * Math.max(0.5, speed);
                    frag.y += (dy / distance) * Math.max(0.5, speed);
                }

                // Bounds
                frag.x = Math.max(0, Math.min(MAP_WIDTH, frag.x));
                frag.y = Math.max(0, Math.min(MAP_HEIGHT, frag.y));

                // Merge fragments
                player.fragments.forEach((otherFrag, oIdx) => {
                    if (idx !== oIdx) {
                        const dist = Math.sqrt((frag.x - otherFrag.x) ** 2 + (frag.y - otherFrag.y) ** 2);
                        const canMerge = (now - frag.splitTime > 30000) && (now - otherFrag.splitTime > 30000);
                        if (dist < (frag.radius + otherFrag.radius) * 0.5 && canMerge) {
                            frag.mass += otherFrag.mass;
                            player.fragments.splice(oIdx, 1);
                            this.updatePlayerStats(player.id);
                        } else if (dist < frag.radius + otherFrag.radius) {
                            // Separation force
                            const angle = Math.atan2(otherFrag.y - frag.y, otherFrag.x - frag.x);
                            const overlap = (frag.radius + otherFrag.radius) - dist;
                            otherFrag.x += Math.cos(angle) * overlap * 0.1;
                            otherFrag.y += Math.sin(angle) * overlap * 0.1;
                        }
                    }
                });

                // Eat Food
                Object.values(this.food).forEach(f => {
                    const dist = Math.sqrt((frag.x - f.x) ** 2 + (frag.y - f.y) ** 2);
                    if (dist < frag.radius) {
                        delete this.food[f.id];
                        frag.mass += 1;
                        this.updatePlayerStats(player.id);
                        this.addFood();
                    }
                });

                // Hit Virus
                Object.values(this.viruses).forEach(v => {
                    const dist = Math.sqrt((frag.x - v.x) ** 2 + (frag.y - v.y) ** 2);
                    if (dist < frag.radius + v.radius && frag.mass > v.mass * 1.2) {
                        this.explodePlayer(player.id, idx);
                        delete this.viruses[v.id];
                        this.addVirus();
                    }
                });

                // Eat Players
                playerList.forEach(otherPlayer => {
                    if (player.id !== otherPlayer.id) {
                        otherPlayer.fragments.forEach((otherFrag, oIdx) => {
                            const dist = Math.sqrt((frag.x - otherFrag.x) ** 2 + (frag.y - otherFrag.y) ** 2);
                            if (dist < frag.radius && frag.mass > otherFrag.mass * 1.15) {
                                frag.mass += otherFrag.mass;
                                otherPlayer.fragments.splice(oIdx, 1);
                                this.updatePlayerStats(player.id);
                                this.updatePlayerStats(otherPlayer.id);

                                if (otherPlayer.fragments.length === 0) {
                                    this.eliminatePlayer(otherPlayer.id, player.id);
                                }
                            }
                        });
                    }
                });
            });

            // Decay
            player.fragments.forEach(f => { if (f.mass > 20) f.mass -= f.mass * 0.0001; });
            this.updatePlayerStats(player.id);
        });

        // Check for WINNER only in Arena rooms
        if (this.id !== "0" && this.status === "ACTIVE" && Object.keys(this.players).length === 1) {
            this.endMatch(Object.keys(this.players)[0]);
        }
    }

    explodePlayer(userId, fragIdx) {
        const player = this.players[userId];
        const frag = player.fragments[fragIdx];
        const pieces = 8;
        const newMass = frag.mass / pieces;
        frag.mass = newMass;
        frag.splitTime = Date.now();
        for (let i = 0; i < pieces - 1; i++) {
            const angle = Math.random() * Math.PI * 2;
            player.fragments.push({
                id: Math.random(),
                x: frag.x,
                y: frag.y,
                mass: newMass,
                vx: Math.cos(angle) * 10,
                vy: Math.sin(angle) * 10,
                splitTime: Date.now()
            });
        }
        this.updatePlayerStats(userId);
    }

    eliminatePlayer(id, killerId) {
        const player = this.players[id];
        const killer = this.players[killerId];
        if (!player) return;

        console.log(`Player ${id} eliminated by ${killerId}`);
        player.socket.emit("game-over", { winner: killer?.name, isLobby: this.id === "0" });

        if (this.id === "0") {
            // Respawn in lobby after a short delay
            setTimeout(() => {
                const respawnPlayer = this.players[id];
                if (!respawnPlayer) return;

                respawnPlayer.fragments = [this.createSpawnFragment(0)];
                respawnPlayer.target = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
                this.updatePlayerStats(id);
            }, 2000);
        } else {
            delete this.players[id];
        }

        // Final report of stats
        if (player.walletAddress) {
            this.reportStats(player.walletAddress, 0, 1, 0);
        }
    }

    endMatch(winnerId) {
        this.status = "ENDED";
        const winner = this.players[winnerId];
        if (winner) {
            this.winnerName = winner.name;
            console.log(`Match won by ${winner.name}`);
            winner.socket.emit("victory", { pot: this.price * 10 });
            if (winner.walletAddress) {
                const winnerPayout = this.price * this.maxPlayers * (1 - HOUSE_FEE_RATE);
                this.reportStats(winner.walletAddress, 1, 0, winnerPayout);
            }
        }
        setTimeout(() => this.resetRoom(), 10000);
    }

    reportStats(wallet, wins, losses, earnings) {
        applyStatsUpdate(wallet, wins, losses, earnings).catch((error) => {
            console.error("Failed to update stats:", error);
        });
    }

    getState() {
        const playersClean = {};
        Object.values(this.players).forEach(p => {
            playersClean[p.id] = {
                id: p.id,
                name: p.name,
                color: p.color,
                fragments: p.fragments.map(f => ({ id: f.id, x: f.x, y: f.y, radius: f.radius, mass: f.mass })),
                totalMass: p.totalMass
            };
        });

        return {
            players: playersClean,
            food: this.food,
            viruses: this.viruses,
            ejectedMass: this.ejectedMass,
            mapWidth: MAP_WIDTH,
            mapHeight: MAP_HEIGHT,
            status: this.status,
            countdown: this.countdown,
            winnerName: this.winnerName
        };
    }

    resetRoom() {
        this.players = {};
        if (this.id === "0") {
            this.status = "ACTIVE";
        } else {
            this.status = "WAITING";
        }
        this.initEntities();
    }
}

const rooms = {};
const joinAttemptsByIp = new Map();

gameConfig.rooms.forEach((roomConfig) => {
    rooms[roomConfig.id] = new GameRoom(roomConfig.id, roomConfig.price, roomConfig.maxPlayers);
    if (roomConfig.isLobby) {
        rooms[roomConfig.id].status = "ACTIVE";
    }
});

function getRoomSummaries() {
    const nowIso = new Date().toISOString();
    return gameConfig.rooms.map((roomConfig) => {
        const room = rooms[roomConfig.id];
        return {
            id: roomConfig.id,
            name: roomConfig.name || `${roomConfig.price} USDC`,
            price: roomConfig.price,
            maxPlayers: roomConfig.maxPlayers,
            isLobby: !!roomConfig.isLobby,
            players: Object.keys(room.players).length,
            status: room.status,
            region: ROOM_REGION,
            updatedAt: nowIso,
        };
    });
}

app.prepare().then(() => {
    const httpServer = createServer(async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            const { pathname, query } = parsedUrl;
            if (pathname === "/api/rooms") {
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(getRoomSummaries()));
            } else if (pathname === "/a") {
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
        let isSpectator = false;
        let lastInputAt = 0;
        let lastSplitAt = 0;
        let lastEjectAt = 0;
        let lastJoinAt = 0;

        socket.on("join-room", ({ roomId, playerData, spectator }) => {
            const now = Date.now();
            if (now - lastJoinAt < 100) {
                socket.emit("error", "JOIN_RATE_LIMITED");
                return;
            }
            lastJoinAt = now;

            const ip = socket.handshake.address || "unknown";
            const previousAttempt = joinAttemptsByIp.get(ip) || 0;
            if (now - previousAttempt < 100) {
                socket.emit("error", "IP_JOIN_RATE_LIMITED");
                return;
            }
            joinAttemptsByIp.set(ip, now);
            if (joinAttemptsByIp.size > 10000) {
                for (const [key, timestamp] of joinAttemptsByIp.entries()) {
                    if (now - timestamp > 30000) {
                        joinAttemptsByIp.delete(key);
                    }
                }
            }

            const room = rooms[roomId];
            if (!room) {
                socket.emit("error", "Room not found");
                return;
            }

            if (currentRoomId) {
                // Leave previous room
                const prevRoom = rooms[currentRoomId];
                if (prevRoom && !isSpectator) prevRoom.removePlayer(socket.id);
                socket.leave(currentRoomId);
            }

            isSpectator = Boolean(spectator);
            if (isSpectator) {
                currentRoomId = roomId;
                socket.join(roomId);
                socket.emit("spectator-joined", { roomId });
                socket.emit("game-state", room.getState());
                return;
            }

            const result = room.addPlayer(socket, playerData || {});
            if (result.error) {
                socket.emit("error", result.error);
                return;
            }

            const player = result;
            currentRoomId = roomId;
            socket.join(roomId);
            console.log(`Player ${socket.id} joined room ${roomId}`);

            // Send initial state
            socket.emit("game-state", room.getState());
            socket.to(roomId).emit("player-joined", { ...player, socket: undefined });
        });

        socket.on("input", (inputData) => {
            const now = Date.now();
            if (now - lastInputAt < 33) return;
            lastInputAt = now;
            if (isSpectator) return;

            if (currentRoomId && rooms[currentRoomId]) {
                rooms[currentRoomId].handleInput(socket.id, inputData);
            }
        });

        socket.on("split", () => {
            const now = Date.now();
            if (now - lastSplitAt < 250) return;
            lastSplitAt = now;
            if (isSpectator) return;

            if (currentRoomId && rooms[currentRoomId]) {
                rooms[currentRoomId].handleSplit(socket.id);
            }
        });

        socket.on("eject", () => {
            const now = Date.now();
            if (now - lastEjectAt < 150) return;
            lastEjectAt = now;
            if (isSpectator) return;

            if (currentRoomId && rooms[currentRoomId]) {
                rooms[currentRoomId].handleEject(socket.id);
            }
        });

        socket.on("disconnect", () => {
            if (currentRoomId && rooms[currentRoomId] && !isSpectator) {
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
