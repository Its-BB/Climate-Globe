import { useMemo, useState } from "react";
import type { CountryFeature } from "../lib/geo";

interface Props {
  countries: CountryFeature[];
  onSelect: (c: CountryFeature) => void;
}

export default function SearchBar({ countries, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return countries
      .filter((c) => c.properties.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const an = a.properties.name.toLowerCase();
        const bn = b.properties.name.toLowerCase();
        return an.indexOf(q) - bn.indexOf(q) || an.localeCompare(bn);
      })
      .slice(0, 7);
  }, [query, countries]);

  const choose = (c: CountryFeature) => {
    onSelect(c);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="search">
      <div className="search-input panel">
        <input
          value={query}
          placeholder="Search a country..."
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches[0]) choose(matches[0]);
            if (e.key === "Escape") setOpen(false);
          }}
        />
      </div>
      {open && matches.length > 0 && (
        <div className="search-results panel">
          {matches.map((c) => (
            <button key={c.properties.adm0_a3} onClick={() => choose(c)}>
              {c.properties.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
