import { useEffect, useState } from 'react';

function parseRgb(color) {
  if (!color || color === 'transparent') return null;
  const rgb = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (!rgb) return null;
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
    a: rgb[4] != null ? Number(rgb[4]) : 1,
  };
}

function luminance({ r, g, b }) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function surfaceLuminanceAtPoint(x, y, skipEl) {
  const prevVisibility = skipEl?.style.visibility;
  if (skipEl) skipEl.style.visibility = 'hidden';
  const stack = document.elementsFromPoint(x, y).filter((node) => node !== skipEl && !skipEl?.contains(node));
  if (skipEl) skipEl.style.visibility = prevVisibility ?? '';

  let lum = 0;
  for (const node of stack.slice(0, 10)) {
    if (node.tagName === 'IMG') {
      lum = Math.max(lum, 0.22);
      continue;
    }
    const { backgroundColor } = window.getComputedStyle(node);
    const rgb = parseRgb(backgroundColor);
    if (!rgb || rgb.a < 0.08) continue;
    lum = Math.max(lum, luminance(rgb) * rgb.a);
    if (lum > 0.9) break;
  }
  return lum;
}

/** 'light' = светлый фон под элементом → тёмные иконки/текст; 'dark' = тёмный фон → светлые. */
export function useAdaptiveSurfaceTone(ref, enabled) {
  const [tone, setTone] = useState('dark');

  useEffect(() => {
    if (!enabled) return undefined;

    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;
      const lum = surfaceLuminanceAtPoint(x, y, el);
      setTone(lum > 0.58 ? 'light' : 'dark');
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    const id = window.setInterval(measure, 400);

    return () => {
      ro.disconnect();
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.clearInterval(id);
    };
  }, [enabled, ref]);

  return enabled ? tone : 'dark';
}
