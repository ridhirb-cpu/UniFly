import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import airports from "../data/airports.json";

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 250;

export function AirportSearchSelect({ value, onChange, label, placeholder = "Search airports" }) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const filteredAirports = useMemo(() => {
    try {
      const query = debouncedSearch.toLowerCase();
      const source = Array.isArray(airports) ? airports : [];

      return source
        .filter((airport) => {
          if (!query) return true;

          return [airport.name, airport.city, airport.code].some((field) =>
            String(field || "").toLowerCase().includes(query)
          );
        })
        .slice(0, MAX_RESULTS);
    } catch {
      return [];
    }
  }, [debouncedSearch]);

  const selectedAirport = useMemo(() => {
    try {
      const source = Array.isArray(airports) ? airports : [];
      return source.find((airport) => airport.code === value) || null;
    } catch {
      return null;
    }
  }, [value]);

  useEffect(() => {
    if (!selectedAirport) {
      if (!isOpen && !value) {
        setSearchInput("");
      }
      return;
    }

    if (!isOpen) {
      setSearchInput(formatSelectedLabel(selectedAirport));
    }
  }, [selectedAirport, isOpen, value]);

  useEffect(() => {
    setActiveIndex(filteredAirports.length ? 0 : -1);
  }, [filteredAirports]);

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
        setSearchInput(selectedAirport ? formatSelectedLabel(selectedAirport) : "");
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [selectedAirport]);

  function handleSelect(airport) {
    setSearchInput(formatSelectedLabel(airport));
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(airport.code);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (filteredAirports.length ? (current + 1) % filteredAirports.length : -1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (filteredAirports.length ? (current <= 0 ? filteredAirports.length - 1 : current - 1) : -1));
    }

    if (event.key === "Enter" && isOpen && activeIndex >= 0 && filteredAirports[activeIndex]) {
      event.preventDefault();
      handleSelect(filteredAirports[activeIndex]);
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
      setSearchInput(selectedAirport ? formatSelectedLabel(selectedAirport) : "");
    }
  }

  return (
    <div className="space-y-3 overflow-visible">
      {label ? <label className="block text-sm font-semibold text-slate-700">{label}</label> : null}
      <div className="relative z-[90] overflow-visible" ref={containerRef}>
        <Search className="pointer-events-none absolute left-4 top-4 text-slate-400" size={18} />
        <input
          value={searchInput}
          onChange={(event) => {
            const nextValue = event.target.value;
            setSearchInput(nextValue);
            setIsOpen(true);

            if (!nextValue.trim()) {
              onChange("");
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 pr-11 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-haspopup="listbox"
          role="combobox"
        />
        <ChevronDown
          size={18}
          className={`pointer-events-none absolute right-4 top-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
        />

        {isOpen ? (
          <div className="absolute left-0 top-full z-[110] mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-panel">
            {filteredAirports.length ? (
              filteredAirports.map((airport, index) => (
                <button
                  key={airport.code}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(airport)}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${
                    index === activeIndex ? "bg-sky/10" : "hover:bg-slate-50"
                  }`}
                  role="option"
                  aria-selected={selectedAirport?.code === airport.code}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink">{airport.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{airport.city} ({airport.code})</div>
                  </div>
                  {selectedAirport?.code === airport.code ? <Check size={16} className="mt-0.5 shrink-0 text-sea" /> : null}
                </button>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-slate-500">No airports found.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HomeAirportSearch(props) {
  return <AirportSearchSelect {...props} />;
}

function formatSelectedLabel(airport) {
  return `${airport.name} (${airport.city}) (${airport.code})`;
}
