"use client";

import { GameCanvas } from "@/components/game/GameCanvas";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { GameState, INITIAL_STATE } from "@/lib/game/GameState";
import { GAME_CONFIG, ROOM_BY_ID } from "@/config/game-config";

function PlayContent() {
    const searchParams = useSearchParams();
    const roomId = searchParams.get("room") || "1";
    const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
    const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

    const isLobby = roomId === "0";
    const playersCount = Object.keys(gameState.players).length;
    const roomPrice = ROOM_BY_ID[roomId]?.price ?? ROOM_BY_ID["1"]?.price ?? 0.1;
    const totalPot = playersCount * roomPrice;
    const winnerPayout = totalPot * (1 - GAME_CONFIG.houseFeeRate);
    const amIWinner = !!myPlayerId && gameState.winnerName === gameState.players[myPlayerId]?.name;

    return (
        <div className="w-screen h-screen overflow-hidden bg-deep-space relative font-sans">
            <GameCanvas
                roomId={roomId}
                onEngineReady={(engine) => {
                    engine.onStateUpdate = (state) => {
                        setGameState({ ...state });
                        setMyPlayerId(engine.myPlayerId);
                    };
                }}
            />

            {/* UI Overlay: Top Left Info */}
            <div className="absolute top-6 left-6 z-10 glass-panel p-6 rounded-2xl border border-white/10 shadow-2xl">
                <h2 className="text-xl font-bold text-white font-heading flex items-center gap-3">
                    DOTHAUS <span className={`text-[10px] px-2 py-0.5 rounded border ${isLobby ? "bg-plasma-purple/10 text-plasma-purple border-plasma-purple/20" : "bg-neon-blue/10 text-neon-blue border-neon-blue/20"}`}>
                        {isLobby ? "PRACTICE" : "ELIMINATION"}
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

            {gameState.status === "ENDED" && !isLobby && (
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
