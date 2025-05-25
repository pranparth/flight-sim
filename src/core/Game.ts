import * as THREE from 'three';
import { Renderer } from '@systems/Renderer';
import { PhysicsEngine } from '@systems/PhysicsEngine';
import { InputManager } from '@systems/InputManager';
import { SceneManager } from '@systems/SceneManager';
import { Aircraft } from '@entities/Aircraft';
import { CameraController } from '@systems/CameraController';
import Stats from 'three/examples/jsm/libs/stats.module.js';

export class Game {
  private container: HTMLElement;
  private renderer!: Renderer;
  private physicsEngine!: PhysicsEngine;
  private inputManager!: InputManager;
  private sceneManager!: SceneManager;
  private cameraController!: CameraController;
  private stats?: Stats;
  
  private playerAircraft!: Aircraft;
  
  private clock = new THREE.Clock();
  private isRunning = false;
  private showDebug = false;
  
  constructor(container: HTMLElement) {
    this.container = container;
    
    // Setup debug mode
    if ((import.meta as any).env?.DEV) {
      this.setupDebug();
    }
  }
  
  async init(): Promise<void> {
    console.log('Initializing game...');
    
    // Initialize core systems
    this.renderer = new Renderer(this.container);
    this.sceneManager = new SceneManager();
    this.physicsEngine = new PhysicsEngine();
    this.inputManager = new InputManager();
    
    // Setup the scene
    await this.sceneManager.init();
    
    // Create player aircraft
    this.playerAircraft = new Aircraft({
      position: new THREE.Vector3(0, 100, 0),
      rotation: new THREE.Euler(0, 0, 0),
      type: 'spitfire'
    });
    
    this.sceneManager.addAircraft(this.playerAircraft);
    
    // Setup camera
    this.cameraController = new CameraController(
      this.renderer.getCamera(),
      this.playerAircraft
    );
    
    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
    
    console.log('Game initialized successfully');
  }
  
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.clock.start();
    this.gameLoop();
  }
  
  stop(): void {
    this.isRunning = false;
  }
  
  private gameLoop = (): void => {
    if (!this.isRunning) return;
    
    requestAnimationFrame(this.gameLoop);
    
    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();
    
    // Update systems
    this.update(deltaTime, elapsedTime);
    
    // Render
    this.render();
    
    // Update stats
    if (this.stats) {
      this.stats.update();
    }
  };
  
  private update(deltaTime: number, elapsedTime: number): void {
    // Cap deltaTime to prevent large jumps
    const cappedDelta = Math.min(deltaTime, 0.1);
    
    // Update input
    this.inputManager.update();
    
    // Update physics
    this.physicsEngine.update(cappedDelta);
    
    // Update player aircraft with input
    const controls = this.inputManager.getControls();
    this.playerAircraft.updateControls(controls);
    this.playerAircraft.update(cappedDelta);
    
    // Update camera
    this.cameraController.update(cappedDelta);
    
    // Update scene
    this.sceneManager.update(cappedDelta, elapsedTime);
    
    // Update debug info
    if (this.showDebug) {
      this.updateDebugInfo();
    }
    
    // Update flight instruments (always visible)
    this.updateFlightInstruments();
  }
  
  private render(): void {
    this.renderer.render(
      this.sceneManager.getScene(),
      this.cameraController.getCamera()
    );
  }
  
  private handleResize(): void {
    this.renderer.resize();
    this.cameraController.handleResize(
      window.innerWidth / window.innerHeight
    );
  }
  
  private setupDebug(): void {
    // Stats panel
    this.stats = new Stats();
    this.stats.showPanel(0); // FPS
    document.body.appendChild(this.stats.dom);
    this.stats.dom.style.left = 'auto';
    this.stats.dom.style.right = '0px';
    
    // Debug key binding
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F3') {
        this.showDebug = !this.showDebug;
        const debugElement = document.getElementById('debug');
        if (debugElement) {
          debugElement.style.display = this.showDebug ? 'block' : 'none';
        }
      }
      
      // Reset key (R)
      if (e.key === 'r' || e.key === 'R') {
        console.log('Resetting aircraft position');
        this.playerAircraft.reset();
        this.cameraController.update(0); // Immediate camera update
      }
      
      // Test suites (T) - for debugging
      if (e.key === 't' || e.key === 'T') {
        console.log('Running comprehensive test suite...');
        
        // Run auto-reset tests
        import('../tests/manual-reset-test').then(module => {
          const resetTester = new module.ResetTester();
          return resetTester.runAllTests();
        }).then(() => {
          // Run physics tests
          return import('../tests/physics-test').then(module => {
            const physicsTester = new module.PhysicsTestSuite();
            return physicsTester.runAllTests();
          });
        }).then(() => {
          console.log('✨ All test suites completed!');
        }).catch(error => {
          console.error('❌ Test suite failed:', error);
        });
      }
    });
  }
  
  private updateDebugInfo(): void {
    const debugElement = document.getElementById('debug');
    if (!debugElement) return;
    
    const aircraft = this.playerAircraft.getState();
    const dynamics = (this.playerAircraft as any).dynamics as import('../core/FlightDynamics').FlightDynamics;
    const engineState = dynamics.getEngineState();
    const stallSeverity = dynamics.getStallSeverity(aircraft);
    const isStalled = dynamics.isStalled(aircraft);
    
    debugElement.innerHTML = `
      <strong>Flight Data</strong><br>
      Position: ${aircraft.position.x.toFixed(1)}, ${aircraft.position.y.toFixed(1)}, ${aircraft.position.z.toFixed(1)}<br>
      Altitude: ${aircraft.altitude.toFixed(1)} m<br>
      Speed: ${aircraft.airspeed.toFixed(1)} m/s<br>
      Heading: ${(aircraft.heading * 180 / Math.PI).toFixed(1)}°<br>
      AoA: ${(aircraft.angleOfAttack * 180 / Math.PI).toFixed(1)}°<br>
      Health: ${aircraft.health}%<br>
      ${aircraft.health === 0 ? '<span style="color: red;">⚠️ CRASHED - Auto-reset in 2s</span><br>' : ''}
      <br>
      <strong>Engine Data</strong><br>
      Input Throttle: ${(aircraft.throttle * 100).toFixed(0)}%<br>
      Actual Throttle: ${(engineState.actualThrottle * 100).toFixed(0)}%<br>
      RPM: ${engineState.rpm.toFixed(0)}<br>
      Temperature: ${engineState.temperature.toFixed(0)}°C<br>
      <br>
      <strong>Aerodynamics</strong><br>
      ${isStalled ? '<span style="color: orange;">⚠️ STALLED</span>' : '<span style="color: green;">✓ Flying</span>'}<br>
      Stall Severity: ${(stallSeverity * 100).toFixed(0)}%<br>
      <br>
      <strong>Controls</strong><br>
      WASD/Arrows: Pitch & Roll<br>
      Q/E: Yaw<br>
      Shift/Ctrl: Throttle<br>
      R: Reset Position<br>
      T: Run Tests<br>
      1-5: Camera Views<br>
      F3: Toggle Debug
    `;
  }
  
  private updateFlightInstruments(): void {
    const aircraft = this.playerAircraft.getState();
    
    // Update airspeed indicator
    const airspeedElement = document.getElementById('airspeed-value');
    if (airspeedElement) {
      airspeedElement.textContent = aircraft.airspeed.toFixed(0);
    }
    
    // Update altimeter
    const altitudeElement = document.getElementById('altitude-value');
    if (altitudeElement) {
      altitudeElement.textContent = aircraft.altitude.toFixed(0);
    }
  }
  
  // Public API
  getPlayerAircraft(): Aircraft {
    return this.playerAircraft;
  }
  
  getSceneManager(): SceneManager {
    return this.sceneManager;
  }
}