import { GameState, Player } from "./GameState";
import { Socket } from "socket.io-client";

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private state: GameState;
    private lastState: GameState;
    private nextState: GameState | null = null;
    private stateTime: number = 0;
    private socket: Socket;
    private animationId: number | null = null;
    private camera: { x: number; y: number; scale: number } = { x: 0, y: 0, scale: 1 };

    // Local player ID
    public myPlayerId: string | null = null;
    public onStateUpdate: ((state: GameState) => void) | null = null;
    public onGameOver: ((data: { winner: string; isLobby: boolean }) => void) | null = null;
    public onVictory: ((data: { pot: number }) => void) | null = null;

    // Mouse Input
    private mousePos = { x: 0, y: 0 };

    constructor(canvas: HTMLCanvasElement, initialState: GameState, socket: Socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.state = initialState;
        this.lastState = initialState;
        this.socket = socket;

        // Handle resizing
        window.addEventListener("resize", this.handleResize);
        this.handleResize();

        // Handle Input
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("touchstart", this.onTouchMove, { passive: false });
        window.addEventListener("touchmove", this.onTouchMove, { passive: false });
        window.addEventListener("keydown", this.onKeyDown);

        // Socket Listeners
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.socket.on("game-state", (gameState: GameState) => {
            this.lastState = this.state;
            this.nextState = gameState;
            this.stateTime = performance.now();

            // Still trigger update for UI observers
            if (this.onStateUpdate) this.onStateUpdate(gameState);
        });

        this.socket.on("game-over", (data: { winner: string, isLobby: boolean }) => {
            console.log("Game Over:", data);
            if (this.onGameOver) this.onGameOver(data);
        });

        this.socket.on("victory", (data: { pot: number }) => {
            if (this.onVictory) this.onVictory(data);
        });
    }

    private handleResize = () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    };

    public start() {
        if (!this.animationId) {
            this.loop();
        }
    }

    public stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        window.removeEventListener("resize", this.handleResize);
        window.removeEventListener("mousemove", this.onMouseMove);
        window.removeEventListener("touchstart", this.onTouchMove);
        window.removeEventListener("touchmove", this.onTouchMove);
        window.removeEventListener("keydown", this.onKeyDown);
    }

    public setMyPlayerId(id: string) {
        this.myPlayerId = id;
    }

    public emitSplit() {
        if (this.socket.connected) this.socket.emit("split");
    }

    public emitEject() {
        if (this.socket.connected) this.socket.emit("eject");
    }

    public emitInput(targetX: number, targetY: number) {
        if (!this.socket.connected) return;
        this.socket.emit("input", { x: targetX, y: targetY });
    }

    public renderGameToText(): string {
        const players = Object.values(this.state.players).map((player) => ({
            id: player.id,
            name: player.name,
            totalMass: Math.round(player.totalMass || 0),
            fragments: player.fragments.map((fragment) => ({
                x: Math.round(fragment.x),
                y: Math.round(fragment.y),
                radius: Math.round(fragment.radius),
                mass: Math.round(fragment.mass),
            })),
        }));

        const payload = {
            coordinateSystem: "origin=(0,0) top-left, +x right, +y down",
            status: this.state.status,
            countdown: this.state.countdown,
            map: { width: this.state.mapWidth, height: this.state.mapHeight },
            me: this.myPlayerId ? this.state.players[this.myPlayerId]?.name || null : null,
            playerCount: players.length,
            topPlayers: players
                .sort((a, b) => b.totalMass - a.totalMass)
                .slice(0, 5),
            foodCount: Object.keys(this.state.food).length,
            virusCount: Object.keys(this.state.viruses).length,
            ejectedMassCount: Object.keys(this.state.ejectedMass).length,
        };

        return JSON.stringify(payload);
    }

    public advanceTime(ms: number) {
        const frameMs = 1000 / 60;
        const steps = Math.max(1, Math.round(ms / frameMs));
        for (let i = 0; i < steps; i++) {
            this.update();
        }
        this.draw();
    }

    private loop = () => {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    };

    private onKeyDown = (e: KeyboardEvent) => {
        if (e.code === "Space") {
            this.emitSplit();
        } else if (e.code === "KeyW") {
            this.emitEject();
        }
    };

    private onMouseMove = (e: MouseEvent) => {
        this.emitInputFromScreenPoint(e.clientX, e.clientY);
    };

    private onTouchMove = (e: TouchEvent) => {
        if (!e.touches[0]) return;
        e.preventDefault();
        this.emitInputFromScreenPoint(e.touches[0].clientX, e.touches[0].clientY);
    };

    public emitInputFromScreenPoint(clientX: number, clientY: number) {
        if (!this.myPlayerId || !this.state.players[this.myPlayerId]) return;

        const player = this.state.players[this.myPlayerId];
        let avgX = 0, avgY = 0;
        player.fragments.forEach(f => { avgX += f.x; avgY += f.y; });
        avgX /= player.fragments.length;
        avgY /= player.fragments.length;

        const dx = clientX - this.canvas.width / 2;
        const dy = clientY - this.canvas.height / 2;

        const targetX = avgX + dx / this.camera.scale;
        const targetY = avgY + dy / this.camera.scale;

        this.emitInput(targetX, targetY);
    }

    private update() {
        // Interpolate State
        if (this.nextState) {
            const now = performance.now();
            const elapsed = now - this.stateTime;
            const t = Math.min(1, elapsed / (1000 / 30)); // Assuming 30 FPS server updates

            // Smoothly move between last known state and next state
            this.interpolateState(t);
        }

        if (this.myPlayerId && this.state.players[this.myPlayerId]) {
            const player = this.state.players[this.myPlayerId];

            let avgX = 0, avgY = 0, maxRadius = 0;
            player.fragments.forEach(f => {
                avgX += f.x;
                avgY += f.y;
                if (f.radius > maxRadius) maxRadius = f.radius;
            });
            avgX /= player.fragments.length;
            avgY /= player.fragments.length;

            this.camera.x += (avgX - this.camera.x) * 0.15; // Slightly faster camera
            this.camera.y += (avgY - this.camera.y) * 0.15;

            const targetScale = Math.max(0.05, 0.8 / (maxRadius / 20));
            this.camera.scale += (targetScale - this.camera.scale) * 0.05;
        }
    }

    private interpolateState(t: number) {
        if (!this.nextState) return;

        // Simple linear interpolation for fragments
        const interpolatedPlayers: Record<string, Player> = {};

        Object.keys(this.nextState.players).forEach(id => {
            const nextPlayer = this.nextState!.players[id];
            const lastPlayer = this.lastState.players[id];

            if (lastPlayer) {
                interpolatedPlayers[id] = {
                    ...nextPlayer,
                    fragments: nextPlayer.fragments.map((nf, i) => {
                        const lf = lastPlayer.fragments[i] || nf; // Fallback to nf if fragment count changed
                        return {
                            ...nf,
                            x: lf.x + (nf.x - lf.x) * t,
                            y: lf.y + (nf.y - lf.y) * t,
                        };
                    })
                };
            } else {
                interpolatedPlayers[id] = nextPlayer;
            }
        });

        this.state = {
            ...this.nextState,
            players: interpolatedPlayers
        };
    }

    private draw() {
        const { width, height } = this.canvas;
        const { ctx } = this;

        // Clear screen
        ctx.fillStyle = "#02040a"; // Even deeper space
        ctx.fillRect(0, 0, width, height);

        ctx.save();

        // Camera transform
        ctx.translate(width / 2, height / 2);
        ctx.scale(this.camera.scale, this.camera.scale);
        ctx.translate(-this.camera.x, -this.camera.y);

        // Draw Map Boundaries
        ctx.strokeStyle = "rgba(0, 243, 255, 0.2)";
        ctx.lineWidth = 10;
        ctx.strokeRect(-5, -5, this.state.mapWidth + 10, this.state.mapHeight + 10);

        // Draw Grid
        this.drawGrid();

        // Draw Food
        Object.values(this.state.food).forEach((food) => {
            this.drawCircle(food.x, food.y, food.radius, food.color);
        });

        // Draw Ejected Mass
        Object.values(this.state.ejectedMass).forEach((em) => {
            this.drawCircle(em.x, em.y, em.radius, em.color);
        });

        // Draw Viruses
        Object.values(this.state.viruses).forEach((v) => {
            this.drawVirus(v.x, v.y, v.radius);
        });

        // Draw Players
        const sortedPlayers = Object.values(this.state.players).sort((a, b) => (a.totalMass || 0) - (b.totalMass || 0));
        sortedPlayers.forEach((player) => {
            this.drawPlayer(player);
        });

        ctx.restore();
    }

    private drawGrid() {
        const step = 100; // Larger grid
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();

        for (let x = 0; x <= this.state.mapWidth; x += step) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.state.mapHeight);
        }
        for (let y = 0; y <= this.state.mapHeight; y += step) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.state.mapWidth, y);
        }
        this.ctx.stroke();
    }

    private drawCircle(x: number, y: number, radius: number, color: string) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Add a highlight
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.beginPath();
        this.ctx.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    private drawVirus(x: number, y: number, radius: number) {
        const { ctx } = this;
        ctx.save();

        // Create pulsating effect
        const pulse = 1 + Math.sin(performance.now() * 0.005) * 0.05;
        const r = radius * pulse;

        ctx.fillStyle = "rgba(51, 255, 51, 0.8)";
        ctx.strokeStyle = "#22aa22";
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#33ff33";

        ctx.beginPath();
        const spikes = 18;
        for (let i = 0; i < spikes * 2; i++) {
            const currentR = i % 2 === 0 ? r : r * 0.85;
            const angle = (Math.PI * 2 * i) / (spikes * 2);
            ctx.lineTo(x + Math.cos(angle) * currentR, y + Math.sin(angle) * currentR);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    private drawPlayer(player: Player) {
        const { ctx } = this;
        const isMe = player.id === this.myPlayerId;

        player.fragments.forEach(frag => {
            ctx.save();

            // Cell Body Gradient
            const gradient = ctx.createRadialGradient(frag.x, frag.y, 0, frag.x, frag.y, frag.radius);
            gradient.addColorStop(0, player.color);
            gradient.addColorStop(1, this.shadeColor(player.color, -20));

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(frag.x, frag.y, frag.radius, 0, Math.PI * 2);
            ctx.fill();

            // Neon Border
            ctx.shadowBlur = isMe ? 25 : 15;
            ctx.shadowColor = player.color;
            ctx.strokeStyle = isMe ? "rgba(255, 255, 255, 0.8)" : "rgba(255, 255, 255, 0.3)";
            ctx.lineWidth = isMe ? 4 : 2;
            ctx.stroke();

            // Interior Glow
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = frag.radius * 0.1;
            ctx.beginPath();
            ctx.arc(frag.x, frag.y, frag.radius * 0.8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.restore();
        });

        // Draw Name on the average position
        let avgX = 0, avgY = 0;
        player.fragments.forEach(f => { avgX += f.x; avgY += f.y; });
        avgX /= player.fragments.length;
        avgY /= player.fragments.length;

        ctx.fillStyle = "#ffffff";
        ctx.font = `bold ${Math.max(12, 14)}px "Orbitron", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowBlur = 5;
        ctx.shadowColor = "black";
        ctx.fillText(player.name, avgX, avgY);
        ctx.shadowBlur = 0;
    }

    private shadeColor(color: string, percent: number) {
        // Simple HSL or Hex shade would be better, but assuming hsl(...) format here
        if (color.startsWith('hsl')) {
            const match = color.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
            if (match) {
                const h = match[1];
                const s = match[2];
                let l = parseInt(match[3]);
                l = Math.max(0, Math.min(100, l + percent));
                return `hsl(${h}, ${s}%, ${l}%)`;
            }
        }
        return color;
    }
}
