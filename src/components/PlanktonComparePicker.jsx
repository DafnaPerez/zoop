import { useEffect, useId, useMemo, useRef, useState } from "react";
import { searchPlanktons } from "../utils/searchPlanktons";
import PlanktonSearchThumb from "./PlanktonSearchThumb";

export default function PlanktonComparePicker({
  planktons,
  excludeId,
  onSelect,
  className = "",
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const inputId = useId();
  const listId = useId();

  const candidates = useMemo(
    () => planktons.filter((plankton) => plankton.id !== excludeId),
    [planktons, excludeId],
  );

  const results = useMemo(() => {
    if (!query.trim()) {
      return candidates.map((plankton, index) => ({ plankton, index }));
    }

    return searchPlanktons(query, candidates);
  }, [query, candidates]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, expanded]);

  useEffect(() => {
    if (!expanded) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        closePicker();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded]);

  const closePicker = () => {
    setExpanded(false);
    setQuery("");
  };

  const openPicker = () => {
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const pickResult = (index) => {
    const match = results[index];
    if (!match) return;

    onSelect(match.plankton.id);
    closePicker();
  };

  const onInputKeyDown = (event) => {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (results.length > 0) {
        pickResult(activeIndex);
      }
      return;
    }

    if (event.key === "Escape") {
      closePicker();
    }
  };

  const rootClass = ["gallery-search", expanded ? "gallery-search--expanded" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} ref={rootRef}>
      {!expanded ? (
        <button
          type="button"
          className="gallery-search-toggle gallery-nav-btn gallery-compare-toggle"
          onClick={openPicker}
          aria-label="Compare with another species"
          aria-expanded={false}
          aria-controls={inputId}
        >
          <span className="gallery-search-toggle-icon gallery-compare-toggle-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="5" width="7" height="14" stroke="currentColor" strokeWidth="1.5" />
              <rect x="13" y="5" width="7" height="14" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </span>
        </button>
      ) : (
        <div className="gallery-search-field">
          <label className="gallery-search-sr-only" htmlFor={inputId}>
            Choose species to compare
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            className="gallery-search-input"
            placeholder="Choose species…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="gallery-search-close gallery-nav-btn"
            onClick={closePicker}
            aria-label="Close compare picker"
          >
            ×
          </button>
        </div>
      )}

      {expanded ? (
        <ul className="gallery-search-results" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="gallery-search-empty" role="presentation">
              {query.trim() ? `No matches for “${query.trim()}”` : "No other species in collection"}
            </li>
          ) : (
            results.map(({ plankton }, resultIndex) => (
              <li key={plankton.id} role="presentation">
                <button
                  type="button"
                  className={`gallery-search-result${
                    resultIndex === activeIndex ? " gallery-search-result--active" : ""
                  }`}
                  role="option"
                  aria-selected={resultIndex === activeIndex}
                  onMouseEnter={() => setActiveIndex(resultIndex)}
                  onClick={() => pickResult(resultIndex)}
                >
                  <PlanktonSearchThumb plankton={plankton} />
                  <span className="gallery-search-result-copy">
                    <span className="gallery-search-result-name">{plankton.name}</span>
                    <span className="gallery-search-result-taxonomy">
                      {plankton.taxonomy}
                    </span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
