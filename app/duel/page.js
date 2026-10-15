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
  // The person whose card was clicked (an email), and the category picked for
  // that challenge. Both reset whenever the pop-up closes.
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [groupId, setGroupId] = useState(null);

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
    let active = true;
    getDuelLadder(deckId).then((rows) => {
      if (active) setLadder(rows);
    });
    return () => {
      active = false;
    };
  }, [deckId]);

  // Every hook is above the early returns below (Rules of Hooks).
  const users = useActiveUsers(deckId, roster);

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

  const others = users.filter((u) => u.email !== roster.email);
  const selectedUser = others.find((u) => u.email === selectedEmail) || null;

  const eligibleGroups = (deck.groups || []).filter(
    (g) => deck.cards.filter((c) => c.groupId === g.id).length >= 2
  );
  const chosenGroup = eligibleGroups.find((g) => g.id === groupId);
  const canChallenge = !!selectedUser && !!chosenGroup && !outgoing;

  function openChallenge(user) {
    setGroupId(null);
    setSelectedEmail(user.email);
  }

  function closeChallenge() {
    setSelectedEmail(null);
    setGroupId(null);
  }

  function sendIt() {
    if (!canChallenge) return;
    sendChallenge(selectedUser, deckId, pickRoundCardIds(deck, groupId), chosenGroup.name);
    closeChallenge();
  }

  const ladderRows = ladder.map((r) => ({
    key: r.email,
    name: r.email === roster.email ? `${r.name} (you)` : r.name,
    display: "",
    isYou: r.email === roster.email,
  }));

  return (
    <main className="min-h-dvh bg-green-dark flex flex-col items-center gap-8 px-6 py-20">
      <Header />
      <div className="text-center">
        <p className="text-sm text-off-white">{deck.name}</p>
        <h1 className="text-2xl font-medium mt-1 text-off-white">Duel</h1>
      </div>

      <div className="flex flex-col items-center gap-2 w-full">
        <p className="text-xs text-off-white/80">Beat someone above you to take their spot</p>
        <Leaderboard
          title="Duel ladder"
          rows={ladderRows}
          emptyMessage="No duels yet -- be the first"
        />
      </div>

      <div className="flex flex-col items-center gap-4">
        <h2 className="text-lg font-medium text-off-white">Who's active</h2>
        {others.length === 0 ? (
          <p className="text-off-white text-sm max-w-xs text-center">
            Nobody else is active in this deck right now. Once a classmate opens the app, they'll show up here.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 max-w-xl">
            {others.map((u) => (
              <button
                key={u.email}
                onClick={() => openChallenge(u)}
                className="rounded-lg bg-off-white text-blue text-sm px-3 py-4 text-center"
              >
                {presenceLabel(u)} is active
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedEmail && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 px-6">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-off-white rounded-xl p-6 max-w-xs w-full text-center"
          >
            {selectedUser ? (
              <p className="text-blue font-medium mb-1">
                Duel {presenceLabel(selectedUser)}?
              </p>
            ) : (
              <p className="text-red text-sm mb-1">This student is no longer active.</p>
            )}
            <p className="text-blue text-sm mb-3">Choose a category:</p>

            {eligibleGroups.length === 0 ? (
              <p className="text-blue text-sm mb-4">
                No category has enough cards yet. Add a few more cards to a group in Manage decks.
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap justify-center mb-4">
                {eligibleGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setGroupId(g.id)}
                    className={`px-3 py-2 rounded-lg text-sm border border-blue ${
                      g.id === groupId ? "bg-blue text-off-white" : "bg-white text-blue"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={sendIt}
                disabled={!canChallenge}
                className={`w-full px-4 py-3 rounded-lg text-sm border ${
                  canChallenge
                    ? "bg-green-light text-green-dark border-green-light font-medium"
                    : "bg-white text-blue border-blue opacity-60 cursor-not-allowed"
                }`}
              >
                Challenge {selectedUser ? presenceLabel(selectedUser) : "this student"} to a Duel
              </button>
              <button
                onClick={closeChallenge}
                className="w-full px-4 py-2 rounded-lg text-sm border border-blue text-blue"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
