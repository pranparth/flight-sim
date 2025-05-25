// Standalone test runner for flight simulator test suites
// Run with: npx tsx test-runner.ts

import { ResetTester } from './src/tests/manual-reset-test';
import { PhysicsTestSuite } from './src/tests/physics-test';

console.log('🚀 WW2 Flight Simulator - Comprehensive Test Suite\n');

async function runAllTests() {
  console.log('=== AUTO-RESET TESTS ===');
  console.log('Testing 4 key scenarios:');
  console.log('1. Crash Auto-Reset (2-second delay)');
  console.log('2. Stuck Detection (immediate reset)');
  console.log('3. Boundary Reset (low/high speed behavior)');
  console.log('4. Manual Reset Cancellation\n');
  
  const resetTester = new ResetTester();
  await resetTester.runAllTests();
  
  console.log('\n=== PHYSICS TESTS ===');
  console.log('Testing improved flight dynamics:');
  console.log('1. Throttle Response and Engine Lag');
  console.log('2. Pitch Gravity Effects');
  console.log('3. Stall Behavior');
  console.log('4. Engine Characteristics');
  console.log('5. Stall Recovery');
  console.log('6. Deep Stall Conditions\n');
  
  const physicsTester = new PhysicsTestSuite();
  await physicsTester.runAllTests();
}

runAllTests().then(() => {
  console.log('\n✨ All test suites completed!');
}).catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});