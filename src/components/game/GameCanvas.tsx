"use client";

import { useEffect, useRef } from "react";
import { GameEngine } from "@/lib/game/Engine";
import { INITIAL_STATE } from "@/lib/game/GameState";
import { io, Socket } from "socket.io-client";
import { useWallet } from "@solana/wallet-adapter-react";

interface GameCanvasProps {
    roomId: string;
    spectating?: boolean;
    onEngineReady?: (engine: GameEngine) => void;
    onConnectionState?: (state: "connecting" | "connected" | "error") => void;
    onGameEvent?: (event: "game_over" | "victory", payload: { winner?: string; isLobby?: boolean; pot?: number }) => void;
}

export const GameCanvas = ({ roomId, spectating, onEngineReady, onConnectionState, onGameEvent }: GameCanvasProps) => {
    const { publicKey } = useWallet();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const onEngineReadyRef = useRef(onEngineReady);
    const onConnectionStateRef = useRef(onConnectionState);
    const onGameEventRef = useRef(onGameEvent);

    useEffect(() => {
        onEngineReadyRef.current = onEngineReady;
    }, [onEngineReady]);
    useEffect(() => {
        onConnectionStateRef.current = onConnectionState;
    }, [onConnectionState]);
    useEffect(() => {
        onGameEventRef.current = onGameEvent;
    }, [onGameEvent]);

    // Initialize Socket and Engine only once
    useEffect(() => {
        if (!canvasRef.current) return;

        console.log("Initializing Game Socket...");
        const socket = io();
        socketRef.current = socket;
        onConnectionStateRef.current?.("connecting");

        const engine = new GameEngine(canvasRef.current, INITIAL_STATE, socket);
        engineRef.current = engine;
        engine.start();
        engine.onGameOver = (data) => onGameEventRef.current?.("game_over", data);
        engine.onVictory = (data) => onGameEventRef.current?.("victory", data);

        socket.on("connect", () => {
            console.log("Socket connected:", socket.id);
            engine.setMyPlayerId(socket.id!);
            onConnectionStateRef.current?.("connected");
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err);
            onConnectionStateRef.current?.("error");
        });

        if (onEngineReadyRef.current) onEngineReadyRef.current(engine);

        const gameWindow = window as Window & {
            render_game_to_text?: () => string;
            advanceTime?: (ms: number) => void;
        };
        gameWindow.render_game_to_text = () => engine.renderGameToText();
        gameWindow.advanceTime = (ms: number) => engine.advanceTime(ms);

        return () => {
            console.log("Cleaning up Game Engine...");
            engine.stop();
            socket.disconnect();
            delete gameWindow.render_game_to_text;
            delete gameWindow.advanceTime;
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
                spectator: !!spectating,
                playerData: {
                    name: publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : "Guest",
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
    }, [roomId, publicKey, spectating]);

    return (
        <canvas
            ref={canvasRef}
            className="block w-full h-full bg-deep-space"
            style={{ touchAction: "none" }}
        />
    );
};
