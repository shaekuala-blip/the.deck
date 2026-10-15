// rows: [{ name, display, isYou, key }], already sorted best-to-worst.
// `key` is optional but worth passing (an email works well): two people can
// share a name, and React needs something unique per row to keep them apart.
export default function Leaderboard({ title, rows, emptyMessage }) {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-blue-light p-3">
      {title && <p className="text-xs text-off-white/80 mb-2 px-1">{title}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-off-white/80 px-1 py-2 text-center">
          {emptyMessage || "Nothing here yet."}
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={r.key ?? `${r.name}-${i}`}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm
                ${i === 0 ? "bg-blue text-blue-light font-medium" : "bg-blue text-blue-light"}
                ${r.isYou && i !== 0 ? "font-medium" : ""}`}
            >
              <span>{i + 1}. {r.name}</span>
              <span>{r.display}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
