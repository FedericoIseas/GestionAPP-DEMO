"use client";
import { useState, useRef, useEffect } from "react";

export default function CustomSelect({ value, onChange, options, placeholder, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => String(o.value) === String(value));

  return (
    <div ref={ref} className={`custom-select-wrapper ${disabled ? "disabled" : ""}`} onClick={() => !disabled && setOpen(!open)}>
      <div className={`form-input-clean custom-select-trigger ${open ? "open" : ""}`}>
        <span className={selectedOption ? "" : "placeholder"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--outline)", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          expand_more
        </span>
      </div>
      {open && (
        <div className="custom-select-dropdown">
          {placeholder && (
            <div className="custom-select-option" onClick={() => onChange({ target: { value: "" } })}>
              {placeholder}
            </div>
          )}
          {options.map(opt => (
            <div 
              key={opt.value} 
              className={`custom-select-option ${String(value) === String(opt.value) ? "selected" : ""}`}
              onClick={() => {
                onChange({ target: { value: opt.value } });
              }}
            >
              {opt.label}
              {String(value) === String(opt.value) && <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
