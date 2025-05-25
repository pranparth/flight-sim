import { Game } from '@core/Game';

// Initialize the game when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  const appElement = document.getElementById('app');
  const loadingElement = document.getElementById('loading');
  
  if (!appElement) {
    console.error('App element not found');
    return;
  }
  
  try {
    // Create and initialize the game
    const game = new Game(appElement);
    await game.init();
    
    // Hide loading screen
    if (loadingElement) {
      loadingElement.style.display = 'none';
    }
    
    // Start the game
    game.start();
    
    // Make game instance available for debugging
    (window as any).game = game;
  } catch (error) {
    console.error('Failed to initialize game:', error);
    if (loadingElement) {
      loadingElement.innerHTML = `
        <h2>Failed to load game</h2>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      `;
    }
  }
});