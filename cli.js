#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Stylus IDE...');

// Point to the frontend directory
const frontendPath = path.join(__dirname, 'frontend');

// Run 'npm run dev' inside the frontend folder
// Note: For a production package, you might want to run 'npm run start' 
// after building, but for "as is" source, 'dev' is safest.
const child = spawn('npm', ['run', 'dev'], {
  cwd: frontendPath,
  stdio: 'inherit', // This pipes the output (logs) to the user's terminal
  shell: true
});

child.on('error', (err) => {
  console.error('Failed to start Stylus IDE:', err);
});

child.on('close', (code) => {
  if (code !== 0) {
    console.log(`Stylus IDE process exited with code ${code}`);
  }
});