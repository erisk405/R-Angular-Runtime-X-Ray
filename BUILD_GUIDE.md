# Build & Deployment Guide

Complete guide to building, testing, and deploying the Angular Runtime X-Ray extension.

## Prerequisites Installation

### 1. Install Rust (Required)

#### Windows
```powershell
# Download and run rustup-init.exe
Invoke-WebRequest -Uri https://win.rustup.rs -OutFile rustup-init.exe
.\rustup-init.exe

# Follow the installer prompts
# Restart your terminal after installation
```

#### macOS
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

#### Linux
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

**Verify Installation:**
```bash
rustc --version  # Should show: rustc 1.70.0 or higher
cargo --version  # Should show: cargo 1.70.0 or higher
```

### 2. Install Node.js (Required)

Download from [nodejs.org](https://nodejs.org/) - Use LTS version (18.x or higher)

**Verify Installation:**
```bash
node --version  # Should show: v18.x.x or higher
npm --version   # Should show: 9.x.x or higher
```

### 3. Install Build Tools (Platform-Specific)

#### Windows
Install Visual Studio Build Tools:
```powershell
# Option 1: Visual Studio 2022 with C++ build tools
# Download from: https://visualstudio.microsoft.com/downloads/

# Option 2: Build Tools only
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
```

Select:
- Desktop development with C++
- Windows 10 SDK

#### macOS
```bash
xcode-select --install
```

#### Linux (Debian/Ubuntu)
```bash
sudo apt-get update
sudo apt-get install build-essential pkg-config
```

#### Linux (Fedora/RHEL)
```bash
sudo dnf install gcc gcc-c++ make
```

---

## Building the Extension

### Step 1: Clone/Navigate to Project
```bash
cd "D:\Repositorie\[R]Angular Runtime X-Ray"
```

### Step 2: Install Node Dependencies
```bash
npm install
```

**Expected Output:**
```
added 45 packages, and audited 46 packages in 10s
```

**Troubleshooting:**
- If `npm install` fails, try: `npm cache clean --force && npm install`
- Check that `package.json` exists in the directory

### Step 3: Build Rust Native Module
```bash
npm run build:rust
```

**Expected Output:**
```
   Compiling napi-derive v2.16.0
   Compiling angular-xray-native v0.1.0
    Finished release [optimized] target(s) in 2m 15s
```

**This will:**
- Compile Rust code in `native/src/`
- Generate `native/index.node` (the native addon)
- Take 2-5 minutes on first build
- Subsequent builds are faster (~30 seconds)

**Verify Success:**
```bash
# Windows
dir native\index.node

# macOS/Linux
ls -lh native/index.node
```

You should see a file around 2-5 MB in size.

**Troubleshooting:**
```bash
# If build fails with "cargo not found"
cargo --version  # Verify Rust is installed
# Restart terminal if just installed

# If build fails with linker errors
# Windows: Install Visual Studio Build Tools
# macOS: xcode-select --install
# Linux: sudo apt-get install build-essential

# Clean and rebuild
cd native
cargo clean
cd ..
npm run build:rust
```

### Step 4: Compile TypeScript
```bash
npm run compile
```

**Expected Output:**
```
> angular-runtime-xray@0.1.0 compile
> npm run build:rust && tsc -p ./
```

**This will:**
- Run TypeScript compiler
- Generate JavaScript files in `out/` directory
- Create source maps for debugging

**Verify Success:**
```bash
# Windows
dir out\extension.js

# macOS/Linux
ls -lh out/extension.js
```

**Troubleshooting:**
```bash
# If compilation fails
npx tsc --version  # Should be 5.3.3 or higher

# See detailed errors
npx tsc -p . --listFiles

# Clean and rebuild
rm -rf out  # or: rmdir /s /q out (Windows)
npm run compile
```

### Step 5: Package Extension
```bash
npm run package
```

**Expected Output:**
```
> angular-runtime-xray@0.1.0 package
> vsce package

Executing prepublish script 'npm run vscode:prepublish'...
 DONE  Packaged: angular-runtime-xray-0.1.0.vsix (2.34 MB)
```

**This creates:** `angular-runtime-xray-0.1.0.vsix`

**Verify Success:**
```bash
# Windows
dir *.vsix

# macOS/Linux
ls -lh *.vsix
```

You should see: `angular-runtime-xray-0.1.0.vsix`

**Troubleshooting:**
```bash
# If vsce not found
npm install -g @vscode/vsce

# If packaging fails with missing files
# Check .vscodeignore doesn't exclude necessary files
cat .vscodeignore

# Manual packaging
npx vsce package
```

---

## Complete Build (One Command)

```bash
npm install && npm run build:rust && npm run compile && npm run package
```

**Total Time:** 3-6 minutes (first build)

---

## Installing the Extension

### Method 1: Command Line (Recommended)
```bash
code --install-extension angular-runtime-xray-0.1.0.vsix
```

**Expected Output:**
```
Installing extension 'angular-runtime-xray-0.1.0.vsix'...
Extension 'angular-runtime-xray-0.1.0.vsix' was successfully installed.
```

### Method 2: VS Code GUI
1. Open VS Code
2. Press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS)
3. Click the `...` menu in the Extensions view
4. Select "Install from VSIX..."
5. Browse to `angular-runtime-xray-0.1.0.vsix`
6. Click "Install"
7. Reload VS Code when prompted

