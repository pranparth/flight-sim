import * as THREE from 'three';
import { Aircraft } from '@entities/Aircraft';

export interface ComponentHealth {
  name: string;
  maxHealth: number;
  currentHealth: number;
  armor: number;           // 0-1, damage reduction
  criticalThreshold: number;
  isCritical: boolean;
  isDestroyed: boolean;
  effects: DamageEffect[];
}

export interface DamageEffect {
  type: 'engineFire' | 'controlSurfaceDamage' | 'stabilityLoss' | 'fuelLeak' | 'hydraulicFailure';
  severity: number; // 0-1
  visualEffect?: string;
}

export interface AircraftComponents {
  engine: ComponentHealth;
  leftWing: ComponentHealth;
  rightWing: ComponentHealth;
  tail: ComponentHealth;
  fuselage: ComponentHealth;
  cockpit: ComponentHealth;
}

export interface DamageResult {
  component: ComponentHealth;
  damage: number;
  isCritical: boolean;
  isDestroyed: boolean;
  totalHealth: number;
}

export class DamageModel {
  private components: AircraftComponents;
  private maxTotalHealth: number;
  
  constructor() {
    this.components = this.initializeComponents();
    this.maxTotalHealth = this.calculateTotalHealth();
  }
  
  private initializeComponents(): AircraftComponents {
    return {
      engine: {
        name: 'engine',
        maxHealth: 100,
        currentHealth: 100,
        armor: 0.2,
        criticalThreshold: 30,
        isCritical: false,
        isDestroyed: false,
        effects: []
      },
      leftWing: {
        name: 'leftWing',
        maxHealth: 80,
        currentHealth: 80,
        armor: 0.1,
        criticalThreshold: 20,
        isCritical: false,
        isDestroyed: false,
        effects: []
      },
      rightWing: {
        name: 'rightWing',
        maxHealth: 80,
        currentHealth: 80,
        armor: 0.1,
        criticalThreshold: 20,
        isCritical: false,
        isDestroyed: false,
        effects: []
      },
      tail: {
        name: 'tail',
        maxHealth: 60,
        currentHealth: 60,
        armor: 0.05,
        criticalThreshold: 15,
        isCritical: false,
        isDestroyed: false,
        effects: []
      },
      fuselage: {
        name: 'fuselage',
        maxHealth: 120,
        currentHealth: 120,
        armor: 0.15,
        criticalThreshold: 40,
        isCritical: false,
        isDestroyed: false,
        effects: []
      },
      cockpit: {
        name: 'cockpit',
        maxHealth: 40,
        currentHealth: 40,
        armor: 0.3,
        criticalThreshold: 10,
        isCritical: false,
        isDestroyed: false,
        effects: []
      }
    };
  }
  
  private calculateTotalHealth(): number {
    return Object.values(this.components).reduce(
      (total, component) => total + component.maxHealth,
      0
    );
  }
  
  applyDamage(
    damage: number,
    hitPoint: THREE.Vector3,
    aircraft: Aircraft,
    damageType: 'bullet' | 'explosive' | 'collision' = 'bullet'
  ): DamageResult {
    // Determine which component was hit
    const component = this.getHitComponent(hitPoint, aircraft);
    
    // Apply armor reduction
    let effectiveDamage = damage * (1 - component.armor);
    
    // Explosive damage affects multiple components
    if (damageType === 'explosive') {
      effectiveDamage *= 1.5;
      this.applyAreaDamage(damage * 0.3, component.name);
    }
    
    // Apply damage to component
    component.currentHealth = Math.max(0, component.currentHealth - effectiveDamage);
    
    // Check for critical damage
    if (!component.isCritical && component.currentHealth <= component.criticalThreshold) {
      component.isCritical = true;
      this.applyCriticalEffects(component, aircraft);
    }
    
    // Check for destruction
    if (!component.isDestroyed && component.currentHealth <= 0) {
      component.isDestroyed = true;
      this.handleComponentDestruction(component, aircraft);
    }
    
    // Calculate total health
    const totalHealth = this.getTotalHealthPercentage();
    
    // Update aircraft health state
    aircraft.setHealth(totalHealth);
    
    return {
      component: component,
      damage: effectiveDamage,
      isCritical: component.isCritical,
      isDestroyed: component.isDestroyed,
      totalHealth: totalHealth
    };
  }
  
  private getHitComponent(hitPoint: THREE.Vector3, aircraft: Aircraft): ComponentHealth {
    // Convert hit point to aircraft local space
    const localHit = aircraft.getMesh().worldToLocal(hitPoint.clone());
    
    // Determine component based on local position
    const x = localHit.x;
    const y = localHit.y;
    const z = localHit.z;
    
    // Wings
    if (Math.abs(x) > 2) {
      return x > 0 ? this.components.rightWing : this.components.leftWing;
    }
    
    // Tail
    if (z < -3) {
      return this.components.tail;
    }
    
    // Cockpit
    if (z > -1 && z < 1 && y > 0.5) {
      return this.components.cockpit;
    }
    
    // Engine
    if (z > 2) {
      return this.components.engine;
    }
    
    // Default to fuselage
    return this.components.fuselage;
  }
  
