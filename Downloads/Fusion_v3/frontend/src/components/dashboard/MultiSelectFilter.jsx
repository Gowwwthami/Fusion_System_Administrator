import { useState, useRef, useEffect } from "react";

export default function MultiSelectFilter({ label, options, selected, onChange, id }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option) => {
    const newSelected = selected.includes(option)
      ? selected.filter((s) => s !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div className="filter-label">{label}</div>
      <div
        className="filter-multi"
        onClick={() => setIsOpen(!isOpen)}
        tabIndex={0}
      >
        {selected.length > 0 ? (
          <>
            {selected.map((value) => (
              <span key={value} className="filter-tag">
                {value}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleOption(value);
                  }}
                >
                  ×
                </span>
              </span>
            ))}
            <span className="filter-clear" onClick={(e) => { e.stopPropagation(); clearAll(); }}>×</span>
          </>
        ) : (
          <span style={{ color: "#aaa", fontSize: "13px" }}>Select...</span>
        )}
      </div>

      {isOpen && (
        <div ref={dropdownRef} className="dropdown-list" style={{ display: "block" }}>
          {options.map((option) => (
            <div
              key={option}
              className={`dropdown-item ${selected.includes(option) ? "selected" : ""}`}
              onClick={() => toggleOption(option)}
            >
              {option}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