### Method 3: Development Mode
For testing during development:
1. Open the project in VS Code
2. Press `F5`
3. A new "Extension Development Host" window opens
4. The extension is loaded in that window

### Verify Installation
```bash
# List installed extensions
code --list-extensions | grep angular

# Should show:
# angular-xray.angular-runtime-xray
```

Or in VS Code:
1. Open Extensions view (`Ctrl+Shift+X`)
2. Search for "Angular Runtime X-Ray"
3. Should show as installed

---

## Testing the Extension

### Test 1: Extension Activation
1. Open VS Code
2. Open any TypeScript project
3. Open Output panel: `View → Output`
4. Select "Angular X-Ray" from dropdown
5. Should see: `Angular Runtime X-Ray extension activated`
6. Should see: `Angular X-Ray WebSocket server started on port 3333`

### Test 2: WebSocket Connection
1. Copy the `probe` folder to an Angular project
2. Start Angular app: `ng serve`
3. Open browser DevTools (F12)
4. Console should show: `[Angular X-Ray] Connected to performance monitor`

### Test 3: Performance Monitoring
1. Add `@Performance()` to a method
2. Trigger the method in your app
3. Check VS Code Output for: `Performance: ClassName.methodName - XXms`
4. Open the file in VS Code
5. Should see inline decorations on the method

### Test 4: CodeLens & AI
1. Create a slow method (>50ms)
2. Trigger it several times
3. CodeLens should appear above method
4. Click "Analyze with AI"
5. Prompt should be copied to clipboard

---

## Development Workflow

### Watch Mode (Development)
```bash
# Terminal 1: Watch TypeScript changes
npm run watch

# Terminal 2: Run extension
# Press F5 in VS Code
```

### Rebuild Rust Module
```bash
# Debug build (faster, for development)
npm run build:rust:debug

# Release build (optimized, for production)
npm run build:rust
```

### Hot Reload
After changing TypeScript files:
1. Save the file
2. In Extension Development Host: `Ctrl+R` to reload
3. Changes are reflected immediately

After changing Rust files:
1. Rebuild: `npm run build:rust:debug`
2. Reload Extension Development Host: `Ctrl+R`

---

## Distribution

### Share the .vsix File
The `.vsix` file can be shared directly:

```bash
# Email, cloud storage, or repository
angular-runtime-xray-0.1.0.vsix
```

Recipients can install with:
```bash
code --install-extension angular-runtime-xray-0.1.0.vsix
```

### Publish to VS Code Marketplace (Optional)
```bash
# 1. Create publisher account at:
# https://marketplace.visualstudio.com/manage

# 2. Create Personal Access Token in Azure DevOps

# 3. Login to vsce
npx vsce login <publisher-name>

# 4. Publish
npx vsce publish
```

### GitHub Releases (Optional)
1. Create a GitHub repository
2. Tag the release: `git tag v0.1.0`
3. Push tags: `git push --tags`
4. Create GitHub Release
5. Upload the `.vsix` file as a release asset

---

## Platform-Specific Builds

### Building for Multiple Platforms

The native module must be built on each target platform:

#### On Windows (for Windows users)
```bash
npm install
npm run build:rust
npm run compile
npm run package
# Produces: angular-runtime-xray-0.1.0.vsix (Windows)
```

#### On macOS (for macOS users)
```bash
npm install
npm run build:rust
npm run compile
npm run package
# Produces: angular-runtime-xray-0.1.0.vsix (macOS)
```

#### On Linux (for Linux users)
```bash
npm install
npm run build:rust
npm run compile
npm run package
# Produces: angular-runtime-xray-0.1.0.vsix (Linux)
```

