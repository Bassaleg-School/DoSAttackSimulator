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
let frameCounter = 0;
const gameLoop = new GameLoop((dt) => {
  // Update simulation
  orchestrator.update(dt);
  
  // Get current state
  const state = orchestrator.getState();
  
  // Update UI
  uiManager.update(state);
  
  // Update IP blacklist every 60 frames (~1 second at 60fps)
  frameCounter += 1;
  if (frameCounter >= 60) {
    eventHandlers.updateIPBlacklist();
    frameCounter = 0;
  }
  
  // Render canvas
  renderer.render(state);
});

// Start the game loop automatically for visualization
gameLoop.start();

console.log('DoS/DDoS Simulator initialized and running');

