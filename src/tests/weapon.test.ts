import * as THREE from 'three';
import { Weapon, WeaponMount, WeaponManager, WEAPON_CONFIGS } from '@systems/WeaponSystem';

export const weaponTests = {
  name: 'Weapon System Tests',
  tests: [
    {
      name: 'Weapon initialization',
      async test() {
        const mount: WeaponMount = {
          position: new THREE.Vector3(1, 0, 0),
          direction: new THREE.Vector3(0, 0, 1)
        };
        
        const weapon = new Weapon('machineGun_303', mount);
        const stats = weapon.getStats();
        
        console.assert(stats.damage === 10, 'Damage should be 10');
        console.assert(stats.rateOfFire === 15, 'Rate of fire should be 15');
        console.assert(stats.ammunition === 500, 'Max ammo should be 500');
        console.assert(weapon.getAmmo() === 500, 'Current ammo should be 500');
        
        console.log('✓ Weapon initializes with correct stats');
      }
    },
    
    {
      name: 'Weapon firing rate',
      async test() {
        const mount: WeaponMount = {
          position: new THREE.Vector3(0, 0, 0),
          direction: new THREE.Vector3(0, 0, 1)
        };
        
        const weapon = new Weapon('machineGun_303', mount);
        weapon.startFiring();
        
        let currentTime = 0;
        const worldPos = new THREE.Vector3(0, 100, 0);
        const worldDir = new THREE.Vector3(0, 0, 1);
        
        // First shot should fire immediately
        const shot1 = weapon.fire(currentTime, worldPos, worldDir, 'test');
        console.assert(shot1 !== null, 'First shot should fire');
        
        // Try to fire again immediately - should fail
        currentTime += 10; // 10ms later
        const shot2 = weapon.fire(currentTime, worldPos, worldDir, 'test');
        console.assert(shot2 === null, 'Should not fire before fire interval');
        
        // Wait for fire interval (1000ms / 15 rounds per second = ~67ms)
        currentTime += 60; // Total 70ms
        const shot3 = weapon.fire(currentTime, worldPos, worldDir, 'test');
        console.assert(shot3 !== null, 'Should fire after fire interval');
        
        console.log('✓ Weapon respects rate of fire');
      }
    },
    
    {
      name: 'Weapon ammo consumption',
      async test() {
        const mount: WeaponMount = {
          position: new THREE.Vector3(0, 0, 0),
          direction: new THREE.Vector3(0, 0, 1)
        };
        
        const weapon = new Weapon('cannon_20mm', mount);
        weapon.startFiring();
        
        const initialAmmo = weapon.getAmmo();
        console.assert(initialAmmo === 120, 'Should start with 120 rounds');
        
        // Fire some rounds
        let currentTime = 0;
        const worldPos = new THREE.Vector3(0, 100, 0);
        const worldDir = new THREE.Vector3(0, 0, 1);
        
        for (let i = 0; i < 5; i++) {
          const shot = weapon.fire(currentTime, worldPos, worldDir, 'test');
          if (shot) {
            currentTime += 300; // Wait enough for next shot
          }
        }
        
        console.assert(weapon.getAmmo() === 115, 'Should have 115 rounds left');
        
        // Test firing with no ammo
        for (let i = 0; i < 115; i++) {
          weapon.fire(currentTime, worldPos, worldDir, 'test');
          currentTime += 300;
        }
        
        console.assert(weapon.getAmmo() === 0, 'Should have no ammo left');
        
        weapon.fire(currentTime + 1000, worldPos, worldDir, 'test');
        console.assert(weapon.getAmmo() === 0, 'Ammo should not go negative');
        
        console.log('✓ Weapon consumes ammo correctly');
      }
    },
    
    {
      name: 'Weapon spread calculation',
      async test() {
        const mount: WeaponMount = {
          position: new THREE.Vector3(0, 0, 0),
          direction: new THREE.Vector3(0, 0, 1)
        };
        
        const weapon = new Weapon('rocket_HVAR', mount); // High spread weapon
        weapon.startFiring();
        
        const worldPos = new THREE.Vector3(0, 100, 0);
        const worldDir = new THREE.Vector3(0, 0, 1).normalize();
        
        // Fire multiple projectiles and check spread
        const directions: THREE.Vector3[] = [];
        let currentTime = 0;
        
        for (let i = 0; i < 10; i++) {
          const shot = weapon.fire(currentTime, worldPos, worldDir, 'test');
          if (shot) {
            directions.push(shot.velocity.clone().normalize());
            currentTime += 2000; // Rockets have low ROF
          }
        }
        
        // Check that not all directions are identical (spread is applied)
        let hasSpread = false;
        for (let i = 1; i < directions.length; i++) {
          if (!directions[i].equals(directions[0])) {
            hasSpread = true;
            break;
          }
        }
        
        console.assert(hasSpread, 'Projectiles should have spread');
        
        // Check spread is within expected cone
        const maxSpread = WEAPON_CONFIGS.rocket_HVAR.spread;
        for (const dir of directions) {
          const angle = worldDir.angleTo(dir);
          console.assert(angle <= maxSpread, 
            `Spread angle ${angle} should be <= ${maxSpread}`);
        }
        
        console.log('✓ Weapon applies spread correctly');
      }
    },
    
    {
      name: 'Weapon reload',
      async test() {
        const mount: WeaponMount = {
          position: new THREE.Vector3(0, 0, 0),
          direction: new THREE.Vector3(0, 0, 1)
        };
        
        const weapon = new Weapon('machineGun_303', mount);
        weapon.startFiring();
        
        // Fire some rounds
        let currentTime = 0;
        const worldPos = new THREE.Vector3(0, 100, 0);
        const worldDir = new THREE.Vector3(0, 0, 1);
        
        for (let i = 0; i < 10; i++) {
          weapon.fire(currentTime, worldPos, worldDir, 'test');
          currentTime += 100;
        }
        
        console.assert(weapon.getAmmo() === 490, 'Should have 490 rounds left');
        
        // Reload
        weapon.reload();
        console.assert(weapon.getAmmo() === 500, 'Should have full ammo after reload');
        
        console.log('✓ Weapon reloads correctly');
      }
    },
    
    {
      name: 'WeaponManager integration',
      async test() {
        const scene = new THREE.Scene();
        const manager = new WeaponManager(scene);
        
        // Create weapon group
        const weapons: Weapon[] = [];
        for (let i = 0; i < 4; i++) {
          const mount: WeaponMount = {
            position: new THREE.Vector3(i, 0, 0),
            direction: new THREE.Vector3(0, 0, 1)
          };
          weapons.push(new Weapon('machineGun_303', mount));
        }
        
        manager.addWeaponGroup('player', weapons);
        
        // Test firing control
        manager.startFiring('player');
        
        const transform = new THREE.Matrix4();
        transform.makeTranslation(0, 100, 0);
        
        manager.fireWeapons('player', transform, 0);
        
        // Check weapon status
        const status = manager.getWeaponsStatus('player');
        console.assert(status.length === 4, 'Should have 4 weapons');
        console.assert(status[0].ammo === 499, 'First weapon should have fired');
        
        // Stop firing
        manager.stopFiring('player');
        
        // Remove weapon group
        manager.removeWeaponGroup('player');
        const removedStatus = manager.getWeaponsStatus('player');
        console.assert(removedStatus.length === 0, 'Should have no weapons after removal');
        
        console.log('✓ WeaponManager manages weapon groups correctly');
      }
    }
  ]
};