"use client";

import { RoomCard } from "./RoomCard";

import { useRouter } from "next/navigation";

// Mock data for rooms
const ROOMS = [
    { id: "1", price: 0.1, players: 3, maxPlayers: 10, status: "OPEN" },
    { id: "2", price: 0.5, players: 8, maxPlayers: 10, status: "OPEN" },
    { id: "3", price: 1, players: 10, maxPlayers: 10, status: "FULL" },
    { id: "4", price: 2, players: 1, maxPlayers: 10, status: "OPEN" },
    { id: "5", price: 5, players: 0, maxPlayers: 10, status: "OPEN" },
    { id: "6", price: 10, players: 5, maxPlayers: 10, status: "OPEN" },
    { id: "7", price: 25, players: 9, maxPlayers: 10, status: "OPEN" },
    { id: "8", price: 50, players: 0, maxPlayers: 10, status: "OPEN" },
] as const;

export const RoomList = () => {
    const router = useRouter();

    const handleJoin = (roomId: string, price: number) => {
        console.log(`Joining room ${roomId} for ${price} USDC`);
        // TODO: Trigger Solana transaction logic here first
        router.push(`/play?room=${roomId}`);
    };

    return (
        <section id="rooms" className="py-10 px-6 relative z-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12 text-center">
                    <h2 className="text-4xl md:text-5xl font-black italic font-heading mb-4 text-white">
                        BATTLE <span className="text-neon-blue">ARENAS</span>
                    </h2>
                    <p className="text-starlight/60 max-w-xl mx-auto">
                        Select your stake. Winner takes the pot (minus 5% house fee).
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {ROOMS.map((room) => (
                        <RoomCard
                            key={room.id}
                            {...room}
                            status={room.status}
                            onJoin={handleJoin}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
