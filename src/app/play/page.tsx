"use client";

import { GameCanvas } from "@/components/game/GameCanvas";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { GameState, INITIAL_STATE } from "@/lib/game/GameState";

function PlayContent() {
    const searchParams = useSearchParams();
    const roomId = searchParams.get("room") || "1";
    const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);

    const playersCount = Object.keys(gameState.players).length;

    return (
        <div className="w-screen h-screen overflow-hidden bg-deep-space relative font-sans">
            <GameCanvas
                roomId={roomId}
                onEngineReady={(engine) => {
                    engine.onStateUpdate = (state) => setGameState({ ...state });
                }}
            />

            {/* UI Overlay: Top Left Info */}
            <div className="absolute top-6 left-6 z-10 glass-panel p-4 rounded-xl border border-white/10">
                <h2 className="text-xl font-bold text-white font-heading flex items-center gap-2">
                    DOTHAUS <span className="text-neon-blue text-[10px] bg-neon-blue/10 px-1.5 py-0.5 rounded border border-neon-blue/20">ELIMINATION</span>
                </h2>
                <div className="mt-3 space-y-1">
                    <p className="text-xs text-starlight/60 uppercase tracking-widest font-bold">Room Pot</p>
                    <p className="text-2xl font-bold text-white font-heading">
                        {(playersCount * 0.1).toFixed(2)} <span className="text-xs text-neon-blue">USDC</span>
                    </p>
                </div>
            </div>

            {/* Top Center: Match Status */}
            {gameState.status === "WAITING" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center animate-pulse">
                    <h1 className="text-4xl font-bold text-white font-heading mb-2">WAITING FOR PLAYERS</h1>
                    <p className="text-neon-blue tracking-[0.2em]">{playersCount} / 10 JOINED</p>
                    <div className="mt-8 glass-panel p-4 inline-block text-xs text-starlight/50 max-w-xs">
                        Elimination rules: Last player standing wins the pot. Use [SPACE] to split and [W] to eject mass.
                    </div>
                </div>
            )}

            {gameState.status === "STARTING" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
                    <h1 className="text-7xl font-bold text-neon-blue font-heading animate-bounce">{gameState.countdown}</h1>
                    <p className="text-white tracking-[0.5em] mt-4 font-bold">PREPARE FOR BATTLE</p>
                </div>
            )}

            {gameState.status === "ENDED" && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center glass-panel p-12 rounded-3xl border border-white/20">
                    <h2 className="text-xs text-neon-blue uppercase tracking-[0.3em] font-bold mb-2">Match Complete</h2>
                    <h1 className="text-4xl font-bold text-white font-heading mb-2 italic">
                        {gameState.winnerName === gameState.players[gameState.winnerName || '']?.name ? 'VICTORY' : 'GAME OVER'}
                    </h1>
                    <p className="text-starlight text-sm mb-6 uppercase tracking-widest font-bold">
                        Winner: <span className="text-white">{gameState.winnerName || 'Unknown'}</span>
                    </p>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-8 px-12">
                        <p className="text-xs text-starlight/50 mb-1">Total Pot Payout</p>
                        <p className="text-2xl font-bold text-neon-green">{(playersCount * 0.1 * 0.95).toFixed(2)} USDC</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-neon px-8 py-3 rounded-full text-sm font-bold"
                    >
                        JOIN NEXT MATCH
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
