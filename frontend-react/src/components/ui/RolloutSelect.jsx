import { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { ChevronDown } from 'lucide-react';

const OPEN_STAGGER_MS = 35;
const CLOSE_STAGGER_MS = 28;
const STACK_PEEK_PX = 3;

/**
 * Выпадающий список с «выкатыванием» пунктов (как fluid-menu у аватара).
 */
export default function RolloutSelect({
  id,
  value,
  onChange,
  options,
  variant = 'catalog',
  className = '',
  'aria-labelledby': ariaLabelledBy,
}) {
  const [open, setOpen] = useState(false);
  const [triggerHeight, setTriggerHeight] = useState(variant === 'chip' ? 34 : 44);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const generatedId = useId();
  const selectId = id || generatedId;
  const listId = `${selectId}-list`;

  const selected = options.find((o) => o.value === value) ?? options[0];
  const count = options.length;

  const close = useCallback(() => setOpen(false), []);

  useLayoutEffect(() => {
    const el = triggerRef.current;
    if (!el) return;
    setTriggerHeight(el.offsetHeight);
  }, [open, variant, selected?.label]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const triggerClass =
    variant === 'chip'
      ? 'rollout-select__trigger rollout-select__trigger--chip filter-chip'
      : 'rollout-select__trigger rollout-select__trigger--catalog catalog-filter-select';

  return (
    <div
      ref={rootRef}
      className={`rollout-select rollout-select--${variant} ${className}`.trim()}
      data-expanded={open ? 'true' : 'false'}
    >
      <button
        ref={triggerRef}
        type="button"
        id={selectId}
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        aria-labelledby={ariaLabelledBy}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="rollout-select__value">{selected?.label}</span>
        <span
          className={`rollout-select__chevron-wrap ${open ? 'rollout-select__chevron-wrap--open' : ''}`}
          aria-hidden
        >
          <ChevronDown
            className="rollout-select__chevron"
            size={variant === 'chip' ? 14 : 16}
            strokeWidth={2.25}
          />
        </span>
      </button>

      <div
        id={listId}
        role="listbox"
        className="rollout-select__panel-wrap"
        style={{ top: triggerHeight }}
        aria-labelledby={ariaLabelledBy || selectId}
      >
        <div className="rollout-select__panel">
          {options.map((opt, index) => {
            const openDelay = open ? index * OPEN_STAGGER_MS : 0;
            const closeDelay = !open ? (count - 1 - index) * CLOSE_STAGGER_MS : 0;
            const isSelected = opt.value === value;
            const closedY = -index * STACK_PEEK_PX;
            const opacityTransition =
              open && index === 0
                ? 'opacity 0ms'
                : `opacity ${open ? 280 : 360}ms cubic-bezier(0.4, 0, 0.2, 1)`;

            return (
              <div
                key={opt.value || '__empty'}
                className="rollout-select__row"
                style={{
                  transform: open ? 'translateY(0)' : `translateY(${closedY}px)`,
                  opacity: open ? 1 : 0,
                  pointerEvents: open ? 'auto' : 'none',
                  transition: `transform 320ms cubic-bezier(0.34, 1.15, 0.34, 1), ${opacityTransition}`,
                  transitionDelay: `${open ? openDelay : closeDelay}ms`,
                }}
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`rollout-select__item ${isSelected ? 'rollout-select__item--active' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    close();
                  }}
                >
                  {opt.label}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
