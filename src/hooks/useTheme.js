import { useCallback, useEffect, useState } from "react";

const KEY = "studyhive-theme";
const LIGHT_BAR = "#f2f2f7";
const DARK_BAR = "#000000";

function readStored() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage can be blocked (private mode, embedded views)
  }
}

const prefersDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

/**
 * Light/dark theme. Follows the device setting until the person taps the toggle,
 * then remembers their choice. The matching first-paint script lives in index.html.
 */
export function useTheme() {
  const [dark, setDark] = useState(() => {
    const stored = readStored();
    return stored ? stored === "dark" : prefersDark();
  });

  // Follow the system setting while there is no saved choice.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      if (!readStored()) setDark(e.matches);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Apply the theme to the page and to the browser UI colour (status bar / address bar).
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? DARK_BAR : LIGHT_BAR);
  }, [dark]);

  const toggle = useCallback(() => {
    const next = !dark;
    setDark(next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* storage unavailable: the choice just lasts for this visit */
    }
  }, [dark]);

  return { dark, toggle };
}
