# Flight Physics System - Technical Specification

## Overview
The flight physics system balances realism with arcade accessibility, providing intuitive controls while maintaining the feel of WW2 aircraft.

## Physics Model

### Core Forces

```typescript
interface ForceVector {
  x: number;
  y: number;
  z: number;
}

interface FlightForces {
  thrust: ForceVector;
  lift: ForceVector;
  drag: ForceVector;
  weight: ForceVector;
}
```

### Lift Calculation
```typescript
function calculateLift(
  velocity: number,
  angleOfAttack: number,
  airDensity: number,
  wingArea: number,
  liftCoefficient: number
): number {
  // Simplified lift equation
  const dynamicPressure = 0.5 * airDensity * velocity * velocity;
  const clAlpha = liftCoefficient * Math.cos(angleOfAttack);
  
  // Stall modeling
  const stallAngle = 15 * (Math.PI / 180); // 15 degrees
  const stallFactor = angleOfAttack > stallAngle ? 
    0.3 : 1.0; // Dramatic lift loss
  
  return dynamicPressure * wingArea * clAlpha * stallFactor;
}
```

### Drag Components
1. **Parasitic Drag**: Increases with velocity squared
2. **Induced Drag**: Increases with angle of attack
3. **Combat Damage**: Additional drag from damaged components

```typescript
function calculateDrag(
  velocity: number,
  angleOfAttack: number,
  dragCoefficient: number,
  damageMultiplier: number = 1.0
): number {
  const parasitic = dragCoefficient * velocity * velocity;
  const induced = 0.1 * Math.sin(angleOfAttack) * velocity;
  
  return (parasitic + induced) * damageMultiplier;
}
```

## Flight Control System

### Input Processing
```typescript
class FlightControls {
  // Control surfaces
  elevator: number = 0;    // -1 to 1 (down to up)
  aileron: number = 0;     // -1 to 1 (left to right)
  rudder: number = 0;      // -1 to 1 (left to right)
  throttle: number = 0.5;  // 0 to 1
  
  // Input smoothing
  smoothInput(raw: number, current: number, delta: number): number {
    const smoothingFactor = 0.1;
    return current + (raw - current) * smoothingFactor * delta;
  }
  
  // Control effectiveness based on airspeed
  getControlEffectiveness(airspeed: number, stallSpeed: number): number {
    const minEffectiveness = 0.1;
    const normalizedSpeed = airspeed / (stallSpeed * 2);
    
    return Math.max(minEffectiveness, Math.min(1.0, normalizedSpeed));
  }
}
```

### Aircraft State
```typescript
interface AircraftState {
  // Position
  position: Vector3;
  
  // Orientation (quaternion for smooth rotations)
  rotation: Quaternion;
  
  // Velocities
  velocity: Vector3;        // World space
  localVelocity: Vector3;   // Aircraft space
  angularVelocity: Vector3;
  
  // Flight parameters
  airspeed: number;
  altitude: number;
  heading: number;
  angleOfAttack: number;
  slipAngle: number;
  
  // Engine
  rpm: number;
  temperature: number;
  fuel: number;
}
```

## Simplified Flight Dynamics

### Update Loop
```typescript
class FlightPhysics {
  private state: AircraftState;
  private aircraft: AircraftConfig;
  
  update(deltaTime: number, controls: FlightControls): void {
    // 1. Apply control inputs to angular velocities
    this.applyControlForces(controls, deltaTime);
    
    // 2. Update orientation
    this.updateRotation(deltaTime);
    
    // 3. Calculate aerodynamic forces
    const forces = this.calculateForces(controls.throttle);
    
    // 4. Apply forces to velocity
    this.applyForces(forces, deltaTime);
    
    // 5. Update position
    this.updatePosition(deltaTime);
    
    // 6. Ground collision check
    this.checkGroundCollision();
    
    // 7. Update derived values
    this.updateFlightParameters();
  }
  
  private applyControlForces(controls: FlightControls, dt: number): void {
    const effectiveness = this.getControlEffectiveness();
    
    // Pitch (elevator)
    const pitchRate = controls.elevator * this.aircraft.pitchRate * effectiveness;
    this.state.angularVelocity.x += pitchRate * dt;
    
    // Roll (aileron)
    const rollRate = controls.aileron * this.aircraft.rollRate * effectiveness;
    this.state.angularVelocity.z += rollRate * dt;
    
    // Yaw (rudder)
    const yawRate = controls.rudder * this.aircraft.yawRate * effectiveness;
    this.state.angularVelocity.y += yawRate * dt;
    
    // Apply damping
    this.state.angularVelocity.multiplyScalar(0.95);
  }
}
```

## Aircraft Configuration

### Base Aircraft Properties
```typescript
interface AircraftConfig {
  // Physical properties
  mass: number;              // kg
  wingArea: number;          // m²
  wingSpan: number;          // m
  
  // Performance characteristics
  maxSpeed: number;          // m/s
  cruiseSpeed: number;       // m/s
  stallSpeed: number;        // m/s
  maxThrust: number;         // Newtons
  
  // Maneuverability
  pitchRate: number;         // rad/s
  rollRate: number;          // rad/s
  yawRate: number;           // rad/s
  
  // Aerodynamic coefficients
  liftCoefficient: number;
  dragCoefficient: number;
  
  // Combat properties
  armor: number;
  firepower: number;
}
```

