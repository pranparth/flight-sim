// Standalone test runner for auto-reset functionality
// Run with: npx tsx test-runner.ts

import { ResetTester } from './src/tests/manual-reset-test';

console.log('🚀 WW2 Flight Simulator - Auto-Reset Test Suite\n');
console.log('This will test 4 key scenarios:');
console.log('1. Crash Auto-Reset (2-second delay)');
console.log('2. Stuck Detection (immediate reset)');
console.log('3. Boundary Reset (low/high speed behavior)');
console.log('4. Manual Reset Cancellation\n');
console.log('Starting tests...\n');

const tester = new ResetTester();
tester.runAllTests().then(() => {
  console.log('\n✨ All tests completed!');
}).catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});