"use client";

import { GameCanvas } from "@/components/game/GameCanvas";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { GameState, INITIAL_STATE } from "@/lib/game/GameState";
import { GAME_CONFIG, ROOM_BY_ID } from "@/config/game-config";
import { GameEngine } from "@/lib/game/Engine";
import { useWallet } from "@solana/wallet-adapter-react";
import { trackEvent } from "@/lib/analytics";
import { updateGuestSessionStats } from "@/lib/guest-session";

function PlayContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { connected } = useWallet();
    const roomId = searchParams.get("room") || "1";
    const spectating = searchParams.get("spectate") === "1";
    const signature = searchParams.get("sig");

    const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
    const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "error">("connecting");
    const [isTimedOut, setIsTimedOut] = useState(false);
    const [isQueued, setIsQueued] = useState(false);

    const engineRef = useRef<GameEngine | null>(null);
    const prevStatusRef = useRef<GameState["status"]>(INITIAL_STATE.status);

    const isLobby = roomId === "0";
    const playersCount = Object.keys(gameState.players).length;
    const roomPrice = ROOM_BY_ID[roomId]?.price ?? ROOM_BY_ID["1"]?.price ?? 0.1;
    const totalPot = playersCount * roomPrice;
    const winnerPayout = totalPot * (1 - GAME_CONFIG.houseFeeRate);
    const amIWinner = !!myPlayerId && gameState.winnerName === gameState.players[myPlayerId]?.name;

    useEffect(() => {
        trackEvent("play_page_opened", { roomId, spectating });
    }, [roomId, spectating]);

    useEffect(() => {
        if (connectionState !== "connecting") return;

        const timer = window.setTimeout(() => {
            setIsTimedOut(true);
        }, 8000);

        return () => {
            window.clearTimeout(timer);
        };
    }, [connectionState]);

    useEffect(() => {
        const previous = prevStatusRef.current;
        if (previous !== gameState.status) {
            trackEvent("match_status_changed", {
                roomId,
                from: previous,
                to: gameState.status,
                spectating,
            });
            if (gameState.status === "ACTIVE") {
                trackEvent("match_started", { roomId, spectating });
            }
            if (gameState.status === "ENDED") {
                trackEvent("match_ended", { roomId, spectating, winner: gameState.winnerName });
            }
        }
        prevStatusRef.current = gameState.status;
    }, [gameState.status, gameState.winnerName, roomId, spectating]);

    return (
        <div className="w-screen h-screen overflow-hidden bg-white relative font-sans">
            <GameCanvas
                roomId={roomId}
                spectating={spectating}
                signature={signature}
                onConnectionState={(state) => {
                    setConnectionState(state);
                    if (state === "connected") {
                        setIsTimedOut(false);
                        trackEvent("socket_connected", { roomId, spectating });
                    } else if (state === "error") {
                        trackEvent("socket_connect_error", { roomId, spectating });
                    }
                }}
                onGameEvent={(event, payload) => {
                    trackEvent("game_event", { event, roomId, spectating, ...payload });
                    if (spectating || connected) return;

                    if (event === "game_over" && !isLobby) {
                        updateGuestSessionStats({ losses: 1 });
                    }

                    if (event === "victory" && !isLobby) {
                        updateGuestSessionStats({
                            wins: 1,
                            totalEarnings: Number(payload.pot || 0),
                        });
                    }

                    if (event === "queued") {
                        setIsQueued(true);
                    }
                }}
                onEngineReady={(engine) => {
                    engineRef.current = engine;
                    engine.onStateUpdate = (state) => {
                        setGameState({ ...state });
                        setMyPlayerId(engine.myPlayerId);
                    };
                }}
            />

            {(connectionState === "connecting" || (connectionState === "error" && isTimedOut)) && (
                <div className="absolute inset-0 z-30 bg-white/60 backdrop-blur-md flex items-center justify-center px-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 max-w-md w-full text-center">
                        <h2 className="text-2xl font-serif font-bold text-vaiiya-indigo mb-3">
                            {connectionState === "error" || isTimedOut ? "Connection Failed" : "Connecting to Arena"}
                        </h2>
                        <p className="text-gray-500 text-sm font-medium mb-6">
                            {connectionState === "error" || isTimedOut
                                ? "Could not establish a stable socket connection."
                                : "Establishing real-time link to game server..."}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 rounded-full bg-vaiiya-orange text-white font-bold uppercase tracking-wider hover:bg-orange-600 transition-colors"
                            >
                                Retry
                            </button>
                            <button
                                onClick={() => router.push("/")}
                                className="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors"
                            >
                                Lobby
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UI Overlay: Top Left Info */}
            <div className="absolute top-6 left-6 z-10 bg-white/90 backdrop-blur-sm p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h2 className="text-xl font-bold text-vaiiya-indigo font-serif flex items-center gap-3">
                    DOTHAUS <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans tracking-wide ${isLobby ? "bg-purple-100 text-purple-700" : "bg-orange-100 text-vaiiya-orange"}`}>
                        {spectating ? "SPECTATING" : isLobby ? "PRACTICE" : "ELIMINATION"}
                    </span>
                </h2>
                <div className="mt-4 space-y-1">
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                        {isLobby ? "Current Mode" : "Room Pot"}
                    </p>
                    <p className="text-2xl font-bold text-vaiiya-indigo tracking-tight">
                        {isLobby ? (
                            <span className="text-purple-700">FREE PLAY</span>
                        ) : (
                            <>
                                {totalPot.toFixed(5)} <span className="text-xs text-vaiiya-orange ml-1">SOL</span>
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Queued State Overlay */}
            {isQueued && gameState.status === "ACTIVE" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 text-center bg-white/95 backdrop-blur-md p-10 rounded-[2rem] border border-gray-200 shadow-xl max-w-sm w-full">
                    <h2 className="text-xl font-bold text-vaiiya-indigo mb-2 uppercase tracking-wide">Queue Position Locked</h2>
                    <p className="text-gray-500 text-sm mb-6">You will enter the arena automatically when the next match begins.</p>
                    <div className="flex justify-center items-center gap-2">
                        <div className="w-2 h-2 bg-vaiiya-orange rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="w-2 h-2 bg-vaiiya-orange rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="w-2 h-2 bg-vaiiya-orange rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                    </div>
                </div>
            )}

            {/* Top Center: Match Status */}
            {gameState.status === "WAITING" && !isLobby && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center animate-pulse">
                    <h1 className="text-5xl md:text-6xl font-bold text-vaiiya-indigo font-serif mb-4 tracking-tight">WAITING FOR PLAYERS</h1>
                    <p className="text-vaiiya-orange tracking-widest font-bold text-xl">{playersCount} / 10 JOINED</p>
                    <div className="mt-12 bg-white/90 p-6 rounded-2xl inline-block text-xs text-gray-500 max-w-sm border border-gray-200 shadow-sm">
                        <p className="font-bold text-vaiiya-indigo mb-2 uppercase tracking-wide">Elimination Rules</p>
                        Last player standing wins the pot. <br /> Use [SPACE] to split and [W] to eject mass.
                    </div>
                </div>
            )}

            {gameState.status === "STARTING" && !isLobby && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
                    <h1 className="text-9xl font-black text-vaiiya-orange animate-bounce">{gameState.countdown}</h1>
                    <p className="text-vaiiya-indigo tracking-widest mt-8 font-bold text-2xl uppercase">Prepare for Battle</p>
                </div>
            )}

            {gameState.status === "ENDED" && !isLobby && !spectating && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center bg-white p-12 md:p-16 rounded-[2.5rem] border border-gray-100 shadow-2xl w-[90%] md:w-auto">
                    <h2 className="text-xs text-gray-400 uppercase tracking-widest font-bold mb-4">Match Complete</h2>
                    <h1 className="text-5xl md:text-6xl font-bold text-vaiiya-indigo font-serif mb-4 tracking-tight uppercase">
                        {amIWinner ? 'Victory' : 'Game Over'}
                    </h1>
                    <p className="text-gray-500 text-lg mb-10 uppercase tracking-wider font-bold">
                        Winner: <span className="text-vaiiya-indigo">{gameState.winnerName || 'Unknown'}</span>
                    </p>
                    <div className="p-8 bg-orange-50/50 rounded-3xl border border-orange-100 mb-10 md:px-16">
                        <p className="text-xs text-vaiiya-orange mb-2 uppercase tracking-widest font-bold">Total Pot Payout</p>
                        <p className="text-4xl font-bold text-vaiiya-indigo">{winnerPayout.toFixed(5)} <span className="text-sm ml-1 text-gray-500">SOL</span></p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-vaiiya-orange text-white justify-center rounded-full text-lg font-bold uppercase tracking-wider hover:bg-orange-600 transition-all active:scale-95 shadow-sm"
                    >
                        Join Next Match
                    </button>
                </div>
            )}

            {/* Right Side: Players List */}
            <div className="absolute top-6 right-6 z-10 bg-white/90 p-4 rounded-xl w-56 border border-gray-100 shadow-sm backdrop-blur-sm">
                <h3 className="text-xs font-bold text-gray-400 font-sans mb-4 uppercase tracking-widest border-b border-gray-100 pb-2">Arena Status</h3>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-gray-400 uppercase tracking-wide mb-1">
                        <span>Player</span>
                        <span>Mass</span>
                    </div>
                    {Object.values(gameState.players)
                        .sort((a, b) => (b.totalMass || 0) - (a.totalMass || 0))
                        .map((p, i) => (
                            <div key={p.id} className={`flex justify-between items-center text-xs ${i === 0 ? 'text-vaiiya-indigo font-bold' : 'text-gray-600 font-medium'}`}>
                                <span className="truncate max-w-[120px] flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                                    {p.name}
                                </span>
                                <span className="font-mono text-gray-500">{Math.floor(p.totalMass || 0)}</span>
                            </div>
                        ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    <span>Alive</span>
                    <span className="text-vaiiya-indigo">{playersCount}</span>
                </div>
            </div>

            {!spectating && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 md:hidden flex items-center gap-3">
                    <button
                        onClick={() => engineRef.current?.emitSplit()}
                        className="px-6 py-3 rounded-full bg-vaiiya-orange text-white font-bold text-sm uppercase tracking-wider shadow-sm"
                    >
                        Split
                    </button>
                    <button
                        onClick={() => engineRef.current?.emitEject()}
                        className="px-6 py-3 rounded-full bg-vaiiya-indigo text-white font-bold text-sm uppercase tracking-wider shadow-sm"
                    >
                        Eject
                    </button>
                </div>
            )}

            {!spectating && (
                <p className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-[10px] text-gray-400 md:hidden uppercase tracking-widest font-bold">
                    Drag on screen to steer
                </p>
            )}
        </div>
    );
}

export default function PlayPage() {
    return (
        <Suspense fallback={<div className="text-vaiiya-indigo flex items-center justify-center h-screen font-serif tracking-widest animate-pulse">Initializing Arena...</div>}>
            <PlayContent />
        </Suspense>
    );
}
