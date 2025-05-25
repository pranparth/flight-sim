# Combat Mechanics & Damage System - Technical Specification

## Combat Overview
The combat system balances arcade accessibility with tactical depth, featuring predictive aiming assistance, varied weapon types, and a component-based damage model with visual feedback.

## Weapon Systems

### Weapon Types and Properties
```typescript
interface WeaponStats {
  damage: number;
  rateOfFire: number;      // rounds per second
  muzzleVelocity: number;   // m/s
  range: number;            // effective range in meters
  ammunition: number;       // total rounds
  spread: number;           // accuracy cone in radians
  tracerInterval: number;   // tracer every N rounds
}

const WEAPON_CONFIGS = {
  // Machine guns - high ROF, low damage
  machineGun_303: {
    damage: 10,
    rateOfFire: 15,
    muzzleVelocity: 750,
    range: 400,
    ammunition: 500,
    spread: 0.02,
    tracerInterval: 5
  },
  
  // Cannons - low ROF, high damage
  cannon_20mm: {
    damage: 40,
    rateOfFire: 4,
    muzzleVelocity: 850,
    range: 600,
    ammunition: 120,
    spread: 0.015,
    tracerInterval: 3
  },
  
  // Heavy cannons
  cannon_37mm: {
    damage: 80,
    rateOfFire: 2,
    muzzleVelocity: 900,
    range: 800,
    ammunition: 60,
    spread: 0.01,
    tracerInterval: 1
  },
  
  // Rockets - unguided projectiles
  rocket_HVAR: {
    damage: 150,
    rateOfFire: 0.5, // salvo fire
    muzzleVelocity: 420,
    range: 1200,
    ammunition: 8,
    spread: 0.05,
    tracerInterval: 1
  }
};
```

### Projectile System
```typescript
class ProjectileManager {
  private projectilePool: ProjectilePool;
  private activeProjectiles: Set<Projectile>;
  
  fireWeapon(
    weapon: WeaponStats,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    ownerId: string
  ): void {
    // Apply spread
    const spreadDir = this.applySpread(direction, weapon.spread);
    
    // Get projectile from pool
    const projectile = this.projectilePool.acquire();
    
    projectile.init({
      position: origin.clone(),
      velocity: spreadDir.multiplyScalar(weapon.muzzleVelocity),
      damage: weapon.damage,
      ownerId: ownerId,
      maxRange: weapon.range,
      isTracer: this.shouldBeTracer(weapon.tracerInterval)
    });
    
    this.activeProjectiles.add(projectile);
  }
  
  update(deltaTime: number): void {
    for (const projectile of this.activeProjectiles) {
      // Update position
      projectile.update(deltaTime);
      
      // Check collisions
      const hit = this.checkCollision(projectile);
      if (hit) {
        this.handleHit(projectile, hit);
        this.removeProjectile(projectile);
      }
      
      // Check range
      if (projectile.distanceTraveled > projectile.maxRange) {
        this.removeProjectile(projectile);
      }
    }
  }
  
  private checkCollision(projectile: Projectile): RaycastHit | null {
    // Raycast from last position to current position
    const ray = new THREE.Raycaster(
      projectile.lastPosition,
      projectile.velocity.clone().normalize(),
      0,
      projectile.velocity.length() * this.deltaTime
    );
    
    const intersects = ray.intersectObjects(this.targetables, true);
    return intersects.length > 0 ? intersects[0] : null;
  }
}
```

