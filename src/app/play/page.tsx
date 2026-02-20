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

    const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
    const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
    const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "error">("connecting");
    const [isTimedOut, setIsTimedOut] = useState(false);

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
        <div className="w-screen h-screen overflow-hidden bg-deep-space relative font-sans">
            <GameCanvas
                roomId={roomId}
                spectating={spectating}
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
                <div className="absolute inset-0 z-30 bg-deep-space/80 backdrop-blur-md flex items-center justify-center px-6">
                    <div className="glass-panel rounded-2xl border border-white/10 p-8 max-w-md w-full text-center">
                        <h2 className="text-2xl font-heading font-black mb-3">
                            {connectionState === "error" || isTimedOut ? "Connection Failed" : "Connecting to Arena"}
                        </h2>
                        <p className="text-starlight/70 text-sm mb-6">
                            {connectionState === "error" || isTimedOut
                                ? "Could not establish a stable socket connection."
                                : "Establishing real-time link to game server..."}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 py-3 rounded-lg bg-neon-blue text-deep-space font-black uppercase tracking-wider"
                            >
                                Retry
                            </button>
                            <button
                                onClick={() => router.push("/")}
                                className="flex-1 py-3 rounded-lg border border-white/20 text-white font-bold uppercase tracking-wider"
                            >
                                Lobby
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UI Overlay: Top Left Info */}
            <div className="absolute top-6 left-6 z-10 glass-panel p-6 rounded-2xl border border-white/10 shadow-2xl">
                <h2 className="text-xl font-bold text-white font-heading flex items-center gap-3">
                    DOTHAUS <span className={`text-[10px] px-2 py-0.5 rounded border ${isLobby ? "bg-plasma-purple/10 text-plasma-purple border-plasma-purple/20" : "bg-neon-blue/10 text-neon-blue border-neon-blue/20"}`}>
                        {spectating ? "SPECTATING" : isLobby ? "PRACTICE" : "ELIMINATION"}
                    </span>
                </h2>
                <div className="mt-4 space-y-1">
                    <p className="text-[10px] text-starlight/40 uppercase tracking-[0.2em] font-black">
                        {isLobby ? "Current Mode" : "Room Pot"}
                    </p>
                    <p className="text-2xl font-black text-white font-heading italic tracking-tight">
                        {isLobby ? (
                            <span className="text-plasma-purple">FREE PLAY</span>
                        ) : (
                            <>
                                {totalPot.toFixed(2)} <span className="text-xs text-neon-blue not-italic ml-1">USDC</span>
                            </>
                        )}
                    </p>
                </div>
            </div>

            {/* Top Center: Match Status */}
            {gameState.status === "WAITING" && !isLobby && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center animate-pulse">
                    <h1 className="text-5xl md:text-6xl font-black text-white font-heading mb-4 italic tracking-tighter">WAITING FOR PLAYERS</h1>
                    <p className="text-neon-blue tracking-[0.3em] font-bold text-xl">{playersCount} / 10 JOINED</p>
                    <div className="mt-12 glass-panel p-6 rounded-2xl inline-block text-xs text-starlight/60 max-w-sm border border-white/5 backdrop-blur-xl">
                        <p className="font-bold text-white mb-2 uppercase tracking-widest">Elimination Rules</p>
                        Last player standing wins the pot. <br /> Use [SPACE] to split and [W] to eject mass.
                    </div>
                </div>
            )}

            {gameState.status === "STARTING" && !isLobby && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
                    <h1 className="text-9xl font-black text-neon-blue font-heading animate-bounce neon-text italic italic">{gameState.countdown}</h1>
                    <p className="text-white tracking-[0.6em] mt-8 font-black text-2xl uppercase">Prepare for Battle</p>
                </div>
            )}

            {gameState.status === "ENDED" && !isLobby && !spectating && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center glass-panel p-16 rounded-[2.5rem] border border-white/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    <h2 className="text-xs text-neon-blue uppercase tracking-[0.5em] font-black mb-4">Match Complete</h2>
                    <h1 className="text-6xl font-black text-white font-heading mb-4 italic tracking-tighter uppercase">
                        {amIWinner ? 'Victory' : 'Game Over'}
                    </h1>
                    <p className="text-starlight/60 text-lg mb-10 uppercase tracking-[0.2em] font-bold">
                        Winner: <span className="text-white">{gameState.winnerName || 'Unknown'}</span>
                    </p>
                    <div className="p-8 bg-white/5 rounded-2xl border border-white/10 mb-10 px-16">
                        <p className="text-xs text-starlight/50 mb-2 uppercase tracking-widest font-black">Total Pot Payout</p>
                        <p className="text-4xl font-black text-neon-blue italic">{winnerPayout.toFixed(2)} <span className="text-sm not-italic ml-1">USDC</span></p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full py-4 bg-neon-blue text-deep-space rounded-xl text-lg font-black uppercase tracking-[0.2em] hover:bg-white hover:shadow-[0_0_30px_rgba(0,243,255,0.5)] transition-all active:scale-95"
                    >
                        Join Next Match
                    </button>
                </div>
            )}

            {/* Right Side: Players List */}
            <div className="absolute top-6 right-6 z-10 glass-panel p-4 rounded-xl w-56 border border-white/10">
                <h3 className="text-xs font-bold text-neon-blue font-heading mb-4 uppercase tracking-widest border-b border-white/10 pb-2">Arena Status</h3>
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] text-starlight/50 uppercase tracking-tighter mb-1">
                        <span>Player</span>
                        <span>Mass</span>
                    </div>
                    {Object.values(gameState.players)
                        .sort((a, b) => (b.totalMass || 0) - (a.totalMass || 0))
                        .map((p, i) => (
                            <div key={p.id} className={`flex justify-between items-center text-xs ${i === 0 ? 'text-neon-blue font-bold' : 'text-white/80'}`}>
                                <span className="truncate max-w-[120px] flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                                    {p.name}
                                </span>
                                <span className="font-mono">{Math.floor(p.totalMass || 0)}</span>
                            </div>
                        ))}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-starlight/40 font-bold uppercase tracking-widest">
                    <span>Alive</span>
                    <span className="text-white">{playersCount}</span>
                </div>
            </div>

            {!spectating && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 md:hidden flex items-center gap-3">
                <button
                    onClick={() => engineRef.current?.emitSplit()}
                    className="px-5 py-3 rounded-xl bg-neon-blue text-deep-space font-black text-sm uppercase tracking-wider"
                >
                    Split
                </button>
                <button
                    onClick={() => engineRef.current?.emitEject()}
                    className="px-5 py-3 rounded-xl bg-plasma-purple text-white font-black text-sm uppercase tracking-wider"
                >
                    Eject
                </button>
            </div>
            )}

            {!spectating && (
            <p className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 text-[10px] text-starlight/50 md:hidden uppercase tracking-widest">
                Drag on screen to steer
            </p>
            )}
        </div>
    );
}

export default function PlayPage() {
    return (
        <Suspense fallback={<div className="text-white flex items-center justify-center h-screen font-heading tracking-widest animate-pulse">Initializing Neural Link...</div>}>
            <PlayContent />
        </Suspense>
    );
}
