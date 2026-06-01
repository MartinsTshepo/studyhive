/**
 * Dark Mode Color Scheme
 * Provides color constants for light and dark modes with NO WHITE BORDERS
 */

export const createColorScheme = (isDark) => {
  if (isDark) {
    return {
      bg: "#000",
      surface: "#0a0a0a",
      card: "#111",
      border: "#1a1a1a", // Dark border - no white
      text: "#fff",
      muted: "#888",
      accent: "#2563eb",
      accentBg: "#0d1f4a",
      glow: "0 0 0 1px #1d4ed8, 0 0 12px rgba(37,99,235,0.25)",
      primaryBtn: {
        background: "#2563eb",
        color: "#fff",
        border: "none",
      },
      secondaryBtn: {
        background: "transparent",
        color: "#888",
        border: "1px solid #1a1a1a",
      },
    };
  }

  return {
    bg: "#fff",
    surface: "#f5f7fa",
    card: "#fff",
    border: "#e5e7eb", // Light gray border (no white)
    text: "#0f172a",
    muted: "#6b7280",
    accent: "#2563eb",
    accentBg: "#eff6ff",
    glow: "none",
    primaryBtn: {
      background: "#2563eb",
      color: "#fff",
      border: "none",
    },
    secondaryBtn: {
      background: "transparent",
      color: "#6b7280",
      border: "1px solid #e5e7eb",
    },
  };
};

/**
 * Remove white borders in dark mode
 * @param {string} borderColor - Original border color
 * @param {boolean} isDark - Is dark mode
 * @returns {string} Adjusted border color with no white
 */
export const adjustBorderForDarkMode = (borderColor, isDark) => {
  if (!isDark) return borderColor;
  if (borderColor === "#fff" || borderColor === "white") return "#1a1a1a";
  return borderColor;
};

/**
 * Create border styles without white borders
 * @param {string} color - Base color
 * @param {boolean} isDark - Is dark mode
 * @param {number} width - Border width
 * @returns {string} Border CSS value
 */
export const createBorderStyle = (color, isDark, width = 1) => {
  const adjustedColor = adjustBorderForDarkMode(color, isDark);
  return `${width}px solid ${adjustedColor}`;
};

/**
 * Get responsive styles with dark mode support
 * @param {boolean} isDark - Is dark mode
 * @param {boolean} isMobile - Is mobile screen
 * @returns {Object} Responsive style object
 */
export const getResponsiveStyles = (isDark, isMobile) => {
  const colors = createColorScheme(isDark);

  return {
    container: {
      padding: isMobile ? 16 : 24,
      maxWidth: isMobile ? "100%" : "1200px",
      margin: "0 auto",
    },
    card: {
      borderRadius: isMobile ? 12 : 16,
      padding: isMobile ? 16 : 20,
      border: createBorderStyle(colors.border, isDark),
    },
    heading: {
      fontSize: isMobile ? 20 : 24,
      fontWeight: 700,
    },
    text: {
      fontSize: isMobile ? 14 : 15,
    },
    button: {
      padding: isMobile ? "8px 12px" : "11px 22px",
      fontSize: isMobile ? 13 : 14,
    },
  };
};

/**
 * Detect system dark mode preference
 * @returns {boolean} Is system in dark mode
 */
export const getSystemDarkMode = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
};

/**
 * Listen for system dark mode changes
 * @param {Function} callback - Called when dark mode preference changes
 * @returns {Function} Cleanup function
 */
export const listenToDarkModeChanges = (callback) => {
  if (typeof window === "undefined") return () => {};

  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = (e) => callback(e.matches);

  mediaQuery.addListener(handleChange);
  return () => mediaQuery.removeListener(handleChange);
};
