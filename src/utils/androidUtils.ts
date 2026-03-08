/**
 * Initializes a handler to adapt the UI to the visual viewport.
 * This is crucial for mobile devices where UI elements like the on-screen keyboard
 * can change the visible area.
 * It sets CSS variables that can be used throughout the application for layout adjustments.
 */
export const initializeViewportHandler = (): (() => void) => {
  const root = document.documentElement;

  const updateViewportVars = () => {
    if (window.visualViewport) {
      const { height, offsetTop } = window.visualViewport;

      // Set the actual viewport height unit (1% of the visible height)
      root.style.setProperty('--vh', `${height * 0.01}px`);

      // Calculate the bottom safe area inset (e.g., space taken by navigation bar)
      const bottomInset = window.innerHeight - height - offsetTop;
      root.style.setProperty('--nav-bar-height', `${Math.max(0, bottomInset)}px`);
    }
  };

  if (window.visualViewport) {
    // Initial update
    updateViewportVars();

    // Update on resize and scroll
    window.visualViewport.addEventListener('resize', updateViewportVars);
    window.visualViewport.addEventListener('scroll', updateViewportVars);

    // Return a cleanup function to remove listeners
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewportVars);
        window.visualViewport.removeEventListener('scroll', updateViewportVars);
      }
    };
  } else {
    // Fallback for browsers that do not support visualViewport
    const fallbackUpdate = () => {
      root.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
      root.style.setProperty('--nav-bar-height', '0px');
    };
    fallbackUpdate();
    window.addEventListener('resize', fallbackUpdate);
    return () => window.removeEventListener('resize', fallbackUpdate);
  }
};