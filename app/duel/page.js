"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDeck, pickRoundCardIds } from "@/lib/decks";
import { getDuelLadder } from "@/lib/duelLadder";
import { effectiveDeckId } from "@/lib/activeDeck";
import { useActiveUsers, presenceLabel } from "@/lib/presence";
import Header from "@/components/Header";
import Leaderboard from "@/components/Leaderboard";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/components/AuthProvider";
import { useDuel } from "@/components/DuelProvider";

export default function Duel() {
  return (
    <AuthGate>
      <DuelContent />
    </AuthGate>
  );
}

function DuelContent() {
  const { roster } = useAuth();
  const { sendChallenge, outgoing } = useDuel();
  const [deckId] = useState(() => effectiveDeckId(roster));
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ladder, setLadder] = useState([]);

  useEffect(() => {
    if (!deckId) {
      setLoading(false);
      return;
    }
    let active = true;
    getDeck(deckId).then((d) => {
      if (active) {
        setDeck(d);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [deckId]);

  useEffect(() => {
    if (!deckId) return;
    getDuelLadder(deckId).then(setLadder);
  }, [deckId]);

  // Presence must still be called every render regardless of loading state,
  // per the Rules of Hooks -- deckId may be null briefly, the hook itself
  // guards against that internally.
  const users = useActiveUsers(deckId, roster);
  const others = users.filter((u) => u.email !== roster.email);

  const [groupId, setGroupId] = useState(null);

  if (loading) {
    return (
      <main className="min-h-dvh bg-green-dark flex items-center justify-center">
        <Header />
      </main>
    );
  }

  if (!deck) {
    return (
      <main className="min-h-dvh bg-green-dark flex flex-col items-center justify-center gap-4 px-6 text-center">
        <Header />
        <p className="text-off-white text-sm max-w-xs">
          Pick a deck first from "Choose Your Deck" on the home page.
        </p>
        <Link href="/" className="text-sm underline text-off-white">Go there now</Link>
      </main>
    );
  }

  const eligibleGroups = (deck.groups || []).filter(
    (g) => deck.cards.filter((c) => c.groupId === g.id).length >= 2
  );
  const chosenGroup = eligibleGroups.find((g) => g.id === groupId);

  function challenge(user) {
    if (outgoing) return; // already waiting on someone else
    const cardIds = pickRoundCardIds(deck, groupId);
    sendChallenge(user, deckId, cardIds, chosenGroup?.name);
  }

  const ladderRows = ladder.map((r) => ({
    name: r.email === roster.email ? "You" : r.name,
    display: `#${r.rank}`,
  }));

  return (
    <main className="min-h-dvh bg-green-dark flex flex-col items-center justify-center gap-8 px-6 py-16">
      <Header />
      <div className="text-center">
        <p className="text-sm text-off-white">{deck.name}</p>
        <h1 className="text-2xl font-medium mt-1 text-off-white">Duel</h1>
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-off-white/80">
          {ladderRows.length > 0 ? "Beat the top of the ladder to take their spot" : "No duels yet -- be the first"}
        </p>
        {ladderRows.length > 0 && <Leaderboard title="Duel ladder" rows={ladderRows} />}
      </div>

      {!groupId ? (
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-lg font-medium text-off-white">Choose a category to duel in</h2>
          {eligibleGroups.length === 0 ? (
            <p className="text-off-white text-sm max-w-xs text-center">
              No category has enough cards yet. Add a few more cards to a group in Manage decks.
            </p>
          ) : (
            <div className="flex gap-3 flex-wrap justify-center">
              {eligibleGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  className="px-4 py-2 rounded-lg bg-off-white text-blue text-sm"
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="text-center">
            <h2 className="text-lg font-medium text-off-white">Who's active</h2>
            <p className="text-xs text-off-white/70">Category: {chosenGroup?.name}</p>
          </div>

          {others.length === 0 ? (
            <p className="text-off-white text-sm max-w-xs text-center">
              Nobody else is active in this deck right now. Once a classmate opens the app, they'll show up here.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              {others.map((u) => (
                <button
                  key={u.email}
                  onClick={() => challenge(u)}
                  disabled={!!outgoing}
                  className="rounded-lg bg-off-white text-blue text-sm px-3 py-4 text-center disabled:opacity-50"
                >
                  {presenceLabel(u)} is active
                </button>
              ))}
            </div>
          )}

          <button onClick={() => setGroupId(null)} className="text-sm underline text-off-white">
            Change category
          </button>
        </div>
      )}
    </main>
  );
}
