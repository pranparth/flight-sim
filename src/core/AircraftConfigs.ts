export interface AircraftConfig {
  // Identity
  name: string;
  faction: 'allies' | 'axis' | 'neutral';
  
  // Physical properties
  mass: number;              // kg
  wingArea: number;          // m²
  wingSpan: number;          // m
  aspectRatio: number;       // wingSpan² / wingArea
  
  // Performance characteristics
  maxSpeed: number;          // m/s
  cruiseSpeed: number;       // m/s
  stallSpeed: number;        // m/s
  maxThrust: number;         // Newtons
  serviceeCeiling: number;   // meters
  
  // Maneuverability
  pitchRate: number;         // rad/s
  rollRate: number;          // rad/s
  yawRate: number;           // rad/s
  
  // Aerodynamic coefficients
  liftCoefficient: number;
  dragCoefficient: number;
  
  // Combat properties
  armor: number;             // damage reduction factor (0-1)
  firepower: number;         // damage multiplier
  maxAmmunition: number;     // rounds
  
  // Fuel
  fuelCapacity: number;      // liters
  fuelConsumptionRate: number; // liters per second at full throttle
}

const AIRCRAFT_CONFIGS: Record<string, AircraftConfig> = {
  spitfire: {
    name: 'Supermarine Spitfire',
    faction: 'allies',
    mass: 3000,
    wingArea: 22.5,
    wingSpan: 11.2,
    aspectRatio: 5.6,
    maxSpeed: 180,      // ~650 km/h
    cruiseSpeed: 140,
    stallSpeed: 45,
    maxThrust: 25000,
    serviceeCeiling: 11000,
    pitchRate: 2.5,
    rollRate: 3.0,
    yawRate: 1.5,
    liftCoefficient: 1.2,
    dragCoefficient: 0.025,
    armor: 0.8,
    firepower: 1.0,
    maxAmmunition: 1880, // 8x .303 Browning
    fuelCapacity: 386,
    fuelConsumptionRate: 0.8,
  },
  
  bf109: {
    name: 'Messerschmitt Bf 109',
    faction: 'axis',
    mass: 2800,
    wingArea: 16.2,
    wingSpan: 9.9,
    aspectRatio: 6.1,
    maxSpeed: 175,      // ~630 km/h
    cruiseSpeed: 135,
    stallSpeed: 50,
    maxThrust: 24000,
    serviceeCeiling: 12000,
    pitchRate: 2.8,
    rollRate: 2.8,
    yawRate: 1.6,
    liftCoefficient: 1.1,
    dragCoefficient: 0.023,
    armor: 0.9,
    firepower: 1.2,
    maxAmmunition: 1000, // 2x MG 17 + 1x MG 151/20
    fuelCapacity: 400,
    fuelConsumptionRate: 0.75,
  },
  
  p51mustang: {
    name: 'North American P-51 Mustang',
    faction: 'allies',
    mass: 3500,
    wingArea: 21.8,
    wingSpan: 11.3,
    aspectRatio: 5.8,
    maxSpeed: 190,      // ~700 km/h
    cruiseSpeed: 150,
    stallSpeed: 48,
    maxThrust: 28000,
    serviceeCeiling: 12800,
    pitchRate: 2.3,
    rollRate: 3.2,
    yawRate: 1.4,
    liftCoefficient: 1.15,
    dragCoefficient: 0.024,
    armor: 0.7,
    firepower: 1.1,
    maxAmmunition: 1880, // 6x .50 cal
    fuelCapacity: 1020,  // With drop tanks
    fuelConsumptionRate: 0.9,
  },
  
  zero: {
    name: 'Mitsubishi A6M Zero',
    faction: 'axis',
    mass: 2400,
    wingArea: 22.4,
    wingSpan: 12.0,
    aspectRatio: 6.4,
    maxSpeed: 160,      // ~533 km/h
    cruiseSpeed: 120,
    stallSpeed: 40,
    maxThrust: 20000,
    serviceeCeiling: 10000,
    pitchRate: 3.0,
    rollRate: 3.5,     // Excellent maneuverability
    yawRate: 2.0,
    liftCoefficient: 1.3,
    dragCoefficient: 0.022,
    armor: 0.5,        // Famously little armor
    firepower: 0.9,
    maxAmmunition: 1300, // 2x Type 99 + 2x Type 97
    fuelCapacity: 518,
    fuelConsumptionRate: 0.6,
  },
};

export function getAircraftConfig(type: string): AircraftConfig {
  const config = AIRCRAFT_CONFIGS[type];
  if (!config) {
    throw new Error(`Unknown aircraft type: ${type}`);
  }
  return { ...config }; // Return a copy
}

export function getAllAircraftTypes(): string[] {
  return Object.keys(AIRCRAFT_CONFIGS);
}

export function getAircraftByFaction(faction: 'allies' | 'axis' | 'neutral'): string[] {
  return Object.entries(AIRCRAFT_CONFIGS)
    .filter(([_, config]) => config.faction === faction)
    .map(([type, _]) => type);
}