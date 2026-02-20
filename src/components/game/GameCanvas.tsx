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
    const { publicKey, connected } = useWallet();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const socketRef = useRef<Socket | null>(null);

    // Initialize Socket and Engine only once
    useEffect(() => {
        if (!canvasRef.current) return;

        console.log("Initializing Game Socket...");
        const socket = io();
        socketRef.current = socket;

        const engine = new GameEngine(canvasRef.current, INITIAL_STATE, socket);
        engineRef.current = engine;
        engine.start();

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            engine.setMyPlayerId(socket.id!);
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
        });

        if (onEngineReady) onEngineReady(engine);

        return () => {
            console.log("Cleaning up Game Engine...");
            engine.stop();
            socket.disconnect();
        };
    }, []);

    // Handle Joining/Re-joining when wallet or room changes
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const join = () => {
            if (!socket.connected) return;

            console.log(`Joining room ${roomId} with wallet:`, publicKey?.toBase58());
            socket.emit("join-room", {
                roomId,
                playerData: {
                    name: publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : "Player",
                    walletAddress: publicKey?.toBase58() || null
                }
            });
        };

        if (socket.connected) {
            join();
        } else {
            socket.once("connect", join);
        }

        return () => {
            socket.off("connect", join);
        };
    }, [roomId, publicKey, connected]);

    return (
        <canvas
            ref={canvasRef}
            className="block w-full h-full bg-deep-space"
            style={{ touchAction: "none" }}
        />
    );
};