### Cross-Compilation (Advanced)
```bash
# Install cross-compilation targets
rustup target add x86_64-pc-windows-msvc
rustup target add x86_64-apple-darwin
rustup target add x86_64-unknown-linux-gnu

# Build for specific target
cargo build --target x86_64-pc-windows-msvc --release --manifest-path=native/Cargo.toml
```

---

## Troubleshooting Build Issues

### Issue: "cargo not found"
**Solution:**
```bash
# Verify Rust installation
rustc --version

# If not installed, install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal
# Add to PATH if needed (Windows)
set PATH=%PATH%;%USERPROFILE%\.cargo\bin
```

### Issue: "linker 'link.exe' failed"
**Solution (Windows):**
- Install Visual Studio Build Tools
- Select "Desktop development with C++"

### Issue: "cannot find -lstdc++"
**Solution (Linux):**
```bash
sudo apt-get install build-essential g++
```

### Issue: "native/index.node not found"
**Solution:**
```bash
# Rebuild the native module
npm run build:rust

# Verify it exists
ls native/index.node  # Should show the file
```

### Issue: "Extension fails to activate"
**Solution:**
```bash
# Check VS Code Output for errors
# View → Output → Angular X-Ray

# Verify all files are present
ls out/extension.js
ls native/index.node

# Reinstall
code --uninstall-extension angular-xray.angular-runtime-xray
code --install-extension angular-runtime-xray-0.1.0.vsix
```

### Issue: "Port 3333 already in use"
**Solution:**
```bash
# Check what's using the port
# Windows
netstat -ano | findstr :3333

# macOS/Linux
lsof -i :3333

# Kill the process or change the port in:
# src/websocket/server.ts
# probe/websocket-client.ts
```

---

## Build Artifacts

After a successful build, you should have:

```
angular-runtime-xray/
├── out/                    # Compiled JavaScript
│   ├── extension.js
│   ├── types.js
│   └── ...
│
├── native/
│   ├── index.node         # Native addon (2-5 MB)
│   └── target/            # Rust build artifacts
│
├── node_modules/          # Node dependencies
│
└── angular-runtime-xray-0.1.0.vsix  # Installable package
```

**Total Size:** ~50-100 MB (mostly node_modules and Rust target/)  
**Package Size:** ~2-5 MB (.vsix file)

---

## Clean Build

To clean all build artifacts:

```bash
# Clean everything
rm -rf out node_modules native/target native/index.node *.vsix

# Windows equivalent
rmdir /s /q out node_modules native\target
del native\index.node *.vsix

# Then rebuild from scratch
npm install
npm run build:rust
npm run compile
npm run package
```

---

## CI/CD Integration (Optional)

### GitHub Actions Example
```yaml
name: Build Extension

on: [push]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Setup Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
    
    - name: Install dependencies
      run: npm install
    
    - name: Build Rust module
      run: npm run build:rust
    
    - name: Compile TypeScript
      run: npm run compile
    
    - name: Package extension
      run: npm run package
    
    - name: Upload artifact
      uses: actions/upload-artifact@v2
      with:
        name: vsix-${{ matrix.os }}
        path: '*.vsix'
```

---

## Summary Checklist

Build Process:
- [ ] Rust installed and verified
- [ ] Node.js installed and verified
- [ ] Build tools installed (platform-specific)
- [ ] `npm install` completed successfully
- [ ] `npm run build:rust` completed successfully
- [ ] `npm run compile` completed successfully
- [ ] `npm run package` completed successfully
- [ ] `.vsix` file created

Installation:
- [ ] Extension installed in VS Code
- [ ] Extension appears in Extensions list
- [ ] Output channel shows activation message
- [ ] WebSocket server started on port 3333

Testing:
- [ ] Probe copied to Angular project
- [ ] WebSocket connection established
- [ ] Performance data received
- [ ] Decorations visible in editor
- [ ] CodeLens appears for slow methods
- [ ] AI prompt generation works

---

## Build Time Estimates

| Step | First Build | Subsequent Builds |
|------|-------------|-------------------|
| npm install | 10-30s | 5-10s (if needed) |
| Build Rust | 2-5 min | 20-60s |
| Compile TS | 5-10s | 2-5s |
| Package | 5-10s | 5-10s |
| **Total** | **3-6 min** | **30-90s** |

---

## Success! 🎉

If all steps completed successfully, you now have:
- ✅ A working `.vsix` extension file
- ✅ Extension installed in VS Code
- ✅ Ready to monitor Angular applications
- ✅ All features operational

Next: See `QUICKSTART.md` to start using the extension!
