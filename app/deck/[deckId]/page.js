"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getDeck } from "@/lib/decks";
import { setActiveDeckId } from "@/lib/activeDeck";
import Header from "@/components/Header";
import AuthGate from "@/components/AuthGate";
import { useAuth } from "@/components/AuthProvider";
import ActiveUsersList from "@/components/ActiveUsersList";

const ENTRANCES = [
  { href: "/daily", label: "The Daily Card" },
  { href: "/practice", label: "Mastery" },
  { href: "/duel", label: "Duel" },
];

const cardShadow = "5px 0 2px 0 var(--color-green-dark)";

// Builds one ordered list: [left half of the deck] + [3 entrances] + [right
// half], with the entrances landing exactly in the middle. If the deck has
// an odd number of cards, the right side gets the extra one, per the
// decision to just pick a side rather than leave it ambiguous. Both the
// desktop fan and the mobile swipe-through use this same order, so the
// entrances land "in the middle" of the mobile sequence too.
function buildSequence(deck) {
  const leftCount = Math.floor(deck.cards.length / 2);
  const left = deck.cards.slice(0, leftCount).map((c) => ({ type: "card", key: c.id, card: c }));
  const right = deck.cards.slice(leftCount).map((c) => ({ type: "card", key: c.id, card: c }));
  const entrances = ENTRANCES.map((e) => ({ type: "entrance", key: e.href, entrance: e }));
  return [...entrances, ...left, ...right];
}

// Angle (in degrees) between each pair of neighboring cards. Any gap that
// touches an entrance card is wider, so the three entrances sit visibly
// more spread out than the rest of the deck.
const BASE_GAP_DEG = 4.5;
const WIDE_GAP_DEG = 11;
// How far below the cards the fan's pivot point sits. Larger = flatter,
// gentler curve; smaller = a more dramatic, tighter arc.
const PIVOT_DISTANCE = 900;

function computeThetas(sequence) {
  const gaps = sequence.slice(0, -1).map((item, i) => {
    const next = sequence[i + 1];
    return item.type === "entrance" || next.type === "entrance" ? WIDE_GAP_DEG : BASE_GAP_DEG;
  });
  const cum = [0];
  gaps.forEach((g) => cum.push(cum[cum.length - 1] + g));
  const total = cum[cum.length - 1];
  return cum.map((c) => c - total / 2);
}

export default function DeckPage() {
  return (
    <AuthGate>
      <DeckPageContent />
    </AuthGate>
  );
}

