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
    }

    public updateState(newState: Partial<GameState>) {
        this.state = { ...this.state, ...newState };
    }

    public setMyPlayerId(id: string) {
        this.myPlayerId = id;
    }

    private loop = () => {
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(this.loop);
    };

    private onMouseMove = (e: MouseEvent) => {
        this.mousePos.x = e.clientX;
        this.mousePos.y = e.clientY;

        // Convert screen to world coordinates
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.canvas.width / 2) / this.camera.scale + this.camera.x;
        const y = (e.clientY - rect.top - this.canvas.height / 2) / this.camera.scale + this.camera.y;

        // Emit target (throttling can be added here)
        if (this.socket.connected) {
            this.socket.emit("input", { x, y });
        }
    };

    private update() {
        // Client-side prediction or interpolation can go here
        // For now, we rely on state updates from server

        // Update camera position to follow my player
        if (this.myPlayerId && this.state.players[this.myPlayerId]) {
            const player = this.state.players[this.myPlayerId];
            // Smooth camera movement
            this.camera.x += (player.x - this.camera.x) * 0.1;
            this.camera.y += (player.y - this.camera.y) * 0.1;

            // Dynamic zoom based on mass
            const targetScale = Math.max(0.1, 1 / (player.radius / 50)); // Approximate zoom logic
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

        // Draw Players
        const sortedPlayers = Object.values(this.state.players).sort((a, b) => a.mass - b.mass);
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

    private drawPlayer(player: Player) {
        // Cell body
        this.ctx.fillStyle = player.color;
        this.ctx.beginPath();
        this.ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Cell Border (Neon Glow)
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = player.color;
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Name
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = `bold ${Math.max(12, player.radius / 3)}px "Orbitron", sans-serif`;
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "middle";
        this.ctx.fillText(player.name, player.x, player.y);
    }
}
