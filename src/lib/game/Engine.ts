import { GameState, Player, Food } from "./GameState";
import { Socket } from "socket.io-client";

export class GameEngine {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private state: GameState;
    private socket: Socket;
    private animationId: number | null = null;
    private camera: { x: number; y: number; scale: number } = { x: 0, y: 0, scale: 1 };

    // Local player ID
    public myPlayerId: string | null = null;
    public onStateUpdate: ((state: GameState) => void) | null = null;

    // Mouse Input
    private mousePos = { x: 0, y: 0 };

    constructor(canvas: HTMLCanvasElement, initialState: GameState, socket: Socket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.state = initialState;
        this.socket = socket;

        // Handle resizing
        window.addEventListener("resize", this.handleResize);
        this.handleResize();

        // Handle Input
        window.addEventListener("mousemove", this.onMouseMove);
        window.addEventListener("keydown", this.onKeyDown);

        // Socket Listeners
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.socket.on("game-state", (gameState: GameState) => {
            // Interpolate or replace state
            // For MVP, replace
            this.updateState(gameState);
        });

        this.socket.on("player-joined", (player: Player) => {
            console.log("Player joined:", player);
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
        window.removeEventListener("keydown", this.onKeyDown);
    }

    public updateState(newState: Partial<GameState>) {
        this.state = { ...this.state, ...newState };
        if (this.onStateUpdate) this.onStateUpdate(this.state);
    }

    public setMyPlayerId(id: string) {
        this.myPlayerId = id;
    }

    private loop = () => {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    };

    private onKeyDown = (e: KeyboardEvent) => {
        if (e.code === "Space") {
            this.socket.emit("split");
        } else if (e.code === "KeyW") {
            this.socket.emit("eject");
        }
    };

    private onMouseMove = (e: MouseEvent) => {
        if (!this.myPlayerId || !this.state.players[this.myPlayerId]) return;

        const player = this.state.players[this.myPlayerId];
        // For camera follow, we use the average position of fragments
        let avgX = 0, avgY = 0;
        player.fragments.forEach(f => { avgX += f.x; avgY += f.y; });
        avgX /= player.fragments.length;
        avgY /= player.fragments.length;

        const dx = e.clientX - this.canvas.width / 2;
        const dy = e.clientY - this.canvas.height / 2;

        const targetX = avgX + dx / this.camera.scale;
        const targetY = avgY + dy / this.camera.scale;

        if (this.socket.connected) {
            this.socket.emit("input", { x: targetX, y: targetY });
        }
    };

    private update() {
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

            this.camera.x += (avgX - this.camera.x) * 0.1;
            this.camera.y += (avgY - this.camera.y) * 0.1;

            const targetScale = Math.max(0.05, 0.8 / (maxRadius / 20));
            this.camera.scale += (targetScale - this.camera.scale) * 0.05;
        }
    }

    private draw() {
        const { width, height } = this.canvas;
        const { ctx } = this;

        // Clear screen
        ctx.fillStyle = "#0a0a12"; // Deep space
        ctx.fillRect(0, 0, width, height);

        ctx.save();

        // Camera transform
        ctx.translate(width / 2, height / 2);
        ctx.scale(this.camera.scale, this.camera.scale);
        ctx.translate(-this.camera.x, -this.camera.y);

        // Draw Map Boundaries
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 5;
        ctx.strokeRect(0, 0, this.state.mapWidth, this.state.mapHeight);

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
        // Draw a subtle grid
        const step = 50;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
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
    }

    private drawVirus(x: number, y: number, radius: number) {
        const { ctx } = this;
        ctx.save();
        ctx.fillStyle = "#33ff33"; // Green virus
        ctx.strokeStyle = "#22aa22";
        ctx.lineWidth = 4;

        ctx.beginPath();
        const spikes = 20;
        for (let i = 0; i < spikes * 2; i++) {
            const r = i % 2 === 0 ? radius : radius * 0.8;
            const angle = (Math.PI * 2 * i) / (spikes * 2);
            ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    private drawPlayer(player: Player) {
        player.fragments.forEach(frag => {
            // Cell body
            this.ctx.fillStyle = player.color;
            this.ctx.beginPath();
            this.ctx.arc(frag.x, frag.y, frag.radius, 0, Math.PI * 2);
            this.ctx.fill();

            // Cell Border (Neon Glow)
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = player.color;
            this.ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.shadowBlur = 0;

            // Name on largest fragment
        });

        // Draw Name on the average position
        let avgX = 0, avgY = 0;
        player.fragments.forEach(f => { avgX += f.x; avgY += f.y; });
        avgX /= player.fragments.length;
        avgY /= player.fragments.length;

        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = `bold 14px "Orbitron", sans-serif`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(player.name, avgX, avgY);
    }
}
