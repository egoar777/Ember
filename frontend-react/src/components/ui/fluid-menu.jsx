import React, { useState, useRef, useEffect, createContext, useContext, useCallback } from 'react';
import { ChevronDown, Menu as MenuIcon, X } from 'lucide-react';

/** Шаг смещения (px); под --fluid-menu-size ~34px */
const ORB_STEP_PX = 30;

const MenuCloseContext = createContext(() => {});

/** Контекст: меню раскрыто (для анимации иконки гамбургера ↔ X). */
const FluidMenuExpandedContext = createContext(false);

const FluidMenuApiContext = createContext({ collapse: () => {} });



/**
 * Выпадающее меню (паттерн shadcn-friendly).
 * Закрытие: клик снаружи, Escape, выбор пункта.
 */
export function Menu({
  trigger,
  children,
  align = 'left',
  showChevron = true,
  panelClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef(null);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  const defaultPanel =
    'mt-2 w-56 rounded-md bg-white dark:bg-gray-800 shadow-lg ring-1 ring-black dark:ring-gray-700 ring-opacity-9 focus:outline-none z-[200]';

  return (
    <MenuCloseContext.Provider value={close}>
      <div ref={rootRef} className="relative inline-block text-left">
        <div
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(!isOpen);
            }
          }}
          className="cursor-pointer inline-flex items-center"
          role="button"
          tabIndex={0}
          aria-haspopup="true"
          aria-expanded={isOpen}
        >
          {trigger}
          {showChevron && (
            <ChevronDown
              className={`ml-2 -mr-1 h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          )}
        </div>

        {isOpen && (
          <div
            className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${defaultPanel} ${panelClassName}`}
            role="menu"
            aria-orientation="vertical"
          >
            <div className="py-1" role="none">
              {children}
            </div>
          </div>
        )}
      </div>
    </MenuCloseContext.Provider>
  );
}

export function MenuItem({ children, onClick, disabled = false, icon, isActive = false, className = '' }) {
  const close = useContext(MenuCloseContext);

  return (
    <button
      type="button"
      className={`relative flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors
        ${disabled ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10'}
        ${isActive ? 'bg-gray-100 dark:bg-white/10' : ''}
        ${className}
      `}
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        close();
      }}
    >
      {icon ? <span className="inline-flex h-5 w-5 shrink-0 text-current opacity-80">{icon}</span> : null}
      <span className="flex-1">{children}</span>
    </button>
  );
}

