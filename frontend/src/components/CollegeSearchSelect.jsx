import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { api } from "../lib/api";

export function CollegeSearchSelect({ value, onChange, label = "Choose your college" }) {
  const [colleges, setColleges] = useState([]);
  const [states, setStates] = useState([]);
  const [stateFilter, setStateFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCollege, setSelectedCollege] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    api.get("/colleges/states").then(setStates).catch(() => setStates([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const query = new URLSearchParams();
    if (debouncedSearch) query.set("search", debouncedSearch);
    if (stateFilter) query.set("state", stateFilter);
    api.get(`/colleges?${query.toString()}`).then(setColleges).catch(() => setColleges([]));
  }, [debouncedSearch, stateFilter]);

  useEffect(() => {
    if (!value) {
      setSelectedCollege(null);
      return;
    }

    const localMatch = colleges.find((college) => String(college.id) === String(value));
    if (localMatch) {
      setSelectedCollege(localMatch);
      if (!isOpen) setSearchInput(localMatch.name);
      return;
    }

    api.get(`/colleges/${value}`).then((college) => {
      setSelectedCollege(college);
      if (!isOpen) setSearchInput(college.name);
    }).catch(() => setSelectedCollege(null));
  }, [value, colleges, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
        setActiveIndex(-1);
        if (selectedCollege) setSearchInput(selectedCollege.name);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedCollege]);

  useEffect(() => {
    setActiveIndex(colleges.length ? 0 : -1);
  }, [colleges]);

  const emptyMessage = useMemo(() => {
    if (debouncedSearch || stateFilter) return "No colleges match your search.";
    return "Start typing to browse colleges.";
  }, [debouncedSearch, stateFilter]);

  function handleSelect(college) {
    setSelectedCollege(college);
    setSearchInput(college.name);
    setIsOpen(false);
    setActiveIndex(-1);
    onChange(String(college.id));
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((current) => (colleges.length ? (current + 1) % colleges.length : -1));
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (colleges.length ? (current <= 0 ? colleges.length - 1 : current - 1) : -1));
    }

    if (event.key === "Enter" && isOpen && activeIndex >= 0 && colleges[activeIndex]) {
      event.preventDefault();
      handleSelect(colleges[activeIndex]);
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div className="space-y-3 overflow-visible">
      <label className="block text-sm font-semibold text-slate-700">{label}</label>
      <div className="grid gap-3 overflow-visible md:grid-cols-[1fr_220px]">
        <div className="relative z-[60] overflow-visible" ref={containerRef}>
          <Search className="pointer-events-none absolute left-4 top-4 text-slate-400" size={18} />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setIsOpen(true);
              if (!event.target.value.trim()) onChange("");
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search 1000+ colleges"
            autoComplete="off"
            className="w-full rounded-2xl border border-slate-200 bg-white px-11 py-3 pr-11 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
          />
          <ChevronDown
            size={18}
            className={`pointer-events-none absolute right-4 top-4 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
          />
          {isOpen ? (
            <div className="absolute z-[80] mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-panel">
              {colleges.length ? (
                colleges.map((college, index) => (
                  <button
                    key={college.id}
                    type="button"
                    onClick={() => handleSelect(college)}
                    className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-3 text-left transition ${index === activeIndex ? "bg-sky/10" : "hover:bg-slate-50"}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink">{highlightMatch(college.name, debouncedSearch || searchInput)}</div>
                      <div className="mt-1 text-xs text-slate-500">{college.city}, {college.state} • {college.airport_code}</div>
                    </div>
                    {String(selectedCollege?.id) === String(college.id) ? <Check size={16} className="mt-0.5 shrink-0 text-sea" /> : null}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-sm text-slate-500">{emptyMessage}</div>
              )}
            </div>
          ) : null}
        </div>

        <select
          value={stateFilter}
          onChange={(event) => {
            setStateFilter(event.target.value);
            setIsOpen(true);
          }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-sky focus:ring-4 focus:ring-sky/10"
        >
          <option value="">All states</option>
          {states.map((state) => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function highlightMatch(text, query) {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) return text;
  const lowerText = text.toLowerCase();
  const lowerQuery = normalizedQuery.toLowerCase();
  const matchIndex = lowerText.indexOf(lowerQuery);
  if (matchIndex === -1) return text;

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + normalizedQuery.length);
  const after = text.slice(matchIndex + normalizedQuery.length);

  return (
    <>
      {before}
      <span className="rounded bg-sand/70 px-0.5">{match}</span>
      {after}
    </>
  );
}
