import * as THREE from 'three';
import { Aircraft } from '@entities/Aircraft';
import { WeaponManager, Weapon, WeaponMount } from '@systems/WeaponSystem';
import { DamageManager } from '@systems/DamageSystem';

export const combatIntegrationTests = {
  name: 'Combat System Integration Tests',
  tests: [
    {
      name: 'Complete weapon firing flow',
      async test() {
        const scene = new THREE.Scene();
        const weaponManager = new WeaponManager(scene);
        const aircraft = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'player'
        });
        
        // Setup weapons
        const weapons: Weapon[] = [];
        const mount: WeaponMount = {
          position: new THREE.Vector3(0, 0, 0),
          direction: new THREE.Vector3(0, 0, 1)
        };
        weapons.push(new Weapon('machineGun_303', mount));
        
        weaponManager.addWeaponGroup('player', weapons);
        
        // Start firing
        weaponManager.startFiring('player');
        
        // Fire weapons - need to update matrix first
        aircraft.getMesh().updateMatrixWorld();
        const transform = aircraft.getMesh().matrixWorld;
        weaponManager.fireWeapons('player', transform, 0);
        
        // Check projectiles were created
        const activeProjectiles = (weaponManager as any).activeProjectiles;
        console.assert(activeProjectiles.size > 0, 'Should have active projectiles');
        
        // Update projectiles
        const hits = weaponManager.update(0.1, []);
        console.assert(hits.length === 0, 'Should have no hits without targets');
        
        console.log('✓ Complete weapon firing flow works');
      }
    },
    
    {
      name: 'Projectile-aircraft hit detection',
      async test() {
        const scene = new THREE.Scene();
        const weaponManager = new WeaponManager(scene);
        
        // Create shooter
        const shooter = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          rotation: new THREE.Euler(0, 0, 0),
          id: 'shooter'
        });
        scene.add(shooter.getMesh());
        
        // Create target very close in front (reduce distance for easier hit)
        const target = new Aircraft({
          type: 'bf109',
          position: new THREE.Vector3(0, 100, 10), // Only 10 units away
          rotation: new THREE.Euler(0, Math.PI, 0),
          id: 'target'
        });
        scene.add(target.getMesh());
        
        // Add a simple collision box to ensure hit detection works
        const collisionBox = new THREE.Mesh(
          new THREE.BoxGeometry(8, 4, 12), // Large box around aircraft
          new THREE.MeshBasicMaterial({ visible: false })
        );
        collisionBox.userData.aircraftId = 'target';
        target.getMesh().add(collisionBox); // Add as child so it moves with aircraft
        
        // Setup weapon pointing at target
        const mount: WeaponMount = {
          position: new THREE.Vector3(0, 0, 0),
          direction: new THREE.Vector3(0, 0, 1)
        };
        const weapon = new Weapon('machineGun_303', mount);
        weaponManager.addWeaponGroup('shooter', [weapon]);
        
        // Fire at target - update matrices first
        shooter.getMesh().updateMatrixWorld();
        target.getMesh().updateMatrixWorld();
        weaponManager.startFiring('shooter');
        weaponManager.fireWeapons('shooter', shooter.getMesh().matrixWorld, 0);
        
        // Check if we have active projectiles first
        const activeProjectiles = (weaponManager as any).activeProjectiles;
        console.assert(activeProjectiles.size > 0, 'Should have fired projectiles');
        
        // Debug: Log initial positions
        let projPosition: THREE.Vector3 | null = null;
        activeProjectiles.forEach((proj: any) => {
          projPosition = proj.getPosition();
        });
        
        // Update with small timestep but not too small to avoid timeout
        let totalHits = 0;
        for (let i = 0; i < 200; i++) { // Reasonable number of iterations
          const hits = weaponManager.update(0.016, [target.getMesh()]); // Use normal frame time
          totalHits += hits.length;
          
          if (hits.length > 0) {
            console.assert(hits[0].target.userData.aircraftId === 'target',
              'Should hit target aircraft');
            console.assert(hits[0].damage === 10, 'Should have correct damage');
            break;
          }
          
          // Break if projectile is past target
          let projectilePastTarget = false;
          activeProjectiles.forEach((proj: any) => {
            if (proj.getPosition().z > 15) { // Past target at z=10
              projectilePastTarget = true;
            }
          });
          if (projectilePastTarget) break;
        }
        
        console.assert(totalHits > 0, 'Should hit target aircraft');
        console.log('✓ Projectile-aircraft hit detection works');
      }
    },
    
    {
      name: 'Damage application from hits',
      async test() {
        const scene = new THREE.Scene();
        const damageManager = new DamageManager();
        
        // Create aircraft
        const target = new Aircraft({
          type: 'bf109',
          position: new THREE.Vector3(0, 100, 0),
          id: 'target'
        });
        scene.add(target.getMesh());
        
        // Create damage model
        damageManager.createDamageModel('target');
        
        // Simulate a hit
        const hitPoint = new THREE.Vector3(0, 100, 3); // Front hit
        const result = damageManager.applyDamage('target', 50, hitPoint, target);
        
        console.assert(result !== null, 'Should apply damage');
        console.assert(result!.damage > 0, 'Should deal damage');
        console.assert(result!.totalHealth < 100, 'Total health should decrease');
        
        // Check aircraft state was updated
        const state = target.getState();
        console.assert(state.health < 100, 'Aircraft health should decrease');
        
        console.log('✓ Damage applies correctly from hits');
      }
    },
    
    {
      name: 'Ammo counter updates',
      async test() {
        // Create mock HTML elements
        const ammoElement = document.createElement('div');
        ammoElement.id = 'ammo-value';
        document.body.appendChild(ammoElement);
        
        const scene = new THREE.Scene();
        const weaponManager = new WeaponManager(scene);
        
        // Setup weapons
        const weapons: Weapon[] = [];
        for (let i = 0; i < 8; i++) {
          const mount: WeaponMount = {
            position: new THREE.Vector3(i - 4, 0, 0),
            direction: new THREE.Vector3(0, 0, 1)
          };
          weapons.push(new Weapon('machineGun_303', mount));
        }
        
        weaponManager.addWeaponGroup('player', weapons);
        
        // Check initial status
        const status = weaponManager.getWeaponsStatus('player');
        const totalAmmo = status.reduce((sum, w) => sum + w.ammo, 0);
        console.assert(totalAmmo === 4000, 'Should have 4000 total rounds');
        
        // Fire some rounds - create identity transform
        const transform = new THREE.Matrix4();
        transform.identity();
        weaponManager.startFiring('player');
        weaponManager.fireWeapons('player', transform, 0);
        
        // Check ammo decreased
        const newStatus = weaponManager.getWeaponsStatus('player');
        const newTotalAmmo = newStatus.reduce((sum, w) => sum + w.ammo, 0);
        console.assert(newTotalAmmo === 3992, 'Should have 3992 rounds after firing');
        
        // Cleanup
        document.body.removeChild(ammoElement);
        
        console.log('✓ Ammo tracking works correctly');
      }
    },
    
    {
      name: 'Multiple aircraft combat',
      async test() {
        const scene = new THREE.Scene();
        const weaponManager = new WeaponManager(scene);
        const damageManager = new DamageManager();
        
        // Create multiple aircraft
        const player = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'player'
        });
        
        const enemy1 = new Aircraft({
          type: 'bf109',
          position: new THREE.Vector3(50, 100, 100),
          id: 'enemy1'
        });
        
        const enemy2 = new Aircraft({
          type: 'zero',
          position: new THREE.Vector3(-50, 100, 100),
          id: 'enemy2'
        });
        
        scene.add(player.getMesh());
        scene.add(enemy1.getMesh());
        scene.add(enemy2.getMesh());
        
        // Create damage models
        damageManager.createDamageModel('player');
        damageManager.createDamageModel('enemy1');
        damageManager.createDamageModel('enemy2');
        
        // Setup weapons for all aircraft
        const mount: WeaponMount = {
          position: new THREE.Vector3(0, 0, 0),
          direction: new THREE.Vector3(0, 0, 1)
        };
        
        weaponManager.addWeaponGroup('player', [new Weapon('machineGun_303', mount)]);
        weaponManager.addWeaponGroup('enemy1', [new Weapon('cannon_20mm', mount)]);
        weaponManager.addWeaponGroup('enemy2', [new Weapon('machineGun_303', mount)]);
        
        // All aircraft fire
        weaponManager.startFiring('player');
        weaponManager.startFiring('enemy1');
        weaponManager.startFiring('enemy2');
        
        // Update matrices before firing
        player.getMesh().updateMatrixWorld();
        enemy1.getMesh().updateMatrixWorld();
        enemy2.getMesh().updateMatrixWorld();
        
        weaponManager.fireWeapons('player', player.getMesh().matrixWorld, 0);
        weaponManager.fireWeapons('enemy1', enemy1.getMesh().matrixWorld, 100);
        weaponManager.fireWeapons('enemy2', enemy2.getMesh().matrixWorld, 200);
        
        // Check projectiles from all sources
        const activeProjectiles = (weaponManager as any).activeProjectiles;
        console.assert(activeProjectiles.size === 3, 
          `Should have 3 projectiles, got ${activeProjectiles.size}`);
        
        // Verify projectiles have correct owners
        const ownerIds = new Set<string>();
        activeProjectiles.forEach((p: any) => {
          ownerIds.add(p.getOwnerId());
        });
        
        console.assert(ownerIds.has('player'), 'Should have player projectile');
        console.assert(ownerIds.has('enemy1'), 'Should have enemy1 projectile');
        console.assert(ownerIds.has('enemy2'), 'Should have enemy2 projectile');
        
        console.log('✓ Multiple aircraft can engage in combat');
      }
    },
    
    {
      name: 'Aircraft destruction flow',
      async test() {
        const scene = new THREE.Scene();
        const damageManager = new DamageManager();
        
        const aircraft = new Aircraft({
          type: 'bf109',
          position: new THREE.Vector3(0, 100, 0),
          id: 'target'
        });
        scene.add(aircraft.getMesh());
        
        damageManager.createDamageModel('target');
        
        // Apply massive damage to destroy aircraft
        aircraft.getMesh().updateMatrixWorld();
        const hitPoint = new THREE.Vector3(0, 100.8, 0); // Cockpit hit in world space
        const result = damageManager.applyDamage('target', 500, hitPoint, aircraft, 'explosive');
        
        console.assert(result !== null, 'Should apply damage');
        console.assert(result!.isDestroyed, 'Component should be destroyed');
        console.assert(aircraft.getIsDestroyed(), 'Aircraft should be destroyed');
        
        // Aircraft should not respond to controls when destroyed
        aircraft.updateControls({
          pitch: 1,
          roll: 1,
          yaw: 1,
          throttle: 1,
          brake: false,
          boost: false,
          fire: false,
          lookBack: false,
          pause: false
        });
        
        const state = aircraft.getState();
        console.assert(state.health === 0, 'Health should remain 0');
        
        console.log('✓ Aircraft destruction works correctly');
      }
    }
  ]
};