function DeckPageContent() {
  const { deckId } = useParams();
  const { roster } = useAuth();
  const [hoveredKey, setHoveredKey] = useState(null);
  const [flipped, setFlipped] = useState(() => new Set());
  const [deck, setDeck] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  // Remember this as "the deck I'm currently in" -- matters for admins,
  // since Daily/Mastery/Duel need to know which deck to use when an admin
  // manages more than one. Harmless no-op for students.
  useEffect(() => {
    setActiveDeckId(deckId);
  }, [deckId]);

  if (loading) {
    return (
      <main className="min-h-dvh bg-green-dark flex items-center justify-center">
        <Header />
      </main>
    );
  }

  if (!deck) {
    return (
      <main className="min-h-dvh bg-green-dark flex items-center justify-center px-6 text-center">
        <Header />
        <p className="text-off-white text-sm">
          That deck doesn't exist. <Link href="/" className="underline">Go back</Link>
        </p>
      </main>
    );
  }

  const sequence = buildSequence(deck);
  const thetas = computeThetas(sequence);

  function toggleFlip(cardId) {
    setFlipped((prev) => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }

  return (
    <main className="min-h-dvh bg-green-dark flex flex-col items-center justify-center gap-6 sm:gap-10 px-6 py-12 sm:py-24 relative overflow-hidden">
      <Header />

      <ActiveUsersList deckId={deckId} deckName={deck.name} me={roster} />

      <div className="hidden sm:block w-full overflow-x-auto">
        <div className="relative mx-auto" style={{ width: "100%", maxWidth: 1100, height: 420 }}>
          {sequence.map((item, i) => {
            const theta = thetas[i];
            const isHovered = hoveredKey === item.key;
            // Cards nearer the center (smaller |theta|) sit visually on top.
            const baseZ = Math.round(500 - Math.abs(theta));
            const sharedStyle = {
              position: "absolute",
              left: "50%",
              bottom: 0,
              transformOrigin: `50% ${PIVOT_DISTANCE}px`,
              transform: `translateX(-50%) rotate(${theta}deg) ${isHovered ? "translateY(-24px)" : ""}`,
              zIndex: isHovered ? 999 : baseZ,
              boxShadow: cardShadow,
              transition: "transform 200ms ease-out",
            };

            if (item.type === "entrance") {
              return (
                <Link
                  key={item.key}
                  href={item.entrance.href}
                  onMouseEnter={() => setHoveredKey(item.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={sharedStyle}
                  className="w-60 h-[21rem] rounded-xl bg-off-white flex flex-col items-center justify-center gap-2 text-center"
                >
                  <span className="text-4xl font-medium text-red px-2">{item.entrance.label}</span>
                </Link>
              );
            }

            const card = item.card;
            const isFlipped = flipped.has(card.id);
            return (
              <div
                key={item.key}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => toggleFlip(card.id)}
                style={sharedStyle}
                className="w-60 h-[21rem] rounded-xl cursor-pointer"
              >
                <div
                  style={{
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transformStyle: "preserve-3d",
                    transition: "transform 0.5s",
                  }}
                  className="relative w-full h-full"
                >
                  <div
                    style={{ backfaceVisibility: "hidden" }}
                    className="absolute inset-0 rounded-xl bg-off-white flex items-center justify-center text-center px-3"
                  >
                    <span className="text-4xl font-medium text-blue">{card.word}</span>
                  </div>
                  <div
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    className="absolute inset-0 rounded-xl bg-off-white flex items-center justify-center text-center px-3"
                  >
                    <span className="text-xl text-blue">{card.definition}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MobileDeck sequence={sequence} flipped={flipped} onToggleFlip={toggleFlip} />
    </main>
  );
}

function MobileDeck({ sequence, flipped, onToggleFlip }) {
  const [index, setIndex] = useState(0);
  const touchX = useRef(0);

  function onTouchStart(e) {
    touchX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx < -40) setIndex((i) => Math.min(i + 1, sequence.length - 1));
    else if (dx > 40) setIndex((i) => Math.max(i - 1, 0));
  }

  const item = sequence[index];
  const isFlipped = item.type === "card" && flipped.has(item.card.id);

  return (
    <div
      className="flex sm:hidden flex-col items-center gap-4 w-full"
      style={{ perspective: 1200 }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {item.type === "entrance" ? (
        <Link
          href={item.entrance.href}
          style={{ boxShadow: cardShadow }}
          className="relative w-60 h-[21rem] rounded-xl bg-off-white flex items-center justify-center text-center px-3"
        >
          <span className="text-4xl font-medium text-red px-2">{item.entrance.label}</span>
        </Link>
      ) : (
        <div
          onClick={() => onToggleFlip(item.card.id)}
          style={{ boxShadow: cardShadow }}
          className="relative w-60 h-[21rem] rounded-xl cursor-pointer"
        >
          <div
            style={{
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              transformStyle: "preserve-3d",
              transition: "transform 0.5s",
            }}
            className="absolute inset-0"
          >
            <div
              style={{ backfaceVisibility: "hidden" }}
              className="absolute inset-0 rounded-xl bg-off-white flex items-center justify-center text-center px-3"
            >
              <span className="text-4xl font-medium text-blue">{item.card.word}</span>
            </div>
            <div
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
              className="absolute inset-0 rounded-xl bg-off-white flex items-center justify-center text-center px-3"
            >
              <span className="text-xl text-blue">{item.card.definition}</span>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-off-white">
        {index + 1} / {sequence.length} · swipe to browse
      </p>
    </div>
  );
}
