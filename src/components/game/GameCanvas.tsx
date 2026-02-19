"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/game/Engine";
import { INITIAL_STATE } from "@/lib/game/GameState";
import { io, Socket } from "socket.io-client";

interface GameCanvasProps {
    roomId: string;
}

export const GameCanvas = ({ roomId }: GameCanvasProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Socket
        const socket = io();
        socketRef.current = socket;

        socket.on("connect", () => {
            console.log("Connected to server:", socket.id);
            // Join game
            socket.emit("join-room", { roomId, playerData: { name: "Guest" } });
        });

        // Initialize Engine
        const engine = new GameEngine(canvasRef.current, INITIAL_STATE, socket);
        engineRef.current = engine;
        engine.start();

        // Mock Data for testing (Remove later)
        engine.updateState({
            players: {
                "me": { id: "me", name: "You", color: "#00f3ff", x: 1500, y: 1500, radius: 40, mass: 100, isSpectator: false },
            }
        });
        engine.setMyPlayerId("me");

        return () => {
            engine.stop();
            socket.disconnect();
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="block w-full h-full bg-deep-space"
            style={{ touchAction: "none" }}
        />
    );
};