  private applyAreaDamage(damage: number, excludeComponent: string): void {
    // Apply reduced damage to nearby components
    const nearbyComponents: Record<string, string[]> = {
      'engine': ['fuselage', 'cockpit'],
      'leftWing': ['fuselage', 'engine'],
      'rightWing': ['fuselage', 'engine'],
      'tail': ['fuselage'],
      'fuselage': ['engine', 'leftWing', 'rightWing', 'tail', 'cockpit'],
      'cockpit': ['fuselage', 'engine']
    };
    
    const affected = nearbyComponents[excludeComponent] || [];
    affected.forEach(componentName => {
      const component = this.components[componentName as keyof AircraftComponents];
      if (component && !component.isDestroyed) {
        component.currentHealth = Math.max(0, component.currentHealth - damage);
      }
    });
  }
  
  private applyCriticalEffects(component: ComponentHealth, aircraft: Aircraft): void {
    
    switch (component.name) {
      case 'engine':
        component.effects.push({
          type: 'engineFire',
          severity: 0.5,
          visualEffect: 'smokeTrail'
        });
        // Reduce engine power
        aircraft.setEngineDamage(0.5);
        break;
        
      case 'leftWing':
      case 'rightWing':
        component.effects.push({
          type: 'controlSurfaceDamage',
          severity: 0.7,
          visualEffect: 'bulletHoles'
        });
        // Reduce roll control
        aircraft.setControlDamage('roll', component.name === 'leftWing' ? -0.3 : 0.3);
        break;
        
      case 'tail':
        component.effects.push({
          type: 'stabilityLoss',
          severity: 0.8,
          visualEffect: 'missingParts'
        });
        // Reduce pitch and yaw control
        aircraft.setControlDamage('pitch', 0.4);
        aircraft.setControlDamage('yaw', 0.2);
        break;
        
      case 'fuselage':
        component.effects.push({
          type: 'fuelLeak',
          severity: 0.6,
          visualEffect: 'fuelSpray'
        });
        // Increase fuel consumption
        aircraft.setFuelLeakRate(2.0);
        break;
        
      case 'cockpit':
        component.effects.push({
          type: 'hydraulicFailure',
          severity: 0.9,
          visualEffect: 'shatteredGlass'
        });
        // Reduce all control effectiveness
        aircraft.setControlDamage('all', 0.5);
        break;
    }
  }
  
  private handleComponentDestruction(component: ComponentHealth, aircraft: Aircraft): void {
    // Component-specific destruction effects
    switch (component.name) {
      case 'engine':
        // Complete engine failure
        aircraft.setEngineDamage(1.0);
        aircraft.setOnFire(true);
        break;
        
      case 'leftWing':
      case 'rightWing':
        // Wing loss causes uncontrollable spin
        aircraft.setUncontrollableSpin(component.name === 'leftWing' ? 'left' : 'right');
        break;
        
      case 'tail':
        // Tail loss means no pitch/yaw control
        aircraft.setControlDamage('pitch', 1.0);
        aircraft.setControlDamage('yaw', 1.0);
        break;
        
      case 'cockpit':
        // Pilot killed - aircraft destroyed
        aircraft.setDestroyed();
        break;
    }
  }
  
  getTotalHealthPercentage(): number {
    const currentTotal = Object.values(this.components).reduce(
      (total, component) => total + component.currentHealth,
      0
    );
    return (currentTotal / this.maxTotalHealth) * 100;
  }
  
  getComponents(): AircraftComponents {
    return this.components;
  }
  
  getComponentHealth(componentName: keyof AircraftComponents): ComponentHealth {
    return this.components[componentName];
  }
  
  reset(): void {
    this.components = this.initializeComponents();
  }
  
  // Visual damage helpers
  getDamageVisuals(): DamageVisual[] {
    const visuals: DamageVisual[] = [];
    
    Object.values(this.components).forEach(component => {
      if (component.isCritical || component.isDestroyed) {
        component.effects.forEach((effect: DamageEffect) => {
          if (effect.visualEffect) {
            visuals.push({
              componentName: component.name,
              effectType: effect.visualEffect,
              severity: effect.severity,
              position: this.getComponentPosition(component.name)
            });
          }
        });
      }
    });
    
    return visuals;
  }
  
  private getComponentPosition(componentName: string): THREE.Vector3 {
    // Return local position offsets for visual effects
    const positions: Record<string, THREE.Vector3> = {
      'engine': new THREE.Vector3(0, 0, 3),
      'leftWing': new THREE.Vector3(-4, 0, 0),
      'rightWing': new THREE.Vector3(4, 0, 0),
      'tail': new THREE.Vector3(0, 1, -4),
      'fuselage': new THREE.Vector3(0, 0, 0),
      'cockpit': new THREE.Vector3(0, 0.8, -0.5)
    };
    
    return positions[componentName] || new THREE.Vector3();
  }
}

export interface DamageVisual {
  componentName: string;
  effectType: string;
  severity: number;
  position: THREE.Vector3;
}

export class DamageManager {
  private damageModels: Map<string, DamageModel> = new Map();
  
  createDamageModel(aircraftId: string): DamageModel {
    const model = new DamageModel();
    this.damageModels.set(aircraftId, model);
    return model;
  }
  
  getDamageModel(aircraftId: string): DamageModel | undefined {
    return this.damageModels.get(aircraftId);
  }
  
  removeDamageModel(aircraftId: string): void {
    this.damageModels.delete(aircraftId);
  }
  
  applyDamage(
    aircraftId: string,
    damage: number,
    hitPoint: THREE.Vector3,
    aircraft: Aircraft,
    damageType: 'bullet' | 'explosive' | 'collision' = 'bullet'
  ): DamageResult | null {
    const model = this.damageModels.get(aircraftId);
    if (!model) return null;
    
    return model.applyDamage(damage, hitPoint, aircraft, damageType);
  }
}