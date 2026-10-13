// rows: [{ name, display, isYou }], already sorted best-to-worst.
export default function Leaderboard({ title, rows }) {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-gold p-3">
      {title && <p className="text-xs text-off-white/80 mb-2 px-1">{title}</p>}
      <ol className="flex flex-col gap-2">
        {rows.map((r, i) => (
          <li
            key={r.name}
            className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm
              ${i === 0 ? "bg-blue-light text-blue font-medium" : "bg-blue-light text-blue"}
              ${r.isYou && i !== 0 ? "font-medium" : ""}`}
          >
            <span>{i + 1}. {r.name}</span>
            <span>{r.display}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
