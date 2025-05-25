# Flight Physics System - Technical Specification

## Overview
The flight physics system balances realism with arcade accessibility, providing intuitive controls while maintaining the feel of WW2 aircraft. Recent improvements focus on realistic throttle response, gravity effects on pitch, and lifelike stalling behavior.

## Recent Improvements (v2.0)

### 1. Enhanced Engine Response System
The engine now features realistic throttle lag and RPM modeling:

```typescript
interface EngineState {
  actualThrottle: number;  // Current engine power (0-1)
  targetThrottle: number;  // Desired throttle setting
  rpm: number;            // Engine RPM
  temperature: number;    // Engine temperature
}

// Engine response characteristics
throttleResponseRate: 2.5; // How fast throttle responds (per second)
rpmResponseRate: 1.8;      // How fast RPM changes (per second)
idleRpm: 800;
maxRpm: 2800;
```

### 2. Gravity Effects on Pitch
Gravity now properly affects acceleration/deceleration based on aircraft attitude:

```typescript
private calculateWeight(state: AircraftState): THREE.Vector3 {
  const weightMagnitude = this.config.mass * this.gravity;
  
  // Weight always acts straight down in world coordinates
  const weightVector = new THREE.Vector3(0, -weightMagnitude, 0);
  
  // Add gravity component that affects forward acceleration based on pitch
  // When pitched down, gravity helps accelerate the aircraft forward
  // When pitched up, gravity helps decelerate the aircraft
  const pitchAngle = state.rotation.x;
  const gravityForwardComponent = Math.sin(pitchAngle) * weightMagnitude;
  
  const forward = new THREE.Vector3(0, 0, 1);
  forward.applyEuler(state.rotation);
  
  const gravityForward = forward.multiplyScalar(gravityForwardComponent);
  
  return weightVector.add(gravityForward);
}
```

### 3. Realistic Stalling Behavior
Improved stall modeling with progressive and deep stall characteristics:

```typescript
private calculateStallEffects(state: AircraftState): { 
  liftReduction: number; 
  dragIncrease: number; 
  pitchMoment: number 
} {
  const alpha = Math.abs(state.angleOfAttack * 180 / Math.PI);
  const criticalAOA = 15; // Critical angle of attack
  const deepStallAOA = 25; // Deep stall begins
  
  if (alpha <= criticalAOA) {
    // No stall
    return { liftReduction: 1.0, dragIncrease: 1.0, pitchMoment: 0 };
  } else if (alpha <= deepStallAOA) {
    // Progressive stall
    const stallProgress = (alpha - criticalAOA) / (deepStallAOA - criticalAOA);
    const liftReduction = 1.0 - stallProgress * 0.6; // Lose up to 60% lift
    const dragIncrease = 1.0 + stallProgress * 2.0; // Drag increases significantly
    const pitchMoment = -stallProgress * 0.5; // Nose-down pitching moment
    
    return { liftReduction, dragIncrease, pitchMoment };
  } else {
    // Deep stall - very difficult to recover
    const deepStallProgress = Math.min(1.0, (alpha - deepStallAOA) / 20);
    const liftReduction = 0.4 - deepStallProgress * 0.2; // 20-40% lift remaining
    const dragIncrease = 3.0 + deepStallProgress * 2.0; // Very high drag
    const pitchMoment = -0.8 - deepStallProgress * 0.4; // Strong nose-down moment
    
    return { liftReduction, dragIncrease, pitchMoment };
  }
}
```

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
  total: ForceVector;
  controlEffectiveness: number;
}
```

### Improved Lift Calculation
```typescript
private calculateLift(state: AircraftState): THREE.Vector3 {
  const velocity = state.airspeed;
  const velocitySquared = velocity * velocity;
  
  // Simplified lift equation: L = 0.5 * ρ * V² * S * CL
  const dynamicPressure = 0.5 * this.airDensity * velocitySquared;
  
  // Lift coefficient varies with angle of attack
  const cl = this.calculateLiftCoefficient(state.angleOfAttack);
  
  let liftMagnitude = dynamicPressure * this.config.wingArea * cl;
  
  // Apply stall effects with improved modeling
  const stallEffects = this.calculateStallEffects(state);
  liftMagnitude *= stallEffects.liftReduction;
  
  // Lift acts perpendicular to velocity, in the aircraft's up direction
  const up = new THREE.Vector3(0, 1, 0);
  up.applyEuler(state.rotation);
  
  // Minimum lift only at very low speeds to prevent ground sticking
  const minLift = velocity > 5 ? this.config.mass * this.gravity * 0.2 : 0;
  const finalLift = Math.max(liftMagnitude, minLift);
  
  return up.multiplyScalar(finalLift);
}
```

### Enhanced Drag Calculation
```typescript
private calculateDrag(state: AircraftState): THREE.Vector3 {
  const velocity = state.airspeed;
  const velocitySquared = velocity * velocity;
  
  // Base drag
  const dynamicPressure = 0.5 * this.airDensity * velocitySquared;
  let parasticDrag = dynamicPressure * this.config.dragCoefficient * this.config.wingArea;
  
  // Induced drag (increases with angle of attack)
  const cl = this.calculateLiftCoefficient(state.angleOfAttack);
  const inducedDragCoeff = Math.pow(cl, 2) / (Math.PI * this.config.aspectRatio * 0.8);
  let inducedDrag = dynamicPressure * inducedDragCoeff * this.config.wingArea;
  
  // Apply stall effects to drag
  const stallEffects = this.calculateStallEffects(state);
  parasticDrag *= stallEffects.dragIncrease;
  inducedDrag *= stallEffects.dragIncrease;
  
  const totalDrag = parasticDrag + inducedDrag;
  
  // Drag opposes velocity
  if (velocity > 0.1) {
    const dragDirection = state.velocity.clone().normalize().multiplyScalar(-1);
    return dragDirection.multiplyScalar(totalDrag);
  }
  
  return new THREE.Vector3(0, 0, 0);
}
```

## Engine System

### Throttle Response
```typescript
private updateEngineState(controls: FlightControls, deltaTime: number): void {
  // Update target throttle
  this.engineState.targetThrottle = controls.throttle;
  
  // Engine throttle response with lag
  const throttleDiff = this.engineState.targetThrottle - this.engineState.actualThrottle;
  const throttleChange = Math.sign(throttleDiff) * this.throttleResponseRate * deltaTime;
  
  if (Math.abs(throttleDiff) > Math.abs(throttleChange)) {
    this.engineState.actualThrottle += throttleChange;
  } else {
    this.engineState.actualThrottle = this.engineState.targetThrottle;
  }
  
  // Update RPM based on actual throttle
  const targetRpm = this.idleRpm + (this.maxRpm - this.idleRpm) * this.engineState.actualThrottle;
  const rpmDiff = targetRpm - this.engineState.rpm;
  const rpmChange = Math.sign(rpmDiff) * this.rpmResponseRate * deltaTime * 100;
  
  if (Math.abs(rpmDiff) > Math.abs(rpmChange)) {
    this.engineState.rpm += rpmChange;
  } else {
    this.engineState.rpm = targetRpm;
  }
}
```

### Engine Efficiency Curve
```typescript
private getThrottleEfficiency(throttle: number): number {
  // Engine efficiency curve - not perfectly linear
  // Low throttle is less efficient, peak efficiency around 80%
  if (throttle < 0.1) return 0.3;
  if (throttle < 0.3) return 0.5 + throttle * 1.67; // 0.5 to 1.0
  if (throttle < 0.8) return 0.85 + throttle * 0.1875; // 0.85 to 1.0
  return 1.0 - (throttle - 0.8) * 0.25; // 1.0 to 0.95 (overheating)
}
```

## Flight Control System

### Input Processing
```typescript
class FlightControls {
  // Control surfaces
  pitch: number = 0;       // -1 to 1 (down to up)
  roll: number = 0;        // -1 to 1 (left to right)
  yaw: number = 0;         // -1 to 1 (left to right)
  throttle: number = 0.5;  // 0 to 1
  
