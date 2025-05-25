# FlightDynamics Class

## Overview
The `FlightDynamics` class implements a semi-realistic flight physics model for WW2-era fighter aircraft. It calculates aerodynamic forces (lift, drag, thrust, weight) and determines how control inputs affect the aircraft's motion through the air.

## Physics Model

### Force Components

The flight model calculates four primary forces acting on the aircraft:

1. **Thrust**: Forward force from the engine
2. **Lift**: Upward force from wings
3. **Drag**: Resistance force opposing motion
4. **Weight**: Gravitational force

### Coordinate System
- Uses Three.js right-handed coordinate system
- Y-axis points up (altitude)
- Z-axis points forward (default aircraft heading)
- Forces are calculated in world space

## Key Methods

### `calculateForces(state: AircraftState, controls: FlightControls, deltaTime: number): FlightForces`
Main entry point that calculates all forces acting on the aircraft.

**Returns:**
```typescript
interface FlightForces {
  thrust: THREE.Vector3;
  lift: THREE.Vector3;
  drag: THREE.Vector3;
  weight: THREE.Vector3;
  total: THREE.Vector3;         // Sum of all forces
  controlEffectiveness: number; // 0-1 multiplier for control surfaces
}
```

### Force Calculations

#### Thrust Calculation
```typescript
thrustMagnitude = throttle * maxThrust
```
- Linear relationship with throttle input
- Applied along aircraft's forward vector
- No thrust vectoring (fixed direction)

#### Lift Calculation
Implements simplified lift equation:
```
L = 0.5 * ρ * V² * S * CL
```
Where:
- ρ = air density (1.225 kg/m³)
- V = airspeed
- S = wing area
- CL = lift coefficient (varies with angle of attack)

**Special Features:**
- Minimum lift at low speeds prevents getting stuck
- Progressive stall modeling above 15° AoA
- Lift acts perpendicular to velocity

#### Drag Calculation
Combines parasitic and induced drag:
```
D_total = D_parasitic + D_induced
```

**Parasitic Drag:**
```
D_p = 0.5 * ρ * V² * CD * S
```

**Induced Drag:**
```
D_i = CL² / (π * AR * e)
```
Where AR is aspect ratio and e is efficiency factor (0.8)

#### Weight Calculation
Simple gravitational force:
```
W = mass * g
```
Always acts downward in world space.

### Control Effectiveness

The `calculateControlEffectiveness()` method models how control surfaces lose authority at low speeds:

- Below 50% stall speed: 10% effectiveness
- Between 50% stall speed and cruise: Linear interpolation
- Above cruise speed: 100% effectiveness

This prevents unrealistic maneuvers at low speeds.

## Aerodynamic Modeling

### Lift Coefficient Curve
Models a simplified lift curve with linear and stall regions:

```
             CL
              ^
         1.2  |    /----
              |   /
              |  /
              | /
    ------+---+---------> α (angle of attack)
             15°
              |
              |
```

- Linear increase up to 15° (stall angle)
- Sudden drop after stall
- Post-stall CL ≈ 0.5 * pre-stall

### Stall Modeling

The `calculateStallFactor()` method implements progressive stall:
- No effect below critical AoA (15°)
- Gradual lift loss from 15° to 25°
- Minimum 30% lift retention in deep stall

### Helper Methods

#### `isStalled(state: AircraftState): boolean`
Determines if aircraft is in stall condition based on:
- Angle of attack > 15°
- Airspeed < 90% of stall speed

#### `getOptimalClimbAngle(state: AircraftState): number`
Returns best climb angle based on current speed:
- Low speed (< 0.6 × cruise): 5°
- Normal speed (0.6-1.2 × cruise): 15°
- High speed (> 1.2 × cruise): 10°

#### `getMaxTurnRate(state: AircraftState): number`
Calculates maximum sustainable turn rate considering:
- G-limit (6G for WW2 fighters)
- Current airspeed
- Aircraft roll rate limit

## Physical Constants

| Constant | Value | Units | Description |
|----------|-------|-------|-------------|
| Air Density | 1.225 | kg/m³ | Sea level standard |
| Gravity | 9.81 | m/s² | Earth gravity |
| Stall Angle | 15 | degrees | Critical angle of attack |
| G-Limit | 6 | G | Structural limit |
| Efficiency | 0.8 | - | Oswald efficiency factor |

## Usage Example

```typescript
const dynamics = new FlightDynamics(aircraftConfig);

// In update loop
const forces = dynamics.calculateForces(
  aircraftState,
  playerControls,
  deltaTime
);

// Apply forces to physics simulation
const acceleration = forces.total.divideScalar(config.mass);
velocity.add(acceleration.multiplyScalar(deltaTime));
```

## Simplifications and Assumptions

1. **No propeller effects**: P-factor, torque, and slipstream ignored
2. **Fixed air density**: No altitude effects on performance
3. **Simplified stall**: Binary rather than progressive wing stall
4. **No ground effect**: Lift doesn't increase near ground
5. **Symmetric flight**: No adverse yaw or differential drag
6. **Point mass**: No rotational inertia calculations

## Performance Notes

- All calculations use single-precision floating point
- Forces calculated once per physics frame (60Hz)
- Vector operations optimized using Three.js methods
- No dynamic memory allocation in hot path

## Future Enhancements

- Altitude-dependent air density
- Propeller wash effects on tail surfaces
- Ground effect modeling
- Asymmetric stall and spin dynamics
- Damage effects on aerodynamics
- Wind and turbulence
- Compressibility effects at high speed