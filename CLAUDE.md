# WW2 Combat Flight Simulator - System Design & Architecture

## Project Overview

This is a browser-based WW2 combat flight simulator with cartoon-style graphics, built using TypeScript and Three.js. The game emphasizes arcade-style gameplay with semi-realistic flight physics, making it accessible while maintaining engaging aerial combat.

### Key Design Principles
1. **Arcade Accessibility**: Easy to learn, fun to master
2. **Visual Clarity**: Cartoon style for clear friend/foe identification  
3. **Performance First**: 60 FPS target on mid-range hardware
4. **Modular Architecture**: Clean separation of concerns
5. **Browser-Native**: No plugins, works on modern browsers

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────┐
│                   Game Loop (60Hz)                   │
├─────────────────────────────────────────────────────┤
│  Input Manager → Game Core → Physics → Rendering    │
├─────────────────────────────────────────────────────┤
│         Entities          │        Systems           │
│  - Aircraft               │  - FlightDynamics        │
│  - Projectiles (future)   │  - PhysicsEngine         │
│  - Effects (future)       │  - SceneManager          │
│                          │  - CameraController      │
├─────────────────────────────────────────────────────┤
│                  Utilities & Assets                  │
│  - MaterialFactory        - AircraftConfigs          │
│  - MeshFactory           - Shaders (future)         │
└─────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Game Class (Orchestrator)
- **Responsibility**: Main game loop and system coordination
- **Key Features**:
  - Fixed timestep with delta capping (max 0.1s)
  - System initialization in correct order
  - Debug UI and performance monitoring
  - Window resize handling

#### 2. Aircraft Entity
- **Responsibility**: Player and AI aircraft representation
- **Components**:
  - State management (position, velocity, health)
  - Visual mesh with animated parts
  - Auto-reset system for crashes/boundaries
  - Resource tracking (fuel, ammo)

#### 3. FlightDynamics
- **Responsibility**: Semi-realistic flight physics
- **Forces Calculated**:
  - Thrust (engine power)
  - Lift (wing aerodynamics)
  - Drag (air resistance)
  - Weight (gravity)
- **Special Features**:
  - Stall modeling
  - Control effectiveness vs airspeed
  - Simplified for arcade feel

#### 4. Rendering Pipeline
```
Scene Setup → Shadow Mapping → Main Render → Post-Processing
                                              └─> FXAA Anti-aliasing
```
- **Toon Shading**: Custom gradient maps for cartoon look
- **Shadow System**: PCF soft shadows for depth
- **Post Effects**: FXAA for smooth edges

### System Interactions

#### Input Flow
```
Physical Input → InputManager → FlightControls → Aircraft → FlightDynamics
     ↓                ↓                            ↓
  Keyboard        Normalized        Control      Physics
  Gamepad          Values          Surfaces     Calculation
   Mouse           (-1 to 1)       Animation
```

#### Update Sequence (per frame)
1. **Input Polling**: Gather player input
2. **Physics Update**: Apply forces, integrate motion
3. **Entity Updates**: Aircraft state, animations
4. **Camera Update**: Follow aircraft smoothly
5. **Scene Update**: Environment animations
6. **Render**: Draw frame with post-processing

## Technical Implementation Details

### Coordinate System
- **Three.js Standard**: Right-handed system
- **Y-up**: Altitude increases with positive Y
- **Z-forward**: Default aircraft heading
- **Origin**: Sea level at (0, 0, 0)

### Physics Model

#### Flight Dynamics
- **Lift Equation**: `L = 0.5 * ρ * V² * S * CL(α)`
- **Drag Components**: Parasitic + Induced
- **Stall Angle**: 15° critical AoA
- **Control Authority**: Scales with airspeed

#### Simplifications
- No propeller effects (P-factor, torque)
- Fixed air density (sea level)
- Point mass dynamics (no moments of inertia)
- Symmetric flight only

### Rendering Architecture

#### Material System
- **Toon Materials**: 2-4 step shading
- **Faction Colors**: Visual team identification
- **Outline Shader**: Optional cartoon outlines
- **Transparency**: Cockpit glass with sorting

#### Scene Composition
- **Lighting**: 3-point system (key, fill, rim)
- **Environment**: 
  - Sky shader with dynamic sun position
  - Animated ocean with wave simulation
  - Rolling hills using scaled spheres
  - Mountain ranges for distant backdrop
  - Urban areas with varied building types
  - Forest regions with cartoon-style trees
- **Fog**: Depth cueing and performance optimization
- **Time of Day**: Preset lighting configurations

#### Environment Features
- **Terrain System**:
  - Hills: Multiple scaled spheres for organic shapes
  - Mountains: Cone geometry at 3-4km distance
  - Islands: Preserved for ocean variety
- **Buildings**:
  - Town center at (800, 0, -800) with 25+ buildings
  - Varied heights (60-200m) and styles
  - Industrial hangars near coast
  - Toon-shaded with simple roofs
