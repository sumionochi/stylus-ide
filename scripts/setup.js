const { exec, spawn } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');

const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkCommand(command) {
  try {
    await execAsync(command, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function getRustVersion() {
  try {
    const { stdout } = await execAsync('rustc --version', { timeout: 5000 });
    const match = stdout.match(/rustc (\d+)\.(\d+)\.(\d+)/);
    if (match) {
      return {
        major: parseInt(match[1]),
        minor: parseInt(match[2]),
        patch: parseInt(match[3]),
        string: `${match[1]}.${match[2]}.${match[3]}`
      };
    }
  } catch {}
  return null;
}

function isRustVersionSufficient(version, minMajor = 1, minMinor = 88) {
  if (!version) return false;
  if (version.major > minMajor) return true;
  if (version.major === minMajor && version.minor >= minMinor) return true;
  return false;
}

async function runCommand(command, description) {
  log(`\n${description}...`, colors.blue);
  return new Promise((resolve, reject) => {
    const child = spawn(command, [], { 
      shell: true, 
      stdio: 'inherit' 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log('✓ Success', colors.green);
        resolve();
      } else {
        log(`✗ Failed with code ${code}`, colors.red);
        reject(new Error(`Command failed: ${command}`));
      }
    });
  });
}

async function installRust(platform) {
  log('\n━━━ Installing Rust ━━━', colors.yellow);
  
  if (platform === 'win32') {
    log('\nWindows detected. Please:', colors.yellow);
    log('1. Download Rust from: https://rustup.rs');
    log('2. Run the installer (rustup-init.exe)');
    log('3. Follow the installation prompts');
    
    const answer = await question('\nHave you installed Rust? (y/n): ');
    if (answer.toLowerCase() !== 'y') {
      throw new Error('Rust installation required');
    }
  } else {
    // Unix-like systems
    await runCommand(
      "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
      'Downloading and installing Rust'
    );
    
    // Source cargo env
    log('\nConfiguring shell environment...', colors.blue);
    process.env.PATH = `${process.env.HOME}/.cargo/bin:${process.env.PATH}`;
  }
}

async function updateRust() {
  log('\n━━━ Updating Rust ━━━', colors.yellow);
  await runCommand('rustup update stable', 'Updating Rust to latest stable version');
}

async function installWasmTarget() {
  log('\n━━━ Adding WASM Target ━━━', colors.yellow);
  await runCommand(
    'rustup target add wasm32-unknown-unknown',
    'Installing wasm32-unknown-unknown target'
  );
}

async function installCargoStylus(tryLocked = false) {
  log('\n━━━ Installing Cargo Stylus ━━━', colors.yellow);
  
  const command = tryLocked 
    ? 'cargo install cargo-stylus --locked'
    : 'cargo install cargo-stylus';
  
  const description = tryLocked
    ? 'Installing cargo-stylus with locked dependencies (this may take several minutes)'
    : 'Installing cargo-stylus (this may take several minutes)';
  
  try {
    await runCommand(command, description);
    return true;
  } catch (error) {
    return false;
  }
}

async function checkStatus() {
  log('\n━━━ Checking Current Status ━━━', colors.yellow);
  
  const checks = {
    rust: await checkCommand('rustc --version'),
    cargo: await checkCommand('cargo --version'),
    wasmTarget: false,
    cargoStylus: await checkCommand('cargo stylus --version'),
    rustVersion: null,
  };

  // Get Rust version
  checks.rustVersion = await getRustVersion();

  // Check wasm target
  try {
    const { stdout } = await execAsync('rustup target list', { timeout: 5000 });
    checks.wasmTarget = stdout.includes('wasm32-unknown-unknown (installed)');
  } catch {
    checks.wasmTarget = false;
  }

  log(`Rust: ${checks.rust ? '✓' : '✗'}`, checks.rust ? colors.green : colors.red);
  if (checks.rustVersion) {
    log(`  Version: ${checks.rustVersion.string}`, colors.cyan);
  }
  log(`Cargo: ${checks.cargo ? '✓' : '✗'}`, checks.cargo ? colors.green : colors.red);
  log(`WASM Target: ${checks.wasmTarget ? '✓' : '✗'}`, checks.wasmTarget ? colors.green : colors.red);
  log(`Cargo Stylus: ${checks.cargoStylus ? '✓' : '✗'}`, checks.cargoStylus ? colors.green : colors.red);

  return checks;
}

async function main() {
  log('\n╔═══════════════════════════════════════╗', colors.blue);
  log('║   Stylus IDE Environment Setup       ║', colors.blue);
  log('╚═══════════════════════════════════════╝\n', colors.blue);

  const platform = process.platform;
  log(`Detected platform: ${platform}`, colors.blue);

  try {
    // Check current status
    const status = await checkStatus();

    // Install Rust if missing
    if (!status.rust || !status.cargo) {
      const answer = await question('\nRust is not installed. Install now? (y/n): ');
      if (answer.toLowerCase() === 'y') {
        await installRust(platform);
        log('\n⚠ Please restart your terminal and run this script again.', colors.yellow);
        log('After restarting, run: npm run setup', colors.cyan);
        process.exit(0);
      } else {
        throw new Error('Rust installation required');
      }
    }

    // Check Rust version for cargo-stylus compatibility
    const rustVersion = status.rustVersion;
    const minRustVersion = { major: 1, minor: 88 };
    
    if (rustVersion && !isRustVersionSufficient(rustVersion, minRustVersion.major, minRustVersion.minor)) {
      log(`\n⚠ Warning: Rust ${rustVersion.string} detected`, colors.yellow);
      log(`  cargo-stylus v0.6.3+ requires Rust ${minRustVersion.major}.${minRustVersion.minor}+`, colors.yellow);
      log(`  You may encounter errors during cargo-stylus installation.\n`, colors.yellow);
      
      const answer = await question(`Upgrade Rust to latest stable (recommended)? (y/n): `);
      if (answer.toLowerCase() === 'y') {
        await updateRust();
        
        // Re-check version
        const newVersion = await getRustVersion();
        if (newVersion) {
          log(`\n✓ Rust updated to ${newVersion.string}`, colors.green);
        }
      }
    }

    // Install WASM target
    if (!status.wasmTarget) {
      const answer = await question('\nWASM target is not installed. Install now? (y/n): ');
      if (answer.toLowerCase() === 'y') {
        await installWasmTarget();
      } else {
        throw new Error('WASM target required');
      }
    }

    // Install Cargo Stylus
    if (!status.cargoStylus) {
      const answer = await question('\nCargo Stylus is not installed. Install now? (y/n): ');
      if (answer.toLowerCase() === 'y') {
        // Try normal install first
        log('\nAttempting standard installation...', colors.blue);
        const success = await installCargoStylus(false);
        
        if (!success) {
          log('\n⚠ Standard installation failed. This might be due to:', colors.yellow);
          log('  - Rust version incompatibility', colors.yellow);
          log('  - Network issues', colors.yellow);
          log('  - Missing system dependencies\n', colors.yellow);
          
          const retryAnswer = await question('Try installation with --locked flag? (y/n): ');
          if (retryAnswer.toLowerCase() === 'y') {
            const lockedSuccess = await installCargoStylus(true);
            
            if (!lockedSuccess) {
              log('\n✗ Installation with --locked also failed.', colors.red);
              log('\nPossible solutions:', colors.yellow);
              log('1. Update Rust: rustup update stable', colors.cyan);
              log('2. Check system requirements: https://docs.arbitrum.io/stylus/stylus-quickstart', colors.cyan);
              log('3. Try manual installation: cargo install cargo-stylus --force', colors.cyan);
              throw new Error('cargo-stylus installation failed');
            }
          } else {
            throw new Error('cargo-stylus installation required');
          }
        }
      } else {
        throw new Error('cargo-stylus installation required');
      }
    }

    // Final check
    log('\n━━━ Final Status ━━━', colors.yellow);
    const finalStatus = await checkStatus();
    
    const allGood = finalStatus.rust && finalStatus.cargo && 
                    finalStatus.wasmTarget && finalStatus.cargoStylus;

    if (allGood) {
      log('\n✓ Setup complete! You\'re ready to use Stylus IDE.', colors.green);
      log('\nRun: npm run dev', colors.cyan);
    } else {
      log('\n⚠ Some components are still missing.', colors.yellow);
      log('Please review the errors above and try again.', colors.yellow);
      process.exit(1);
    }

  } catch (error) {
    log(`\n✗ Setup failed: ${error.message}`, colors.red);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();