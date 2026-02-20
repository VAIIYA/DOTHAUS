"use client";

import { RoomCard } from "./RoomCard";

import { useRouter } from "next/navigation";

// Mock data for rooms
const ROOMS = [
    { id: "0", name: "PRACICE ARENA", price: 0, players: 12, maxPlayers: 50, status: "OPEN", isLobby: true },
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
        <section id="rooms" className="py-20 px-6 relative z-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 text-center">
                    <h2 className="text-5xl md:text-7xl font-black italic font-heading mb-6 text-white tracking-tighter">
                        BATTLE <span className="text-neon-blue neon-text">ARENAS</span>
                    </h2>
                    <p className="text-starlight/60 max-w-2xl mx-auto text-lg md:text-xl font-light">
                        Select your stake. Winner takes the pot (minus 5% house fee).
                        <br />
                        <span className="text-plasma-purple font-bold">New: Practice Arena is now open for free play!</span>
                    </p>
                </div>

                {/* Lobby Room - Featured */}
                <div className="mb-12">
                    {ROOMS.filter(r => r.id === "0").map(room => (
                        <RoomCard
                            key={room.id}
                            {...room}
                            status={room.status as "OPEN" | "FULL" | "PLAYING"}
                            onJoin={handleJoin}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-10">
                    {ROOMS.filter(r => r.id !== "0").map((room) => (
                        <RoomCard
                            key={room.id}
                            {...room}
                            status={room.status as "OPEN" | "FULL" | "PLAYING"}
                            onJoin={handleJoin}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
