"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/game/Engine";
import { INITIAL_STATE } from "@/lib/game/GameState";
import { io, Socket } from "socket.io-client";
import { useWallet } from "@solana/wallet-adapter-react";

interface GameCanvasProps {
    roomId: string;
    onEngineReady?: (engine: GameEngine) => void;
}

export const GameCanvas = ({ roomId, onEngineReady }: GameCanvasProps) => {
    const { publicKey } = useWallet();
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
            engine.setMyPlayerId(socket.id!);

            // Join game
            socket.emit("join-room", {
                roomId,
                playerData: {
                    name: "Player",
                    walletAddress: publicKey?.toBase58() || null
                }
            });
        });

        // Initialize Engine
        const engine = new GameEngine(canvasRef.current, INITIAL_STATE, socket);
        engineRef.current = engine;
        engine.start();

        if (onEngineReady) onEngineReady(engine);

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
