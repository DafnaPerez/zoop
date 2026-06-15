import { useEffect, useId, useMemo, useRef, useState } from "react";
import { planktons as defaultPlanktons } from "../data/planktons";
import { searchPlanktons } from "../utils/searchPlanktons";
import PlanktonSearchThumb from "./PlanktonSearchThumb";

export default function PlanktonSearch({ planktons = defaultPlanktons, onSelect }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const inputId = useId();
  const listId = useId();

  const results = useMemo(() => searchPlanktons(query, planktons), [query]);
  const showResults = expanded && query.trim().length > 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!expanded) return;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        closeSearch();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [expanded]);

  const closeSearch = () => {
    setExpanded(false);
    setQuery("");
  };

  const openSearch = () => {
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const pickResult = (index) => {
    const match = results[index];
    if (!match) return;

    onSelect(match.index);
    closeSearch();
  };

  const onInputKeyDown = (event) => {
    if (event.key === "ArrowDown" && showResults) {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp" && showResults) {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (showResults && results.length > 0) {
        pickResult(activeIndex);
      }
      return;
    }

    if (event.key === "Escape") {
      closeSearch();
    }
  };

  return (
    <div
      className={`gallery-search${expanded ? " gallery-search--expanded" : ""}`}
      ref={rootRef}
    >
      {!expanded ? (
        <button
          type="button"
          className="gallery-search-toggle gallery-nav-btn"
          onClick={openSearch}
          aria-label="Search collection"
          aria-expanded={false}
          aria-controls={inputId}
        >
          <span className="gallery-search-toggle-icon" aria-hidden="true">
            ⌕
          </span>
        </button>
      ) : (
        <div className="gallery-search-field">
          <label className="gallery-search-sr-only" htmlFor={inputId}>
            Search collection
          </label>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            className="gallery-search-input"
            placeholder="Name or taxonomy…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded={showResults}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            className="gallery-search-close gallery-nav-btn"
            onClick={closeSearch}
            aria-label="Close search"
          >
            ×
          </button>
        </div>
      )}

      {showResults && (
        <ul className="gallery-search-results" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="gallery-search-empty" role="presentation">
              No matches for “{query.trim()}”
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
      )}
    </div>
  );
}