### Aiming System
```typescript
class AimingAssistant {
  // Lead indicator calculation
  calculateLeadPosition(
    target: Aircraft,
    shooter: Aircraft,
    muzzleVelocity: number
  ): THREE.Vector3 {
    const targetPos = target.position.clone();
    const shooterPos = shooter.position.clone();
    const targetVel = target.velocity.clone();
    const shooterVel = shooter.velocity.clone();
    
    // Relative velocity
    const relativeVel = targetVel.sub(shooterVel);
    
    // Iterative prediction
    let timeToTarget = 0;
    let predictedPos = targetPos.clone();
    
    for (let i = 0; i < 3; i++) {
      const distance = predictedPos.distanceTo(shooterPos);
      timeToTarget = distance / muzzleVelocity;
      predictedPos = targetPos.add(relativeVel.multiplyScalar(timeToTarget));
    }
    
    // Add gravity compensation for long shots
    const gravityDrop = new THREE.Vector3(0, -4.9 * timeToTarget * timeToTarget, 0);
    predictedPos.add(gravityDrop);
    
    return predictedPos;
  }
  
  // Convergence adjustment for wing-mounted guns
  calculateConvergence(
    aircraft: Aircraft,
    targetDistance: number
  ): THREE.Vector3[] {
    const gunPositions = aircraft.weaponMounts;
    const convergencePoint = aircraft.position.clone()
      .add(aircraft.forward.multiplyScalar(targetDistance));
    
    return gunPositions.map(pos => {
      const worldPos = aircraft.localToWorld(pos.clone());
      return convergencePoint.clone().sub(worldPos).normalize();
    });
  }
}
```

## Damage Model

### Component-Based Damage
```typescript
interface AircraftComponents {
  engine: ComponentHealth;
  leftWing: ComponentHealth;
  rightWing: ComponentHealth;
  tail: ComponentHealth;
  fuselage: ComponentHealth;
  cockpit: ComponentHealth;
}

interface ComponentHealth {
  maxHealth: number;
  currentHealth: number;
  armor: number;
  criticalThreshold: number;
  isCritical: boolean;
  effects: DamageEffect[];
}

class DamageCalculator {
  applyDamage(
    aircraft: Aircraft,
    damage: number,
    hitPoint: THREE.Vector3,
    damageType: 'bullet' | 'explosive' | 'collision'
  ): DamageResult {
    // Determine hit component
    const component = this.getHitComponent(aircraft, hitPoint);
    
    // Apply armor reduction
    const effectiveDamage = damage * (1 - component.armor);
    
    // Apply damage
    component.currentHealth -= effectiveDamage;
    
    // Check for critical damage
    if (component.currentHealth <= component.criticalThreshold) {
      this.applyCriticalEffects(aircraft, component);
    }
    
    // Check for destruction
    if (component.currentHealth <= 0) {
      this.handleComponentDestruction(aircraft, component);
    }
    
    return {
      component: component,
      damage: effectiveDamage,
      isCritical: component.isCritical,
      isDestroyed: component.currentHealth <= 0
    };
  }
  
  private applyCriticalEffects(aircraft: Aircraft, component: ComponentHealth): void {
    component.isCritical = true;
    
    switch (component.type) {
      case 'engine':
        component.effects.push({
          type: 'engineFire',
          severity: 0.5,
          visualEffect: 'smokeTrail'
        });
        aircraft.maxThrust *= 0.5;
        break;
        
      case 'wing':
        component.effects.push({
          type: 'controlSurfaceDamage',
          severity: 0.7,
          visualEffect: 'bulletHoles'
        });
        aircraft.rollRate *= 0.3;
        break;
        
      case 'tail':
        component.effects.push({
          type: 'stabilityLoss',
          severity: 0.8,
          visualEffect: 'missingParts'
        });
        aircraft.yawRate *= 0.2;
        aircraft.pitchRate *= 0.4;
        break;
    }
  }
}
```

