const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

async function checkCommand(command) {
  try {
    await execAsync(command, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  console.log('\n━━━ Environment Check ━━━\n');

  const checks = {
    rust: await checkCommand('rustc --version'),
    cargo: await checkCommand('cargo --version'),
    wasmTarget: false,
    cargoStylus: await checkCommand('cargo stylus --version'),
  };

  try {
    const { stdout } = await execAsync('rustup target list', { timeout: 5000 });
    checks.wasmTarget = stdout.includes('wasm32-unknown-unknown (installed)');
  } catch {}

  console.log(`${checks.rust ? colors.green : colors.red}Rust: ${checks.rust ? '✓' : '✗'}${colors.reset}`);
  console.log(`${checks.cargo ? colors.green : colors.red}Cargo: ${checks.cargo ? '✓' : '✗'}${colors.reset}`);
  console.log(`${checks.wasmTarget ? colors.green : colors.red}WASM Target: ${checks.wasmTarget ? '✓' : '✗'}${colors.reset}`);
  console.log(`${checks.cargoStylus ? colors.green : colors.red}Cargo Stylus: ${checks.cargoStylus ? '✓' : '✗'}${colors.reset}`);

  const allGood = checks.rust && checks.cargo && checks.wasmTarget && checks.cargoStylus;

  if (allGood) {
    console.log(`\n${colors.green}✓ All requirements met!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ Run 'npm run setup' to install missing components${colors.reset}`);
    process.exit(1);
  }
}

main();