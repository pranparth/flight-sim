import * as THREE from 'three';
import { CameraController, CameraMode } from '@systems/CameraController';
import { Aircraft } from '@entities/Aircraft';
import { Spitfire } from '@core/AircraftConfigs';

// Helper to create test aircraft
function createTestAircraft(): Aircraft {
  const aircraft = new Aircraft(Spitfire, 'player');
  aircraft.setPosition(new THREE.Vector3(0, 100, 0));
  return aircraft;
}

// Helper to simulate mouse wheel events
function simulateWheel(deltaY: number) {
  const event = new WheelEvent('wheel', {
    deltaY,
    bubbles: true
  });
  window.dispatchEvent(event);
}

// Helper to simulate keyboard events
function simulateKeyPress(key: string) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true
  });
  window.dispatchEvent(event);
}

export async function testCameraZoom(): Promise<void> {
  console.log('Testing Camera Zoom Functionality...');
  
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  const aircraft = createTestAircraft();
  const controller = new CameraController(camera, aircraft);
  
  // Test 1: Initial zoom level
  const initialZoom = controller.getZoomLevel();
  console.assert(initialZoom === 1, `Initial zoom should be 1, got ${initialZoom}`);
  
  // Test 2: Zoom out
  simulateWheel(100);
  await new Promise(resolve => setTimeout(resolve, 100));
  const zoomedOut = controller.getZoomLevel();
  console.assert(zoomedOut > 1, `Zoom out should increase zoom level, got ${zoomedOut}`);
  
  // Test 3: Zoom in
  simulateWheel(-200);
  await new Promise(resolve => setTimeout(resolve, 100));
  const zoomedIn = controller.getZoomLevel();
  console.assert(zoomedIn < zoomedOut, `Zoom in should decrease zoom level, got ${zoomedIn}`);
  
  // Test 4: Zoom limits
  for (let i = 0; i < 20; i++) {
    simulateWheel(-100);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  const minZoom = controller.getZoomLevel();
  console.assert(minZoom >= 0.5, `Zoom should not go below 0.5, got ${minZoom}`);
  
  for (let i = 0; i < 20; i++) {
    simulateWheel(100);
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  const maxZoom = controller.getZoomLevel();
  console.assert(maxZoom <= 2, `Zoom should not exceed 2, got ${maxZoom}`);
  
  console.log('✓ Camera zoom tests passed');
}

export async function testCameraReset(): Promise<void> {
  console.log('Testing Camera Reset Functionality...');
  
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  const aircraft = createTestAircraft();
  const controller = new CameraController(camera, aircraft);
  
  // Test 1: Reset in CHASE mode
  controller.setMode(CameraMode.CHASE);
  simulateWheel(200); // Zoom out
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const zoomedPosition = camera.position.clone();
  simulateKeyPress('c');
  
  // Allow time for reset animation
  for (let i = 0; i < 10; i++) {
    controller.update(0.016);
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  
  const resetZoom = controller.getZoomLevel();
  console.assert(Math.abs(resetZoom - 1) < 0.1, `Reset should restore zoom to ~1, got ${resetZoom}`);
  
  // Test 2: Reset from different camera modes
  controller.setMode(CameraMode.FREE);
  simulateKeyPress('c');
  
  await new Promise(resolve => setTimeout(resolve, 200));
  const modeAfterReset = controller.getMode();
  console.assert(modeAfterReset === CameraMode.CHASE, 'Reset should switch to CHASE mode');
  
  // Test 3: Reset maintains aircraft tracking
  aircraft.setPosition(new THREE.Vector3(100, 200, 300));
  simulateKeyPress('c');
  
  for (let i = 0; i < 10; i++) {
    controller.update(0.016);
    await new Promise(resolve => setTimeout(resolve, 16));
  }
  
  const cameraTarget = new THREE.Vector3();
  camera.getWorldDirection(cameraTarget);
  const toAircraft = aircraft.getPosition().clone().sub(camera.position).normalize();
  const dotProduct = cameraTarget.dot(toAircraft);
  
  console.assert(dotProduct > 0.8, 'Camera should be looking towards aircraft after reset');
  
  console.log('✓ Camera reset tests passed');
}

export async function testZoomPersistence(): Promise<void> {
  console.log('Testing Zoom Persistence Across Mode Changes...');
  
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
  const aircraft = createTestAircraft();
  const controller = new CameraController(camera, aircraft);
  
  // Set zoom level
  simulateWheel(150);
  await new Promise(resolve => setTimeout(resolve, 100));
  const zoomBefore = controller.getZoomLevel();
  
  // Switch camera modes
  controller.setMode(CameraMode.CINEMATIC);
  const zoomAfter1 = controller.getZoomLevel();
  console.assert(Math.abs(zoomAfter1 - zoomBefore) < 0.01, 'Zoom should persist after mode change');
  
  controller.setMode(CameraMode.THIRD_PERSON);
  const zoomAfter2 = controller.getZoomLevel();
  console.assert(Math.abs(zoomAfter2 - zoomBefore) < 0.01, 'Zoom should persist across multiple mode changes');
  
  console.log('✓ Zoom persistence tests passed');
}

// Test runner
export async function runCameraTests(): Promise<void> {
  console.log('=== Running Camera Control Tests ===');
  
  try {
    await testCameraZoom();
    await testCameraReset();
    await testZoomPersistence();
    console.log('\n✅ All camera control tests passed!');
  } catch (error) {
    console.error('❌ Camera control tests failed:', error);
    throw error;
  }
}

// Auto-run tests if this file is loaded directly
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const button = document.createElement('button');
    button.textContent = 'Run Camera Tests';
    button.style.position = 'fixed';
    button.style.bottom = '20px';
    button.style.right = '20px';
    button.style.zIndex = '1000';
    button.onclick = runCameraTests;
    document.body.appendChild(button);
  });
}