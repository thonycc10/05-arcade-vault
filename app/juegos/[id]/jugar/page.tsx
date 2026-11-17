import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { GamePlayer } from "@/components/game-player";
import { GAMES } from "@/lib/data";

export function generateStaticParams() {
  return GAMES.map((g) => ({ id: g.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/juegos/[id]/jugar">): Promise<Metadata> {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  return game ? { title: `Jugar ${game.title}` } : {};
}

export default function PlayPage({ params }: PageProps<"/juegos/[id]/jugar">) {
  return (
    <Suspense
      fallback={
        <div
          className="pixel neon-cyan"
          style={{ padding: 80, textAlign: "center", fontSize: 12 }}
        >
          CARGANDO<span className="blink">_</span>
        </div>
      }
    >
      <Player params={params} />
    </Suspense>
  );
}

async function Player({
  params,
}: {
  params: PageProps<"/juegos/[id]/jugar">["params"];
}) {
  const { id } = await params;
  const game = GAMES.find((g) => g.id === id);
  if (!game) notFound();

  return <GamePlayer game={game} />;
}
