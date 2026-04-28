import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function EmployeeSelect({
  options,
  value,
  onChange,
  placeholder,
  disabled,
  styles
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const found = options.find((o) => o.value === value);
    return found ? found.label : '';
  }, [options, value]);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    // When opening, make sure active item is visible.
    const idx = Math.max(0, options.findIndex((o) => o.value === value));
    setActiveIdx(idx);
    const el = listRef.current?.querySelector(`[data-idx="${idx}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [open, options, value]);

  const commit = (idx) => {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (disabled) return;

    if (!open && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setOpen(true);
      return;
    }

    if (!open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(options.length - 1, (i < 0 ? 0 : i + 1)));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, (i < 0 ? 0 : i - 1)));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIdx >= 0) commit(activeIdx);
      return;
    }
  };

  return (
    <div ref={rootRef} style={styles.dropdownRoot}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={styles.dropdownButton}
      >
        <span style={selectedLabel ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {selectedLabel || placeholder}
        </span>
        <span style={styles.dropdownChevron}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div ref={listRef} role="listbox" tabIndex={-1} style={styles.dropdownList}>
          {options.map((opt, idx) => {
            const isActive = idx === activeIdx;
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-idx={idx}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => commit(idx)}
                style={{
                  ...styles.dropdownItem,
                  ...(isActive ? styles.dropdownItemActive : null),
                  ...(isSelected ? styles.dropdownItemSelected : null)
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
