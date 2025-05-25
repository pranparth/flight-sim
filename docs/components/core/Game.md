# Game Class

## Overview
The `Game` class serves as the main orchestrator and entry point for the WW2 Combat Flight Simulator. It manages the lifecycle of all game systems, handles the game loop, and coordinates interactions between different subsystems.

## Architecture
The Game class follows a modular architecture pattern where it owns and manages all major game systems:

```typescript
class Game {
  private renderer: Renderer          // Graphics rendering
  private physicsEngine: PhysicsEngine // Physics simulation
  private inputManager: InputManager   // Input handling
  private sceneManager: SceneManager   // Scene graph management
  private cameraController: CameraController // Camera control
  private playerAircraft: Aircraft     // Player's aircraft entity
}
```

## Key Responsibilities

### 1. System Initialization
- Creates and initializes all game subsystems in the correct order
- Sets up the player aircraft with initial position and configuration
- Configures the camera system to follow the player
- Establishes event listeners for window resize and debug controls

### 2. Game Loop Management
- Implements a fixed timestep game loop using `requestAnimationFrame`
- Caps delta time to 0.1 seconds to prevent physics instability
- Orchestrates update order: Input → Physics → Entities → Camera → Scene
- Manages game state (running/stopped)

### 3. Debug Features
- F3 key toggles debug overlay showing flight data
- R key resets aircraft position
- T key runs automated tests
- Integrates Three.js stats panel for performance monitoring

## Methods

### Public API

#### `constructor(container: HTMLElement)`
Creates a new game instance attached to the specified DOM container.

#### `async init(): Promise<void>`
Initializes all game systems. Must be called before starting the game.

#### `start(): void`
Begins the game loop. Safe to call multiple times.

#### `stop(): void`
Pauses the game loop.

#### `getPlayerAircraft(): Aircraft`
Returns the player's aircraft entity for external access.

#### `getSceneManager(): SceneManager`
Returns the scene manager for external scene manipulation.

### Private Methods

#### `gameLoop(): void`
Main game loop implementation using requestAnimationFrame.

#### `update(deltaTime: number, elapsedTime: number): void`
Updates all game systems in the correct order:
1. Input polling
2. Physics simulation
3. Player control application
4. Aircraft state update
5. Camera tracking
6. Scene animations
7. Debug info refresh

#### `render(): void`
Delegates rendering to the Renderer system with current scene and camera.

#### `handleResize(): void`
Updates renderer and camera aspect ratio on window resize.

#### `setupDebug(): void`
Configures debug features including:
- FPS counter
- Debug info overlay
- Keyboard shortcuts for testing
- Development-only features

#### `updateDebugInfo(): void`
Updates the debug overlay with current flight data:
- Position and altitude
- Airspeed and heading
- Angle of attack
- Throttle percentage
- Health status
- Crash warnings

## Usage Example

```typescript
const container = document.getElementById('game-container');
const game = new Game(container);

await game.init();
game.start();
```

## Debug Controls

| Key | Action |
|-----|--------|
| F3 | Toggle debug overlay |
| R | Reset aircraft position |
| T | Run auto-reset tests |
| 1-5 | Switch camera views |

## Performance Considerations

- Delta time is capped at 0.1s to prevent large physics jumps
- Debug features are only loaded in development mode
- Stats panel can impact performance slightly
- All systems update in a single pass to minimize overhead

## Dependencies

- **Three.js**: Core 3D rendering framework
- **@systems/**: All game systems (Renderer, Physics, Input, etc.)
- **@entities/Aircraft**: Player aircraft entity
- **three/examples/jsm/libs/stats.module.js**: Performance monitoring

## Future Enhancements

- Pause/resume functionality
- Save/load game state
- Multiple aircraft support
- Network multiplayer preparation
- Performance profiling tools
- Configurable graphics settings