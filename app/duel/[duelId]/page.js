"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDeck } from "@/lib/decks";
import { getDuelLadder, recordDuelResult } from "@/lib/duelLadder";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import MatchingBoard from "@/components/MatchingBoard";
import Leaderboard from "@/components/Leaderboard";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/components/AuthProvider";

export default function DuelMatch() {
  return (
    <AuthGate>
      <Suspense fallback={null}>
        <DuelMatchContent />
      </Suspense>
    </AuthGate>
  );
}

function DuelMatchContent() {
  const { duelId } = useParams();
  const searchParams = useSearchParams();
  const { roster } = useAuth();

  const deckId = searchParams.get("deckId");
  const cardIds = (searchParams.get("cards") || "").split(",").filter(Boolean);
  const opponentEmail = searchParams.get("opponentEmail") || "";
  const opponentName = searchParams.get("opponentName") || "your opponent";

  const [cards, setCards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null); // null | "you" | "opponent"
  const channelRef = useRef(null);
  const recordedRef = useRef(false);
  const [ladder, setLadder] = useState(null); // null until fetched
  const [recordError, setRecordError] = useState(false);

  function refreshLadder() {
    if (!deckId) return;
    getDuelLadder(deckId).then(setLadder).catch(console.error);
  }

  useEffect(() => {
    if (!deckId) {
      setLoading(false);
      return;
    }
    getDeck(deckId).then((d) => {
      if (d) {
        setCards(cardIds.map((id) => d.cards.find((c) => c.id === id)).filter(Boolean));
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Opponent finishing first is the only way to lose -- listen for it.
  useEffect(() => {
    if (!duelId) return;
    const supabase = createClient();
    const channel = supabase.channel(`duel:${duelId}`);
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "finished" }, ({ payload }) => {
        if (payload.email !== roster.email) {
          setResult((prev) => prev || "opponent");
        }
      })
      .on("broadcast", { event: "recorded" }, () => {
        // The winner has saved the result; the ladder is now up to date.
        refreshLadder();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duelId]);

  function handleResult(allCorrect) {
    if (!allCorrect || result) return;
    setResult("you");
    channelRef.current?.send({ type: "broadcast", event: "finished", payload: { email: roster.email } });
    // Only the winner records the result -- avoids both sides racing to
    // write conflicting rows for the same duel.
    if (!recordedRef.current && opponentEmail) {
      recordedRef.current = true;
      recordDuelResult(deckId, { email: roster.email, name: roster.name }, { email: opponentEmail, name: opponentName })
        .then(() => {
          refreshLadder();
          channelRef.current?.send({ type: "broadcast", event: "recorded", payload: {} });
        })
        .catch((err) => {
          console.error("Failed to record duel result:", err);
          setRecordError(true);
        });
    }
  }

  // The loser also gets a fallback fetch in case the "recorded" message is missed.
  useEffect(() => {
    if (result !== "opponent") return;
    const t = setTimeout(refreshLadder, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-green-dark flex items-center justify-center">
        <Header />
      </main>
    );
  }

  if (!cards || cards.length === 0) {
    return (
      <main className="min-h-dvh bg-green-dark flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Header />
        <p className="text-off-white text-sm">This duel link isn't valid.</p>
        <Link href="/duel" className="text-sm underline text-off-white">Back to Duel</Link>
      </main>
    );
  }

  if (result) {
    const rows = (ladder || []).map((r) => ({
      key: r.email,
      name: r.email === roster.email ? `${r.name} (you)` : r.name,
      display: `#${r.rank}`,
      isYou: r.email === roster.email,
    }));

    return (
      <main className="min-h-dvh bg-green-dark flex flex-col items-center justify-center gap-6 px-6 text-center">
        <Header />
        <h1 className="text-3xl font-medium text-off-white">
          {result === "you" ? "You won!" : `${opponentName} won this time`}
        </h1>
        {recordError && (
          <p className="text-pink text-sm max-w-xs">
            Your win couldn't be saved to the ladder. Tell your teacher.
          </p>
        )}
        <Leaderboard
          title="Duel ladder"
          rows={rows}
          emptyMessage={ladder === null ? "Updating the ladder..." : "No duels yet"}
        />
        <Link href="/duel" className="text-sm underline text-off-white mt-2">Back to Duel</Link>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-green-dark flex flex-col items-center justify-center gap-4 px-4 py-8 overflow-hidden">
      <Header />
      <p className="text-sm text-off-white">Racing against {opponentName}</p>
      <MatchingBoard cards={cards} onResult={handleResult} disabled={!!result} />
    </main>
  );
}
