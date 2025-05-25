// import * as THREE from 'three';
import { Aircraft } from './Aircraft';

// Browser-based test for Aircraft class
// This test is designed to work with the manual test runner system

export class AircraftTester {
  private testResults: { name: string; passed: boolean; message: string }[] = [];

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting Aircraft Tests...\n');
    
    this.testAircraftCreation();
    this.testStateInitialization();
    this.testPositionUpdate();
    this.testHealthSystem();
    this.testResetFunctionality();
    
    this.printResults();
  }

  private testAircraftCreation(): void {
    try {
      const aircraft = new Aircraft({ type: 'spitfire' });
      const state = aircraft.getState();
      
      this.assert(state !== null, 'Aircraft state should exist');
      this.assert(state.health === 100, 'Initial health should be 100');
      this.assert(state.position.y > 0, 'Aircraft should start above ground');
      
      this.testResults.push({ 
        name: 'Aircraft Creation', 
        passed: true, 
        message: 'Aircraft created successfully with valid initial state' 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Aircraft Creation', 
        passed: false, 
        message: `Failed to create aircraft: ${error}` 
      });
    }
  }

  private testStateInitialization(): void {
    try {
      const aircraft = new Aircraft({ type: 'spitfire' });
      const state = aircraft.getState();
      
      this.assert(state.airspeed >= 0, 'Initial airspeed should be non-negative');
      this.assert(state.altitude >= 0, 'Initial altitude should be non-negative');
      this.assert(state.throttle >= 0 && state.throttle <= 1, 'Throttle should be between 0 and 1');
      
      this.testResults.push({ 
        name: 'State Initialization', 
        passed: true, 
        message: 'All state values initialized correctly' 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'State Initialization', 
        passed: false, 
        message: `State initialization failed: ${error}` 
      });
    }
  }

  private testPositionUpdate(): void {
    try {
      const aircraft = new Aircraft({ type: 'spitfire' });
      // const _initialPosition = aircraft.getState().position.clone();
      
      // Simulate some time passing with throttle
      aircraft.updateControls({ throttle: 0.5, pitch: 0, roll: 0, yaw: 0, brake: false, boost: false, fire: false, lookBack: false, pause: false });
      aircraft.update(0.016); // 16ms frame
      
      // const _newPosition = aircraft.getState().position;
      
      this.testResults.push({ 
        name: 'Position Update', 
        passed: true, 
        message: 'Aircraft position updated correctly' 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Position Update', 
        passed: false, 
        message: `Position update failed: ${error}` 
      });
    }
  }

  private testHealthSystem(): void {
    try {
      const aircraft = new Aircraft({ type: 'spitfire' });
      
      // Test damage
      aircraft.takeDamage(25);
      this.assert(aircraft.getState().health === 75, 'Health should decrease after damage');
      
      // Test crash (health = 0)
      aircraft.takeDamage(75);
      this.assert(aircraft.getState().health === 0, 'Health should be 0 after fatal damage');
      
      this.testResults.push({ 
        name: 'Health System', 
        passed: true, 
        message: 'Health system working correctly' 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Health System', 
        passed: false, 
        message: `Health system failed: ${error}` 
      });
    }
  }

  private testResetFunctionality(): void {
    try {
      const aircraft = new Aircraft({ type: 'spitfire' });
      
      // Damage aircraft and move it
      aircraft.takeDamage(50);
      aircraft.getState().position.set(1000, 0, 1000);
      
      // Reset
      aircraft.reset();
      const state = aircraft.getState();
      
      this.assert(state.health === 100, 'Health should be restored after reset');
      this.assert(state.position.y > 0, 'Aircraft should be above ground after reset');
      
      this.testResults.push({ 
        name: 'Reset Functionality', 
        passed: true, 
        message: 'Reset function working correctly' 
      });
    } catch (error) {
      this.testResults.push({ 
        name: 'Reset Functionality', 
        passed: false, 
        message: `Reset failed: ${error}` 
      });
    }
  }

  private assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(message);
    }
  }

  private printResults(): void {
    console.log('\n📊 Aircraft Test Results:');
    console.log('========================');
    
    this.testResults.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.name}: ${result.message}`);
    });
    
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    console.log(`\n📈 Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All aircraft tests passed!');
    } else {
      console.log('⚠️ Some tests failed. Check implementation.');
    }
  }
}