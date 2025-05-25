# Aircraft Class

## Overview
The `Aircraft` class represents a flyable aircraft entity in the game. It combines physics simulation, visual representation, input handling, and state management into a cohesive unit. This is the primary entity that players control and interact with.

## Architecture

The Aircraft class integrates multiple systems:
- **Flight Dynamics**: Physics calculations for realistic flight
- **Visual Mesh**: 3D model with animated components
- **State Management**: Comprehensive flight and health state
- **Control System**: Input processing and control surface animation
- **Safety Systems**: Auto-reset and boundary enforcement

## State Management

### AircraftState Interface

```typescript
interface AircraftState {
  // Position and orientation
  position: THREE.Vector3;      // World position
  rotation: THREE.Euler;        // Aircraft orientation
  velocity: THREE.Vector3;      // Linear velocity
  angularVelocity: THREE.Vector3; // Rotational velocity
  
  // Flight parameters
  airspeed: number;            // Current speed in m/s
  altitude: number;            // Height above sea level
  heading: number;             // Compass heading in radians
  angleOfAttack: number;       // AoA in radians
  slipAngle: number;          // Sideslip angle in radians
  throttle: number;           // Engine power (0-1)
  
  // Health and status
  health: number;             // Damage level (0-100)
  fuel: number;               // Fuel remaining (0-100%)
  ammunition: number;         // Rounds remaining
}
```

## Key Features

### 1. Initialization
- Spawns at specified position with cruise speed
- Starts with 70% throttle for stable flight
- Configures based on aircraft type (Spitfire, Bf 109, etc.)
- Creates visual mesh with control surfaces

### 2. Physics Integration
Each frame, the aircraft:
1. Calculates forces via FlightDynamics
2. Applies linear and angular acceleration
3. Updates position and rotation
4. Enforces physics constraints

### 3. Visual Components
The aircraft mesh includes animated parts:
- **Propeller**: Spins based on throttle
- **Elevator**: Pitches with stick input
- **Rudder**: Yaws with pedal input
- **Ailerons**: Roll with stick input

### 4. Auto-Reset System

The aircraft includes multiple safety mechanisms:

#### Crash Detection
- Triggers when altitude ≤ 0 with health > 0
- Sets health to 0 and stops all motion
- Initiates 2-second countdown to auto-reset
- Displays crash warning in debug UI

#### Stuck Detection
- Activates when:
  - Speed < 10 m/s
  - Altitude < 30m
  - Not on ground (altitude > 0.5m)
- Immediately resets position

#### Boundary Enforcement
- 5km radius playable area
- If out of bounds:
  - Speed < 50 m/s: Auto-reset
  - Speed ≥ 50 m/s: Turn toward center

### 5. Resource Management

#### Fuel System
- Consumption rate based on throttle setting
- When depleted, engine stops
- Can be refueled via `refuel()` method

#### Ammunition
- Tracks remaining rounds
- Can be restocked via `rearm()` method

## Methods

### Control Methods

#### `updateControls(controls: FlightControls): void`
Updates the aircraft's control inputs from the InputManager.

#### `update(deltaTime: number): void`
Main update loop that:
1. Calculates physics forces
2. Updates position/rotation
3. Animates visual components
4. Checks collision/boundaries
5. Consumes fuel

### State Access Methods

#### `getState(): Readonly<AircraftState>`
Returns immutable copy of current state.

#### `getPosition(): THREE.Vector3`
Returns current world position.

#### `getVelocity(): THREE.Vector3`
Returns current velocity vector.

#### `getMesh(): THREE.Group`
Returns the 3D mesh for rendering.

### Combat Methods

#### `takeDamage(amount: number): void`
Applies damage, clamped to 0-100 range.

#### `repair(amount: number): void`
Restores health, capped at 100.

### Utility Methods

#### `reset(): void`
Resets aircraft to spawn state:
- Position: (0, 500, 0)
- Heading: North
- Speed: Cruise speed
- Health/Fuel: 100%
- Clears reset timers

#### `refuel(amount: number): void`
Adds fuel, capped at 100%.

#### `rearm(): void`
Restores ammunition to maximum.

### Test Helper Methods

#### `_testSetState(updates: Partial<AircraftState>): void`
Allows direct state manipulation for testing.

#### `_testCheckCollisions(): void`
Manually triggers collision detection for testing.

## Physics Calculations

### Force Application
```typescript
acceleration = totalForce / mass
velocity += acceleration * deltaTime
position += velocity * deltaTime
```

### Angular Motion
- Control effectiveness scales with airspeed
- Angular velocity includes damping (0.92 factor)
- Rotation uses quaternion multiplication for stability

### Flight Parameters

#### Angle of Attack (AoA)
Calculated from velocity vector in aircraft's local space:
```typescript
AoA = atan2(-localVelocity.y, localVelocity.z)
```

#### Slip Angle
Measures sideways airflow:
```typescript
slipAngle = atan2(localVelocity.x, localVelocity.z)
```

## Usage Example

```typescript
// Create aircraft
const aircraft = new Aircraft({
  position: new THREE.Vector3(0, 1000, 0),
  rotation: new THREE.Euler(0, Math.PI, 0), // Face south
  type: 'spitfire'
});

// Add to scene
scene.add(aircraft.getMesh());

// Game loop
function update(deltaTime: number) {
  // Apply player input
  aircraft.updateControls(inputManager.getControls());
  
  // Update physics and visuals
  aircraft.update(deltaTime);
  
  // Check state
  const state = aircraft.getState();
  if (state.health === 0) {
    console.log('Aircraft destroyed!');
  }
}
```

## Performance Considerations

- State updates happen at 60Hz
- Visual animations are frame-rate independent
- Position/rotation matrices cached by Three.js
- Collision checks optimized with early returns
- Timer management prevents multiple concurrent resets

## Safety Features

1. **Spawn Protection**: Starts with stable flight parameters
2. **Stuck Prevention**: Auto-detects and recovers from stuck states
3. **Boundary Enforcement**: Keeps aircraft in playable area
4. **Crash Recovery**: Automatic respawn after crashes
5. **Timer Management**: Prevents reset loops and race conditions

## Future Enhancements

- Damage model affecting flight characteristics
- Multiple weapon systems with different ammunition
- Engine temperature and overheat mechanics
- Detailed damage states (engine, wings, control surfaces)
- Smoke and damage particle effects
- G-force blackout/redout effects
- Trim settings for hands-off flight
- Autopilot for AI control
- Formation flying support
- Carrier landing capability