### Visual Damage System
```typescript
class VisualDamageManager {
  private damageTextures: Map<string, THREE.Texture>;
  private particleEmitters: Map<string, ParticleEmitter>;
  
  applyVisualDamage(
    aircraft: Aircraft,
    component: string,
    severity: number
  ): void {
    // Progressive damage textures
    const damageLevel = Math.floor(severity * 3); // 0-2
    const texture = this.damageTextures.get(`${component}_damage_${damageLevel}`);
    
    // Apply damage decals
    this.applyDamageDecal(aircraft.mesh, texture, component);
    
    // Add particle effects
    if (severity > 0.5) {
      this.addSmokeTrail(aircraft, component);
    }
    
    if (severity > 0.8) {
      this.addFireEffect(aircraft, component);
    }
  }
  
  private applyDamageDecal(
    mesh: THREE.Mesh,
    texture: THREE.Texture,
    component: string
  ): void {
    // Create decal geometry
    const decalGeometry = new DecalGeometry(
      mesh,
      this.getComponentPosition(component),
      new THREE.Euler(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ),
      new THREE.Vector3(1, 1, 1)
    );
    
    const decalMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4
    });
    
    const decal = new THREE.Mesh(decalGeometry, decalMaterial);
    mesh.add(decal);
  }
}
```

## AI Combat Behavior

### Combat AI States
```typescript
class CombatAI {
  private state: AIState;
  private target: Aircraft | null;
  private tactics: TacticalBehavior;
  
  updateCombat(deltaTime: number): void {
    switch (this.state) {
      case AIState.SEARCHING:
        this.searchForTargets();
        break;
        
      case AIState.ENGAGING:
        this.executeEngagement();
        break;
        
      case AIState.EVADING:
        this.performEvasiveManeuvers();
        break;
        
      case AIState.DISENGAGING:
        this.breakOffAttack();
        break;
    }
  }
  
  private executeEngagement(): void {
    if (!this.target) return;
    
    const range = this.aircraft.position.distanceTo(this.target.position);
    const angle = this.calculateDeflectionAngle();
    
    // Choose tactics based on situation
    if (range > 500) {
      this.tactics = TacticalBehavior.BOOM_AND_ZOOM;
    } else if (this.hasEnergyAdvantage()) {
      this.tactics = TacticalBehavior.ENERGY_FIGHT;
    } else {
      this.tactics = TacticalBehavior.TURN_FIGHT;
    }
    
    // Execute chosen tactic
    this.executeTactic();
    
    // Fire weapons when in position
    if (this.isInFiringPosition(angle, range)) {
      this.fireWeapons();
    }
  }
  
  private performEvasiveManeuvers(): void {
    const maneuvers = [
      this.barrelRoll,
      this.splitS,
      this.immelmannTurn,
      this.breakTurn
    ];
    
    // Choose maneuver based on threat
    const threat = this.assessThreat();
    const maneuver = this.selectBestManeuver(maneuvers, threat);
    
    maneuver.call(this);
  }
}
```

### Tactical Behaviors
```typescript
enum TacticalBehavior {
  BOOM_AND_ZOOM,    // High speed attack and escape
  TURN_FIGHT,       // Close-range dogfighting
  ENERGY_FIGHT,     // Altitude/speed management
  HEAD_ON,          // Frontal attack
  DEFENSIVE         // Survival priority
}

class TacticalExecutor {
  executeBoomAndZoom(ai: CombatAI): void {
    // Gain altitude advantage
    if (ai.aircraft.altitude < ai.target.altitude + 100) {
      ai.climb();
      return;
    }
    
    // Dive attack
    if (ai.inAttackPosition()) {
      ai.dive();
      ai.fireWeapons();
    }
    
    // Escape using speed
    if (ai.hasAttacked) {
      ai.extendAway();
    }
  }
  
  executeTurnFight(ai: CombatAI): void {
    // Match target's turn
    const targetTurnRate = ai.estimateTargetTurnRate();
    const leadTurn = ai.calculateLeadTurn(targetTurnRate);
    
    // Apply optimal turn
    ai.setTurnRate(leadTurn);
    
    // Manage speed for optimal turn
    if (ai.aircraft.speed > ai.optimalTurnSpeed) {
      ai.reduceThrottle();
    }
  }
}
```

## Hit Detection & Feedback

