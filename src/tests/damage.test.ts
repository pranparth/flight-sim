import * as THREE from 'three';
import { DamageModel, DamageManager } from '@systems/DamageSystem';
import { Aircraft } from '@entities/Aircraft';

export const damageTests = {
  name: 'Damage System Tests',
  tests: [
    {
      name: 'DamageModel initialization',
      async test() {
        const model = new DamageModel();
        const components = model.getComponents();
        
        // Check all components exist
        console.assert(components.engine !== undefined, 'Engine component should exist');
        console.assert(components.leftWing !== undefined, 'Left wing should exist');
        console.assert(components.rightWing !== undefined, 'Right wing should exist');
        console.assert(components.tail !== undefined, 'Tail should exist');
        console.assert(components.fuselage !== undefined, 'Fuselage should exist');
        console.assert(components.cockpit !== undefined, 'Cockpit should exist');
        
        // Check initial health
        console.assert(components.engine.currentHealth === 100, 'Engine should have 100 health');
        console.assert(components.fuselage.currentHealth === 120, 'Fuselage should have 120 health');
        console.assert(model.getTotalHealthPercentage() === 100, 'Total health should be 100%');
        
        console.log('✓ DamageModel initializes correctly');
      }
    },
    
    {
      name: 'Damage application with armor',
      async test() {
        const model = new DamageModel();
        const aircraft = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'test'
        });
        
        // Apply damage to engine (20% armor)
        const hitPoint = new THREE.Vector3(0, 0, 3); // Front of aircraft
        const result = model.applyDamage(50, hitPoint, aircraft, 'bullet');
        
        // Expected damage: 50 * (1 - 0.2) = 40
        console.assert(result.damage === 40, `Damage should be 40, got ${result.damage}`);
        console.assert(result.component.currentHealth === 60, 
          `Engine health should be 60, got ${result.component.currentHealth}`);
        console.assert(!result.isCritical, 'Should not be critical yet');
        
        console.log('✓ Armor reduces damage correctly');
      }
    },
    
    {
      name: 'Critical damage threshold',
      async test() {
        const model = new DamageModel();
        const aircraft = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'test'
        });
        
        // Damage engine to critical threshold (30 health)
        const hitPoint = new THREE.Vector3(0, 0, 3);
        
        // First hit - bring to 35 health (not critical)
        model.applyDamage(81.25, hitPoint, aircraft, 'bullet'); // 81.25 * 0.8 = 65 damage
        let engine = model.getComponentHealth('engine');
        console.assert(engine.currentHealth === 35, 'Engine should have 35 health');
        console.assert(!engine.isCritical, 'Should not be critical at 35 health');
        
        // Second hit - bring below critical threshold
        const result = model.applyDamage(10, hitPoint, aircraft, 'bullet'); // 10 * 0.8 = 8 damage
        console.assert(result.isCritical, 'Should be critical below threshold');
        console.assert(engine.effects.length > 0, 'Should have damage effects');
        
        // Check engine damage was applied to aircraft
        console.assert((aircraft as any).engineDamage === 0.5, 
          'Aircraft should have 50% engine damage');
        
        console.log('✓ Critical damage triggers correctly');
      }
    },
    
    {
      name: 'Component destruction',
      async test() {
        const model = new DamageModel();
        const aircraft = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'test'
        });
        
        // Destroy left wing
        const hitPoint = new THREE.Vector3(-4, 0, 0); // Left wing position
        const result = model.applyDamage(100, hitPoint, aircraft, 'bullet');
        
        // With 10% armor: 100 * 0.9 = 90 damage, destroying the 80 health wing
        console.assert(result.isDestroyed, 'Wing should be destroyed');
        console.assert(result.component.currentHealth === 0, 'Wing health should be 0');
        
        // Check aircraft is set to spin
        console.assert((aircraft as any).isSpinning === true, 'Aircraft should be spinning');
        console.assert((aircraft as any).spinDirection === 'left', 'Should spin left');
        
        console.log('✓ Component destruction causes correct effects');
      }
    },
    
    {
      name: 'Explosive damage area effect',
      async test() {
        const model = new DamageModel();
        const aircraft = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'test'
        });
        
        // Apply explosive damage to fuselage
        const hitPoint = new THREE.Vector3(0, 0, 0);
        model.applyDamage(100, hitPoint, aircraft, 'explosive');
        
        // Check fuselage took main damage (100 * 1.5 * 0.85 = 127.5)
        const fuselage = model.getComponentHealth('fuselage');
        console.assert(fuselage.currentHealth <= 0, 'Fuselage should be destroyed');
        
        // Check nearby components took splash damage
        const engine = model.getComponentHealth('engine');
        const leftWing = model.getComponentHealth('leftWing');
        console.assert(engine.currentHealth < 100, 'Engine should take splash damage');
        console.assert(leftWing.currentHealth < 80, 'Wings should take splash damage');
        
        console.log('✓ Explosive damage affects multiple components');
      }
    },
    
    {
      name: 'Total health calculation',
      async test() {
        const model = new DamageModel();
        const aircraft = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'test'
        });
        
        // Initial total health should be 100%
        console.assert(model.getTotalHealthPercentage() === 100, 
          'Should start at 100% health');
        
        // Damage multiple components
        model.applyDamage(50, new THREE.Vector3(0, 0, 3), aircraft); // Engine
        model.applyDamage(40, new THREE.Vector3(-4, 0, 0), aircraft); // Left wing
        model.applyDamage(30, new THREE.Vector3(0, 0, -4), aircraft); // Tail
        
        const totalHealth = model.getTotalHealthPercentage();
        console.assert(totalHealth < 100 && totalHealth > 0, 
          `Total health should be between 0-100%, got ${totalHealth}`);
        
        console.log('✓ Total health calculates correctly');
      }
    },
    
    {
      name: 'DamageManager integration',
      async test() {
        const manager = new DamageManager();
        const aircraft = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'test_aircraft'
        });
        
        // Create damage model
        const model = manager.createDamageModel('test_aircraft');
        console.assert(model !== undefined, 'Should create damage model');
        
        // Retrieve model
        const retrieved = manager.getDamageModel('test_aircraft');
        console.assert(retrieved === model, 'Should retrieve same model');
        
        // Apply damage through manager
        const result = manager.applyDamage(
          'test_aircraft',
          50,
          new THREE.Vector3(0, 0, 0),
          aircraft
        );
        
        console.assert(result !== null, 'Should apply damage');
        console.assert(result!.damage > 0, 'Should deal damage');
        
        // Remove model
        manager.removeDamageModel('test_aircraft');
        const removed = manager.getDamageModel('test_aircraft');
        console.assert(removed === undefined, 'Model should be removed');
        
        console.log('✓ DamageManager manages models correctly');
      }
    },
    
    {
      name: 'Cockpit hit instant destruction',
      async test() {
        const model = new DamageModel();
        const aircraft = new Aircraft({
          type: 'spitfire',
          position: new THREE.Vector3(0, 100, 0),
          id: 'test'
        });
        
        // Hit cockpit (pilot kill) - world position
        const hitPoint = new THREE.Vector3(0, 100.8, 0); // Aircraft at (0,100,0) -> local (0,0.8,0) for cockpit
        model.applyDamage(60, hitPoint, aircraft, 'bullet');
        
        // With 30% armor: 60 * 0.7 = 42 damage, destroying 40 health cockpit
        const cockpit = model.getComponentHealth('cockpit');
        console.assert(cockpit.currentHealth === 0, 'Cockpit should be destroyed');
        console.assert(cockpit.isDestroyed, 'Cockpit should be marked destroyed');
        
        // Aircraft should be destroyed
        console.assert(aircraft.getIsDestroyed(), 'Aircraft should be destroyed');
        console.assert(aircraft.getState().health === 0, 'Aircraft health should be 0');
        
        console.log('✓ Cockpit destruction destroys aircraft');
      }
    }
  ]
};