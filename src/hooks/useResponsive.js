import { useState, useEffect } from "react";

/**
 * Hook to detect screen size and return responsive values
 * @returns {Object} breakpoints - { isMobile, isTablet, isDesktop, screenWidth }
 */
export const useResponsive = () => {
  const [screenWidth, setScreenWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    isMobile: screenWidth <= 640,
    isTablet: screenWidth > 640 && screenWidth <= 1024,
    isDesktop: screenWidth > 1024,
    screenWidth,
  };
};

/**
 * Get responsive padding based on screen size
 * @param {boolean} isMobile - Is mobile screen
 * @returns {number} Padding value in pixels
 */
export const getResponsivePadding = (isMobile) => (isMobile ? 16 : 24);

/**
 * Get responsive font size based on screen size
 * @param {number} desktopSize - Font size for desktop
 * @param {number} mobileSize - Font size for mobile
 * @param {boolean} isMobile - Is mobile screen
 * @returns {number} Font size
 */
export const getResponsiveFontSize = (desktopSize, mobileSize, isMobile) =>
  isMobile ? mobileSize : desktopSize;

/**
 * Get responsive grid columns
 * @param {boolean} isMobile - Is mobile screen
 * @returns {string} CSS grid template columns
 */
export const getResponsiveGrid = (isMobile) =>
  isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))";

/**
 * Get responsive max width
 * @param {boolean} isMobile - Is mobile screen
 * @returns {string} Max width value
 */
export const getResponsiveMaxWidth = (isMobile) =>
  isMobile ? "100%" : "1200px";

/**
 * Get responsive border radius
 * @param {boolean} isMobile - Is mobile screen
 * @returns {number} Border radius in pixels
 */
export const getResponsiveBorderRadius = (isMobile) =>
  isMobile ? 12 : 16;
