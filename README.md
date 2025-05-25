# WW2 Cartoon Combat Flight Simulator

A browser-based World War 2 combat flight simulator featuring cartoon-style graphics and arcade physics.

## Features

- 🎮 Arcade-friendly flight physics with realistic feel
- 🎨 Cartoon-style cel-shaded graphics
- ✈️ Multiple iconic WW2 aircraft (Spitfire, Bf 109, P-51 Mustang, Zero)
- 🎯 Combat mechanics with working weapons
- 🎈 Destructible barrage balloons as defensive targets
- 🌍 Dynamic environment with ocean, islands, towns, and forests
- 📱 Keyboard, mouse, and gamepad support

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `https://localhost:3000`

## Controls

### Keyboard Controls
- **W/S or ↑/↓**: Pitch (up/down)
- **A/D or ←/→**: Roll (left/right)
- **Q/E**: Yaw (rudder left/right)
- **Shift**: Increase throttle
- **Ctrl**: Decrease throttle
- **Space**: Fire weapons
- **Tab**: Boost (Phase 2)
- **B**: Air brake
- **R**: Reset aircraft position

### Camera Controls
- **1**: Third person view
- **2**: Cockpit view
- **3**: Chase camera
- **4**: Cinematic camera
- **5**: Free camera
- **Mouse Wheel**: Zoom in/out
- **+/=**: Zoom in (camera closer)
- **-/_**: Zoom out (camera further)
- **C**: Reset camera to default view

### Debug
- **F3**: Toggle debug information

## Development

### Project Structure
```
src/
├── core/           # Core game systems
├── systems/        # Major subsystems (renderer, physics, input)
├── entities/       # Game entities (aircraft, projectiles)
├── utils/          # Utility functions and helpers
├── shaders/        # Custom WebGL shaders
└── assets/         # Game assets (models, textures, sounds)
```

### Building for Production
```bash
npm run build
```

The built files will be in the `dist/` directory.

### Type Checking
```bash
npm run typecheck
```

## Technical Details

- **Engine**: Three.js with custom cel-shading
- **Physics**: Simplified flight dynamics with arcade feel
- **Language**: TypeScript
- **Build Tool**: Vite
- **Target**: Modern browsers with WebGL support

## Current Status

Phase 1 (Core Foundation) is complete:
- ✅ Basic flight physics
- ✅ 3D renderer with cartoon shading
- ✅ Input handling
- ✅ Test aircraft with procedural geometry
- ✅ Camera system with zoom controls
- ✅ Basic terrain and environment

Phase 2 (Combat System) is in progress:
- ✅ Weapon systems (machine guns)
- ✅ Basic damage model
- ✅ Destructible barrage balloons
- ⏳ AI opponents (coming soon)
- ✅ HUD elements (basic)

## Upcoming Features

### Phase 2: Combat System
- Weapon systems (machine guns, cannons)
- Damage model
- AI opponents
- HUD elements

### Phase 3: Content & Polish
- Multiple aircraft models
- Mission system
- Sound effects and music
- Improved visual effects

### Phase 4: Optimization & Launch
- Performance tuning
- Mobile support
- Multiplayer (Phase 5)

## Performance

The game targets 60 FPS on mid-range hardware with dynamic quality adjustment.

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

Requires WebGL 2.0 support.

## License

This project is for educational purposes.