### Example Aircraft Configurations
```typescript
const AIRCRAFT_CONFIGS = {
  spitfire: {
    mass: 3000,
    wingArea: 22.5,
    maxSpeed: 180,      // ~650 km/h
    cruiseSpeed: 140,
    stallSpeed: 45,
    maxThrust: 25000,
    pitchRate: 2.5,
    rollRate: 3.0,
    yawRate: 1.5,
    liftCoefficient: 1.2,
    dragCoefficient: 0.025,
    armor: 0.8,
    firepower: 1.0
  },
  
  bf109: {
    mass: 2800,
    wingArea: 16.2,
    maxSpeed: 175,
    cruiseSpeed: 135,
    stallSpeed: 50,
    maxThrust: 24000,
    pitchRate: 2.8,
    rollRate: 2.8,
    yawRate: 1.6,
    liftCoefficient: 1.1,
    dragCoefficient: 0.023,
    armor: 0.9,
    firepower: 1.2
  },
  
  p51mustang: {
    mass: 3500,
    wingArea: 21.8,
    maxSpeed: 190,
    cruiseSpeed: 150,
    stallSpeed: 48,
    maxThrust: 28000,
    pitchRate: 2.3,
    rollRate: 3.2,
    yawRate: 1.4,
    liftCoefficient: 1.15,
    dragCoefficient: 0.024,
    armor: 0.7,
    firepower: 1.1
  }
};
```

## Special Maneuvers

### Stall Recovery
```typescript
class StallRecovery {
  isStalled: boolean = false;
  stallTimer: number = 0;
  
  checkStall(aoa: number, airspeed: number, stallSpeed: number): void {
    const criticalAOA = 15 * (Math.PI / 180);
    
    if (aoa > criticalAOA || airspeed < stallSpeed * 0.9) {
      if (!this.isStalled) {
        this.isStalled = true;
        this.stallTimer = 0;
        // Trigger stall effects
      }
    }
    
    // Recovery conditions
    if (this.isStalled && aoa < criticalAOA * 0.8 && airspeed > stallSpeed) {
      this.isStalled = false;
    }
  }
  
  applyStallEffects(state: AircraftState): void {
    if (this.isStalled) {
      // Nose drops
      state.angularVelocity.x += 0.5;
      
      // Reduced control authority
      // Applied in control effectiveness calculation
      
      // Wing drop (random)
      if (this.stallTimer < 0.1) {
        state.angularVelocity.z += (Math.random() - 0.5) * 2;
      }
    }
  }
}
```

### Energy Management
```typescript
class EnergyManagement {
  // Convert altitude to speed (dive)
  // Convert speed to altitude (climb)
  
  calculateTotalEnergy(
    mass: number,
    velocity: number,
    altitude: number
  ): number {
    const g = 9.81;
    const kineticEnergy = 0.5 * mass * velocity * velocity;
    const potentialEnergy = mass * g * altitude;
    
    return kineticEnergy + potentialEnergy;
  }
  
  // Optimal climb angle based on current energy
  calculateOptimalClimb(
    currentSpeed: number,
    optimalClimbSpeed: number
  ): number {
    const speedRatio = currentSpeed / optimalClimbSpeed;
    
    if (speedRatio < 0.8) return 0; // Too slow
    if (speedRatio > 1.5) return 30 * (Math.PI / 180); // Convert excess speed
    
    return 15 * (Math.PI / 180); // Normal climb
  }
}
```

## Integration with Game Systems

### Damage Effects on Flight
```typescript
interface DamageEffects {
  // Engine damage reduces thrust
  engineMultiplier: number;
  
  // Wing damage affects lift and increases drag
  wingMultiplier: number;
  
  // Control surface damage reduces effectiveness
  elevatorMultiplier: number;
  aileronMultiplier: number;
  rudderMultiplier: number;
  
  // Fuel leak rate
  fuelLeakRate: number;
}

function applyDamageToFlight(
  damage: DamageEffects,
  forces: FlightForces
): FlightForces {
  forces.thrust.multiplyScalar(damage.engineMultiplier);
  forces.lift.multiplyScalar(damage.wingMultiplier);
  forces.drag.multiplyScalar(1 + (1 - damage.wingMultiplier) * 0.5);
  
  return forces;
}
```

### Environmental Effects
```typescript
interface EnvironmentalFactors {
  windVelocity: Vector3;
  turbulence: number;
  airDensity: number; // Varies with altitude
}

function applyEnvironment(
  state: AircraftState,
  env: EnvironmentalFactors,
  dt: number
): void {
  // Wind effect
  state.velocity.add(env.windVelocity.multiplyScalar(dt));
  
  // Turbulence
  if (env.turbulence > 0) {
    const shake = new Vector3(
      (Math.random() - 0.5) * env.turbulence,
      (Math.random() - 0.5) * env.turbulence,
      (Math.random() - 0.5) * env.turbulence
    );
    state.angularVelocity.add(shake);
  }
}
```

## Performance Considerations

### Fixed Timestep Physics
```typescript
class PhysicsEngine {
  private accumulator: number = 0;
  private readonly fixedTimestep: number = 1/60; // 60Hz
  
  update(deltaTime: number): void {
    this.accumulator += deltaTime;
    
    while (this.accumulator >= this.fixedTimestep) {
      this.fixedUpdate(this.fixedTimestep);
      this.accumulator -= this.fixedTimestep;
    }
    
    // Interpolate rendering position
    const alpha = this.accumulator / this.fixedTimestep;
    this.interpolateRenderState(alpha);
  }
}
```

### Optimization Strategies
1. **Simplified calculations** for distant aircraft
2. **LOD physics** - Full physics for player, simplified for AI
3. **Spatial partitioning** for collision detection
4. **Precomputed lookup tables** for trigonometric functions