  // Additional controls
  brake: boolean = false;
  boost: boolean = false;
  fire: boolean = false;
  lookBack: boolean = false;
  pause: boolean = false;
}
```

### Aircraft State
```typescript
interface AircraftState {
  // Position and orientation
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  
  // Flight parameters
  airspeed: number;
  altitude: number;
  heading: number;
  angleOfAttack: number;
  slipAngle: number;
  throttle: number;
  
  // Health and status
  health: number;
  fuel: number;
  ammunition: number;
}
```

## Testing Framework

### Comprehensive Physics Tests
The system now includes extensive testing for all physics improvements:

1. **Throttle Response Tests**: Verify engine lag and RPM correlation
2. **Pitch Gravity Tests**: Confirm speed changes with pitch attitude
3. **Stall Behavior Tests**: Validate progressive vs. deep stall characteristics
4. **Engine Characteristics Tests**: Test efficiency curves and altitude effects
5. **Stall Recovery Tests**: Ensure proper recovery mechanics
6. **Deep Stall Tests**: Verify difficulty of deep stall recovery

### Test Execution
```bash
# Browser tests (press T in-game)
npm run dev

# Standalone test runner
npx tsx test-runner.ts

# Manual browser tests
Open test.html in browser
```

## Integration Features

### Debug Information
Enhanced debug display shows:
- Input vs. actual throttle
- Engine RPM and temperature
- Stall detection and severity
- Real-time aerodynamic status

### Flight Instruments
Real-time flight instruments display:
- Airspeed indicator (left)
- Altimeter (right)
- Updates continuously from aircraft state

## Performance Considerations

### Optimizations
1. **Efficient stall calculations** with lookup tables
2. **Smooth engine state transitions** to prevent jitter
3. **Realistic but simplified** physics model
4. **Fixed timestep physics** for consistency

### Validation
All physics improvements have been tested for:
- Realistic behavior patterns
- Stable performance
- Intuitive feel for arcade gameplay
- Educational value for flight simulation

## Future Enhancements

### Planned Improvements
1. **Wind effects** on flight dynamics
2. **Propeller wash** effects on control surfaces
3. **Ground effect** physics near terrain
4. **Temperature effects** on engine performance
5. **Fuel consumption** based on throttle and altitude

### Advanced Features
1. **Multi-engine aircraft** support
2. **Asymmetric thrust** modeling
3. **Flap and gear** aerodynamic effects
4. **Compressibility effects** at high speeds