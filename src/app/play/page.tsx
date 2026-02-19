"use client";

import { GameCanvas } from "@/components/game/GameCanvas";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PlayContent() {
    const searchParams = useSearchParams();
    const roomId = searchParams.get("room") || "1"; // Default to room 1

    return (
        <div className="w-screen h-screen overflow-hidden bg-deep-space relative">
            <GameCanvas roomId={roomId} />

            {/* UI Overlay */}
            <div className="absolute top-4 left-4 z-10 glass-panel p-4 rounded-xl">
                <h2 className="text-xl font-bold text-white font-heading">
                    SOLAR.IO <span className="text-neon-blue text-xs align-top">BETA</span>
                </h2>
                <div className="mt-2 text-sm text-starlight/70">
                    <p>Score: <span className="text-white font-bold">100</span></p>
                    <p>Rank: <span className="text-white font-bold">#1</span></p>
                </div>
            </div>

            {/* Top Right Leaderboard */}
            <div className="absolute top-4 right-4 z-10 glass-panel p-4 rounded-xl w-48">
                <h3 className="text-sm font-bold text-neon-blue font-heading mb-2 uppercase tracking-wider">Leaderboard</h3>
                <ol className="text-xs space-y-1">
                    <li className="flex justify-between text-white font-bold"><span>1. You</span> <span>100</span></li>
                    <li className="flex justify-between text-starlight/70"><span>2. Enemy</span> <span>90</span></li>
                </ol>
            </div>
        </div>
    );
}

export default function PlayPage() {
    return (
        <Suspense fallback={<div className="text-white">Loading...</div>}>
            <PlayContent />
        </Suspense>
    );
}
