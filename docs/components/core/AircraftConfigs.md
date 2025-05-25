# AircraftConfigs Module

## Overview
The `AircraftConfigs` module defines the performance characteristics and specifications for all flyable aircraft in the game. It provides a data-driven approach to aircraft modeling, allowing easy addition of new aircraft types without code changes.

## Data Structure

### AircraftConfig Interface

```typescript
interface AircraftConfig {
  // Identity
  name: string;                    // Full aircraft name
  faction: 'allies' | 'axis' | 'neutral'; // Faction affiliation
  
  // Physical properties
  mass: number;                    // Empty weight in kg
  wingArea: number;                // Wing area in m²
  wingSpan: number;                // Wingspan in meters
  aspectRatio: number;             // Wing efficiency (span²/area)
  
  // Performance characteristics
  maxSpeed: number;                // Maximum speed in m/s
  cruiseSpeed: number;             // Efficient cruise speed in m/s
  stallSpeed: number;              // Minimum flight speed in m/s
  maxThrust: number;               // Engine power in Newtons
  serviceCeiling: number;          // Maximum altitude in meters
  
  // Maneuverability
  pitchRate: number;               // Pitch rate in rad/s
  rollRate: number;                // Roll rate in rad/s
  yawRate: number;                 // Yaw rate in rad/s
  
  // Aerodynamic coefficients
  liftCoefficient: number;         // Maximum lift coefficient
  dragCoefficient: number;         // Parasitic drag coefficient
  
  // Combat properties
  armor: number;                   // Damage reduction (0-1)
  firepower: number;               // Damage multiplier
  maxAmmunition: number;           // Total rounds
  
  // Fuel system
  fuelCapacity: number;            // Fuel capacity in liters
  fuelConsumptionRate: number;     // Liters/second at full throttle
}
```

## Aircraft Database

### Available Aircraft

#### Supermarine Spitfire (allies)
The iconic British fighter known for its elliptical wings and excellent handling.

**Key Characteristics:**
- Excellent roll rate (3.0 rad/s)
- Balanced performance
- Good armor protection (0.8)
- High ammunition capacity (1,880 rounds)

**Historical Note:** 8× .303 Browning machine guns

#### Messerschmitt Bf 109 (axis)
The backbone of the Luftwaffe with excellent climb and dive performance.

**Key Characteristics:**
- Superior pitch rate (2.8 rad/s)
- Highest armor value (0.9)
- Best firepower (1.2x multiplier)
- Compact design (smallest wing area)

**Historical Note:** Mixed armament with cannon and machine guns

#### North American P-51 Mustang (allies)
The long-range escort fighter with exceptional high-altitude performance.

**Key Characteristics:**
- Highest top speed (190 m/s)
- Largest fuel capacity (1,020L with drop tanks)
- Excellent roll rate (3.2 rad/s)
- Highest service ceiling (12,800m)

**Historical Note:** 6× .50 caliber machine guns

#### Mitsubishi A6M Zero (axis)
The legendary Japanese fighter emphasizing maneuverability over protection.

**Key Characteristics:**
- Best maneuverability (3.5 rad/s roll rate)
- Lowest stall speed (40 m/s)
- Minimal armor (0.5) - historically accurate
- Most fuel-efficient (0.6 L/s consumption)

**Historical Note:** Sacrificed protection for range and agility

## Performance Comparison

| Aircraft | Speed | Maneuver | Armor | Range |
|----------|-------|----------|-------|-------|
| Spitfire | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★☆☆ |
| Bf 109 | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★☆☆ |
| P-51 | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| Zero | ★★★☆☆ | ★★★★★ | ★★☆☆☆ | ★★★★☆ |

## API Functions

### `getAircraftConfig(type: string): AircraftConfig`
Retrieves configuration for a specific aircraft type.

**Parameters:**
- `type`: Aircraft identifier (e.g., 'spitfire', 'bf109')

**Returns:** Copy of aircraft configuration

**Throws:** Error if aircraft type not found

### `getAllAircraftTypes(): string[]`
Returns array of all available aircraft type identifiers.

### `getAircraftByFaction(faction: 'allies' | 'axis' | 'neutral'): string[]`
Filters aircraft by faction affiliation.

**Parameters:**
- `faction`: Faction to filter by

**Returns:** Array of aircraft type identifiers

## Design Decisions

### Historical Accuracy vs Gameplay
- Speeds scaled to ~1/3 historical values for playability
- Turn rates enhanced for arcade-style combat
- Armor values balanced for fun rather than strict realism

### Performance Scaling
All aircraft use consistent scaling factors:
- Speed: Historical km/h ÷ 3.6 = game m/s
- Mass: Historical empty weight
- Fuel: Historical internal capacity

### Balance Philosophy
Each aircraft has distinct strengths:
- **Spitfire**: All-rounder, jack of all trades
- **Bf 109**: Tank - high armor and firepower
- **P-51**: Boom and zoom - speed and range
- **Zero**: Turn fighter - agility over survivability

## Usage Examples

```typescript
// Get specific aircraft
const spitfireConfig = getAircraftConfig('spitfire');

// List all Axis aircraft
const axisPlanes = getAircraftByFaction('axis');
console.log(axisPlanes); // ['bf109', 'zero']

// Create aircraft with config
const aircraft = new Aircraft({
  position: new Vector3(0, 1000, 0),
  rotation: new Euler(0, 0, 0),
  type: 'p51mustang'
});
```

## Adding New Aircraft

To add a new aircraft, add an entry to `AIRCRAFT_CONFIGS`:

```typescript
AIRCRAFT_CONFIGS['fw190'] = {
  name: 'Focke-Wulf Fw 190',
  faction: 'axis',
  mass: 3200,
  // ... rest of configuration
};
```

## Future Enhancements

- Variable loadouts (different weapon configurations)
- Upgrade system for performance modifications
- Historical variants (Mk.I, Mk.II, etc.)
- Experimental and prototype aircraft
- Dynamic damage effects on performance
- Altitude-based performance curves
- Custom player aircraft configurations