### Hit Registration
```typescript
class HitRegistration {
  private hitmarkers: HitmarkerPool;
  private soundManager: SoundManager;
  
  registerHit(
    projectile: Projectile,
    target: Aircraft,
    hitPoint: THREE.Vector3
  ): void {
    // Visual feedback
    this.createHitEffect(hitPoint, projectile.damage);
    
    // Audio feedback
    if (projectile.ownerId === 'player') {
      this.soundManager.playHitSound(projectile.damage);
      this.showHitmarker(hitPoint);
    }
    
    // Damage application
    const result = this.damageCalculator.applyDamage(
      target,
      projectile.damage,
      hitPoint,
      'bullet'
    );
    
    // Score tracking
    if (result.isDestroyed) {
      this.scoreManager.addKill(projectile.ownerId, target.id);
    } else {
      this.scoreManager.addHit(projectile.ownerId, result.damage);
    }
  }
  
  private createHitEffect(position: THREE.Vector3, damage: number): void {
    // Sparks for metal hits
    const sparkCount = Math.floor(damage / 10);
    const sparks = this.particlePool.getSparks(sparkCount);
    sparks.position.copy(position);
    sparks.emit();
    
    // Impact decal
    const decal = this.decalPool.getImpactDecal();
    decal.position.copy(position);
    scene.add(decal);
  }
}
```

### Destruction Effects
```typescript
class DestructionEffects {
  destroyAircraft(aircraft: Aircraft): void {
    // Main explosion
    const explosion = this.createExplosion(aircraft.position, 'large');
    scene.add(explosion);
    
    // Break into parts
    const parts = this.breakApartModel(aircraft.mesh);
    parts.forEach(part => {
      // Add physics to debris
      const body = this.physicsWorld.addRigidBody(part);
      
      // Random impulse
      const impulse = new THREE.Vector3(
        (Math.random() - 0.5) * 100,
        Math.random() * 50,
        (Math.random() - 0.5) * 100
      );
      body.applyImpulse(impulse);
      
      // Smoke trail on larger pieces
      if (part.geometry.boundingSphere.radius > 1) {
        this.addDebrisTrail(part);
      }
    });
    
    // Remove original aircraft
    aircraft.destroy();
  }
  
  private breakApartModel(mesh: THREE.Mesh): THREE.Mesh[] {
    const parts: THREE.Mesh[] = [];
    
    // Predefined break points
    const breakPoints = [
      { name: 'leftWing', offset: new THREE.Vector3(-3, 0, 0) },
      { name: 'rightWing', offset: new THREE.Vector3(3, 0, 0) },
      { name: 'tail', offset: new THREE.Vector3(0, 0, -4) },
      { name: 'fuselage', offset: new THREE.Vector3(0, 0, 0) }
    ];
    
    breakPoints.forEach(bp => {
      const part = mesh.getObjectByName(bp.name)?.clone();
      if (part) {
        part.position.add(bp.offset);
        parts.push(part as THREE.Mesh);
      }
    });
    
    return parts;
  }
}
```

## Scoring System

### Score Calculation
```typescript
interface ScoreEvent {
  type: 'hit' | 'criticalHit' | 'kill' | 'assist' | 'objective';
  value: number;
  timestamp: number;
  targetId?: string;
}

class ScoreManager {
  private scores: Map<string, PlayerScore>;
  private recentEvents: ScoreEvent[] = [];
  
  calculateScore(event: ScoreEvent): number {
    const baseScores = {
      hit: 10,
      criticalHit: 25,
      kill: 100,
      assist: 50,
      objective: 200
    };
    
    let score = baseScores[event.type];
    
    // Combo multiplier
    const combo = this.getComboMultiplier(event);
    score *= combo;
    
    // Difficulty bonus
    if (event.targetId) {
      const targetSkill = this.getTargetSkillLevel(event.targetId);
      score *= (1 + targetSkill * 0.2);
    }
    
    return Math.round(score);
  }
  
  private getComboMultiplier(event: ScoreEvent): number {
    const recentKills = this.recentEvents.filter(
      e => e.type === 'kill' && 
      event.timestamp - e.timestamp < 5000
    ).length;
    
    return Math.min(1 + recentKills * 0.5, 3.0);
  }
}
```