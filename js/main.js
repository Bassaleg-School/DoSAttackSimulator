import GameLoop from './core/GameLoop.js';
import Orchestrator from './core/Orchestrator.js';
import CanvasRenderer from './core/CanvasRenderer.js';
import UIManager from './ui/UIManager.js';
import EventHandlers from './ui/EventHandlers.js';

// Initialize all components
const canvas = document.getElementById('canvas');
const orchestrator = new Orchestrator();
const renderer = new CanvasRenderer(canvas);
const uiManager = new UIManager();
const eventHandlers = new EventHandlers(orchestrator, uiManager, renderer);

// Render legend
uiManager.renderLegend(renderer.getLegendData());

// Attach all event handlers
eventHandlers.attachAll();

// Create game loop
const gameLoop = new GameLoop((dt) => {
  // Update simulation
  orchestrator.update(dt);
  
  // Get current state
  const state = orchestrator.getState();
  
  // Update UI
  uiManager.update(state);
  
  // Update IP blacklist periodically (every 60 frames ~= 1 second)
  if (Math.random() < 0.016) {
    eventHandlers.updateIPBlacklist();
  }
  
  // Render canvas
  renderer.render(state);
});

// Start the game loop automatically for visualization
gameLoop.start();

console.log('DoS/DDoS Simulator initialized and running');