- **Vegetation**:
  - Three forest areas with 25-40 trees each
  - Individual scattered trees across terrain
  - Multi-sphere foliage for fuller appearance
  - Varied tree types (conical and spherical)

### Performance Optimizations

#### Current Optimizations
- Fixed timestep physics (predictable performance)
- Pixel ratio capping (max 2x for high DPI)
- Shadow map resolution limits (2048x2048)
- Vertex count constraints (~1000 per aircraft)
- Material sharing between instances

#### Memory Management
- Texture caching for gradient ramps
- No dynamic geometry allocation
- Pooling ready for projectiles
- Efficient update loops

## Testing Strategy

### Current Testing Implementation

#### 1. Auto-Reset System Tests
Located in `src/tests/manual-reset-test.ts`:
- **Test 1**: Crash auto-reset (2-second delay)
- **Test 2**: Stuck detection (low speed + low altitude)
- **Test 3**: Boundary enforcement (5km radius)
- **Test 4**: Manual reset cancellation

#### 2. Test Execution
- Browser-based test runner (`test.html`)
- Async test support with timeouts
- Visual test output and logging
- Helper methods in Aircraft class for testing

### Testing Approach

#### Unit Testing Strategy
```typescript
// Component isolation
class MockFlightDynamics {
  calculateForces(): FlightForces {
    return { /* mock forces */ };
  }
}

// State verification
expect(aircraft.getState().health).toBe(100);
expect(aircraft.getPosition().y).toBeGreaterThan(0);
```

#### Integration Testing
- Full game loop testing
- Multi-system interaction verification
- Performance benchmarking
- Visual regression testing (future)

#### Manual Testing Checklist
- [ ] All aircraft types spawn correctly
- [ ] Flight controls responsive
- [ ] Camera modes switch properly
- [ ] Reset functions work (R key)
- [ ] Performance stays above 30 FPS
- [ ] No memory leaks over time

### Debug Tools

#### In-Game Debug UI (F3)
Displays:
- Position and altitude
- Airspeed and heading
- Angle of attack
- Throttle percentage
- Health status
- Crash warnings

#### Development Commands
- **R**: Reset aircraft position
- **T**: Run auto-reset tests
- **1-5**: Camera mode switching
- **F3**: Toggle debug overlay

## Development Workflow

### Code Organization
```
src/
├── core/          # Game logic, configs
├── entities/      # Game objects
├── systems/       # Major subsystems
├── utils/         # Helpers, factories
├── shaders/       # GLSL shaders (future)
└── tests/         # Test files
```

### Build System
- **Vite**: Fast HMR development
- **TypeScript**: Type safety
- **Path Aliases**: Clean imports (@core, @systems, etc.)

### Adding New Features

#### New Aircraft Type
1. Add config to `AircraftConfigs.ts`
2. Create mesh in `MeshFactory.ts`
3. Test flight characteristics
4. Add to selection menu (future)

#### New System
1. Create in `systems/` directory
2. Add to Game initialization
3. Document in component docs
4. Add tests if applicable

## Future Enhancements

### Phase 2: Combat System
- Weapon types (MGs, cannons)
- Projectile physics
- Damage model
- AI opponents
- Hit detection

### Phase 3: Content & Polish  
- Multiple aircraft selection
- Mission system
- Sound effects and music
- Multiplayer support
- Mobile controls

### Technical Improvements
- WebGPU renderer
- Spatial audio
- Weather effects
- Destructible terrain
- Recording/replay system

## Performance Targets

### Minimum Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+
- **Hardware**: 4GB RAM, WebGL 2.0 support
- **Performance**: 30 FPS at 720p Low settings

### Recommended
- **Hardware**: 8GB RAM, dedicated GPU
- **Performance**: 60 FPS at 1080p High settings
- **Network**: N/A (single-player currently)

## Common Issues & Solutions

### Aircraft Gets Stuck
- **Cause**: Low speed at low altitude
- **Solution**: Auto-reset triggers, or press R

### Low Frame Rate
- **Cause**: High pixel ratio or shadows
- **Solution**: Lower quality settings
- **Code**: `renderer.setQuality('low')`

### Controls Not Responding
- **Cause**: Window lost focus
- **Solution**: Click game window
- **Prevention**: Pause on blur (future)

## Commands to Run

### Development
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
```

### Testing
```bash
# Open browser to http://localhost:3000/test.html
# Click "Run All Tests" button
```

### Code Quality
```bash
npm run typecheck    # TypeScript validation
npm run lint         # ESLint checks (if configured)
```

## Architecture Decisions

### Why Three.js?
- Mature WebGL abstraction
- Large ecosystem
- Good documentation
- Active community
- Built-in loaders and helpers

### Why TypeScript?
- Type safety for complex systems
- Better IDE support
- Refactoring confidence
- Self-documenting code

### Why Toon Shading?
- Clear visual style
- Good performance
- Reduces texture needs
- Timeless aesthetic
- Easier asset creation

### Why Fixed Timestep?
- Deterministic physics
- Consistent behavior
- Easier debugging
- Replay compatibility
- Network-ready (future)