/** Аватар пользователя: в закрытом виде только фото/инициалы; при открытом — затемнение и крестик для закрытия. */
export function FluidMenuAvatarTrigger({ avatarUrl, initials }) {
  const expanded = useContext(FluidMenuExpandedContext);

  return (
    <div className="fluid-menu-avatar-inner pointer-events-none relative h-full w-full overflow-hidden rounded-full" aria-hidden="true">
      {avatarUrl ? (
        <>
          <img
            src={avatarUrl}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ease-out ${
              expanded ? 'scale-110 opacity-40' : 'scale-100 opacity-100'
            }`}
          />
          <div
            className={`absolute inset-0 bg-black transition-opacity duration-300 ${expanded ? 'opacity-50' : 'opacity-0'}`}
            aria-hidden="true"
          />
        </>
      ) : (
        <div
          className={`fluid-menu-avatar-fill transition-opacity duration-300 ${expanded ? 'opacity-25' : 'opacity-100'}`}
        >
          <span className="fluid-menu-avatar-initials">{initials || '?'}</span>
        </div>
      )}
      <div className="fluid-menu-avatar-fill">
        <X
          size={20}
          strokeWidth={2.25}
          className={`fluid-menu-avatar-close stroke-white transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            expanded ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
          }`}
        />
      </div>
    </div>
  );
}

/** Иконка гамбургер ↔ крестик для первой ячейки MenuContainer (только иконки). */
export function FluidMenuHamburgerTrigger({ className = '' }) {
  const expanded = useContext(FluidMenuExpandedContext);
  return (
    <div
      className={`pointer-events-none flex h-full w-full items-center justify-center text-white [&_svg]:stroke-white ${className}`}
      aria-hidden="true"
    >
      <div className="relative h-5 w-5">
        <MenuIcon
          size={20}
          strokeWidth={1.5}
          className={`absolute inset-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            expanded ? 'scale-0 rotate-90 opacity-0' : 'scale-100 rotate-0 opacity-100'
          }`}
        />
        <X
          size={20}
          strokeWidth={1.5}
          className={`absolute inset-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            expanded ? 'scale-100 rotate-0 opacity-100' : 'scale-0 -rotate-90 opacity-0'
          }`}
        />
      </div>
    </div>
  );
}

/**
 * Круглая кнопка только с иконкой (внутри «шайб» fluid-меню).
 */
export function MenuOrbItem({ icon, onClick, disabled = false, title, ariaLabel, accent = false }) {
  const { collapse } = useContext(FluidMenuApiContext);

  return (
    <button
      type="button"
      className={`fluid-menu-orb-item group relative flex h-full w-full items-center justify-center rounded-full text-center transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${accent ? 'fluid-menu-orb-item--accent' : ''}`}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || title}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        collapse();
      }}
    >
      <span className="flex h-5 w-5 items-center justify-center transition-transform duration-200 group-hover:scale-110 [&_svg]:transition-[stroke-width] group-hover:[&_svg]:stroke-[2.5]">
        {icon}
      </span>
    </button>
  );
}

/**
 * Вертикальный стек кругов с плавной анимацией. Без clip-path — круги остаются целыми.
 */
export function MenuContainer({
  children,
  className = '',
  triggerClassName = '',
  userLabel = '',
  getTriggerAriaLabel,
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const rootRef = useRef(null);
  const childrenArray = React.Children.toArray(children);
  const sliceCount = Math.max(0, childrenArray.length - 1);

  const collapse = useCallback(() => setIsExpanded(false), []);
  const toggle = useCallback(() => setIsExpanded((v) => !v), []);

  useEffect(() => {
    if (!isExpanded) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsExpanded(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [isExpanded]);

  return (
    <FluidMenuApiContext.Provider value={{ collapse }}>
      <FluidMenuExpandedContext.Provider value={isExpanded}>
        <div
          ref={rootRef}
          className={`header-fluid-menu fluid-menu-root relative z-[1100] ${className}`.trim()}
          data-expanded={isExpanded}
        >
          <div className="fluid-menu-stack relative">
            {/* Триггер: первая «шайба» */}
            <div
              className={`fluid-menu-trigger ${triggerClassName}`.trim()}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggle();
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-haspopup="true"
              aria-label={
                getTriggerAriaLabel
                  ? getTriggerAriaLabel(isExpanded, userLabel)
                  : isExpanded
                    ? 'Close menu'
                    : userLabel
                      ? `Profile menu: ${userLabel}`
                      : 'Open profile menu'
              }
            >
              {childrenArray[0]}
            </div>

            {childrenArray.slice(1).map((child, index) => {
              const openDelay = isExpanded ? index * 35 : 0;
              const closeDelay = !isExpanded ? (sliceCount - 1 - index) * 28 : 0;

              return (
                <div
                  key={index}
                  className="fluid-menu-orb-shell"
                  style={{
                    transform: `translateY(${isExpanded ? (index + 1) * ORB_STEP_PX : 0}px)`,
                    opacity: isExpanded ? 1 : 0,
                    zIndex: 40 - index,
                    pointerEvents: isExpanded ? 'auto' : 'none',
                    transition: `transform 320ms cubic-bezier(0.34, 1.15, 0.34, 1),
                      opacity ${isExpanded ? 280 : 360}ms cubic-bezier(0.4, 0, 0.2, 1),
                      background 200ms ease, border-color 200ms ease, box-shadow 200ms ease`,
                    transitionDelay: `${isExpanded ? openDelay : closeDelay}ms`,
                    backfaceVisibility: 'hidden',
                    WebkitFontSmoothing: 'antialiased',
                  }}
                >
                  {child}
                </div>
              );
            })}
          </div>
        </div>
      </FluidMenuExpandedContext.Provider>
    </FluidMenuApiContext.Provider>
  );
}
