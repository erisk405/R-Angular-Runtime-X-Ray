# Angular Runtime X-Ray - Documentation Index

Welcome to the Angular Runtime X-Ray project! This index will guide you to the right documentation for your needs.

## 🚀 Quick Navigation

### For First-Time Users
1. **[QUICKSTART.md](QUICKSTART.md)** - Get up and running in 5 minutes
2. **[README.md](README.md)** - Complete feature overview and usage guide
3. **[examples/sample-component.ts](examples/sample-component.ts)** - See it in action

### For Builders/Developers
1. **[BUILD_GUIDE.md](BUILD_GUIDE.md)** - Step-by-step build instructions
2. **[SETUP.md](SETUP.md)** - Detailed setup and troubleshooting
3. **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical deep dive

### For Project Managers/Stakeholders
1. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete implementation overview
2. **[CHANGELOG.md](CHANGELOG.md)** - What was implemented and how

---

## 📚 Documentation Structure

### Core Documentation

| Document | Purpose | Length | Audience |
|----------|---------|--------|----------|
| **README.md** | Main documentation | ~200 lines | All users |
| **QUICKSTART.md** | Fast start guide | ~250 lines | New users |
| **BUILD_GUIDE.md** | Build instructions | ~400 lines | Builders |
| **SETUP.md** | Setup & troubleshooting | ~300 lines | Developers |
| **ARCHITECTURE.md** | Technical architecture | ~550 lines | Architects |
| **PROJECT_SUMMARY.md** | Implementation summary | ~350 lines | PMs/Leads |
| **CHANGELOG.md** | Version history | ~250 lines | All |
| **INDEX.md** | This file | Navigation | All |

### Specialized Documentation

| Document | Purpose | Audience |
|----------|---------|----------|
| **probe/README.md** | Probe usage guide | Angular developers |
| **LICENSE** | MIT License terms | Legal/Compliance |
| **examples/sample-component.ts** | Code examples | Developers |

---

## 🎯 Use Case Based Navigation

### "I want to use the extension in my Angular app"
1. Build it: **[BUILD_GUIDE.md](BUILD_GUIDE.md)**
2. Install it: **[BUILD_GUIDE.md#installing-the-extension](BUILD_GUIDE.md#installing-the-extension)**
3. Quick start: **[QUICKSTART.md](QUICKSTART.md)**
4. Use the probe: **[probe/README.md](probe/README.md)**
5. See examples: **[examples/sample-component.ts](examples/sample-component.ts)**

### "I need to build the extension from source"
1. Prerequisites: **[BUILD_GUIDE.md#prerequisites-installation](BUILD_GUIDE.md#prerequisites-installation)**
2. Build steps: **[BUILD_GUIDE.md#building-the-extension](BUILD_GUIDE.md#building-the-extension)**
3. Troubleshooting: **[BUILD_GUIDE.md#troubleshooting-build-issues](BUILD_GUIDE.md#troubleshooting-build-issues)**
4. Testing: **[BUILD_GUIDE.md#testing-the-extension](BUILD_GUIDE.md#testing-the-extension)**

### "I want to understand how it works"
1. Overview: **[README.md#architecture](README.md#architecture)**
2. Deep dive: **[ARCHITECTURE.md](ARCHITECTURE.md)**
3. Data flow: **[ARCHITECTURE.md#data-flow](ARCHITECTURE.md#data-flow)**
4. Performance: **[ARCHITECTURE.md#performance-characteristics](ARCHITECTURE.md#performance-characteristics)**

### "I'm verifying requirements compliance"
1. Summary: **[PROJECT_SUMMARY.md#requirements-compliance](PROJECT_SUMMARY.md#requirements-compliance)**
2. Detailed compliance: **[CHANGELOG.md#requirements-compliance](CHANGELOG.md#requirements-compliance)**
3. Implementation status: **[PROJECT_SUMMARY.md#implementation-status](PROJECT_SUMMARY.md#implementation-status)**

### "I'm troubleshooting an issue"
1. Build issues: **[BUILD_GUIDE.md#troubleshooting-build-issues](BUILD_GUIDE.md#troubleshooting-build-issues)**
2. Runtime issues: **[SETUP.md#troubleshooting](SETUP.md#troubleshooting)**
3. Common problems: **[QUICKSTART.md#troubleshooting-one-liners](QUICKSTART.md#troubleshooting-one-liners)**

### "I want to contribute or extend"
1. Architecture: **[ARCHITECTURE.md](ARCHITECTURE.md)**
2. Project structure: **[PROJECT_SUMMARY.md#project-structure](PROJECT_SUMMARY.md#project-structure)**
3. Build workflow: **[BUILD_GUIDE.md#development-workflow](BUILD_GUIDE.md#development-workflow)**
4. Extensibility: **[ARCHITECTURE.md#extensibility-points](ARCHITECTURE.md#extensibility-points)**

---

## 📁 File Organization

### Source Code
```
src/
├── extension.ts              # Main entry point
├── types.ts                  # Type definitions
├── websocket/
│   └── server.ts             # WebSocket server
├── visualization/
│   ├── decorationManager.ts  # Decorations
│   └── codeLensProvider.ts   # CodeLens
└── ai/
    └── promptGenerator.ts    # AI prompts
```

### Native Module (Rust)
```
native/
├── Cargo.toml                # Rust config
├── build.rs                  # Build script
└── src/
    ├── lib.rs                # FFI exports
    ├── file_locator.rs       # File search
    └── parser.rs             # TS parser
```

### Runtime Probe
```
probe/
├── index.ts                  # Public API
├── decorator.ts              # Decorators
├── websocket-client.ts       # WS client
├── tsconfig.json             # Config
└── README.md                 # Probe docs
```

### Examples & Docs
```
examples/
└── sample-component.ts       # Usage examples

Documentation:
├── README.md                 # Main docs
├── QUICKSTART.md             # Quick start
├── BUILD_GUIDE.md            # Build guide
├── SETUP.md                  # Setup guide
├── ARCHITECTURE.md           # Architecture
├── PROJECT_SUMMARY.md        # Summary
├── CHANGELOG.md              # Changelog
├── INDEX.md                  # This file
└── LICENSE                   # MIT License
```

---

## 🔍 Feature Documentation Matrix

| Feature | User Guide | Technical Docs | Examples |
|---------|-----------|----------------|----------|
| **Performance Monitoring** | README.md | ARCHITECTURE.md | sample-component.ts |
| **WebSocket Server** | SETUP.md | ARCHITECTURE.md | websocket/server.ts |
| **Rust Integration** | BUILD_GUIDE.md | ARCHITECTURE.md | native/src/ |
| **Decorators** | probe/README.md | decorator.ts | sample-component.ts |
| **Visualizations** | README.md | decorationManager.ts | - |
| **AI Analysis** | README.md | promptGenerator.ts | - |
| **Change Detection** | probe/README.md | decorator.ts | sample-component.ts |

---

## 📊 Requirements Documentation Map

| Requirement | Specification | Implementation | Verification |
|-------------|--------------|----------------|--------------|
| **Req 1: Infrastructure** | README.md | extension.ts, native/ | CHANGELOG.md |
| **Req 2: Runtime Probe** | probe/README.md | probe/ | CHANGELOG.md |
| **Req 3: Visualization** | README.md | visualization/ | CHANGELOG.md |
| **Req 4: AI Analysis** | README.md | ai/ | CHANGELOG.md |

---

## 🛠️ Common Tasks Quick Reference

### Build the Extension
```bash
# See: BUILD_GUIDE.md
npm install
npm run build:rust
npm run compile
npm run package
```

### Install the Extension
```bash
# See: BUILD_GUIDE.md#installing-the-extension
code --install-extension angular-runtime-xray-0.1.0.vsix
```

### Use in Angular App
```typescript
// See: QUICKSTART.md#minimal-angular-example
import { Performance } from '../probe';

@Performance()
myMethod() { /* ... */ }
```

### Debug the Extension
```bash
# See: BUILD_GUIDE.md#development-workflow
# 1. Open project in VS Code
# 2. Press F5
# 3. Extension Development Host opens
```

### Troubleshoot Build
```bash
# See: BUILD_GUIDE.md#troubleshooting-build-issues
# Clean build:
rm -rf out node_modules native/target *.vsix
npm install
npm run build:rust
```

---

## 📈 Documentation Stats

| Category | Count | Total Lines |
|----------|-------|-------------|
| Core Documentation | 8 files | ~2,500 lines |
| Source Code (TS) | 10 files | ~1,200 lines |
| Source Code (Rust) | 3 files | ~370 lines |
| Probe Code | 4 files | ~360 lines |
| Examples | 1 file | ~240 lines |
| Configuration | 6 files | ~200 lines |
| **Total** | **32 files** | **~4,870 lines** |

---

## 🎓 Learning Path

### Beginner Path
1. Read: **[README.md](README.md)** - Understand what it does
2. Follow: **[QUICKSTART.md](QUICKSTART.md)** - Try it out
3. Study: **[examples/sample-component.ts](examples/sample-component.ts)** - See patterns

### Intermediate Path
1. Build: **[BUILD_GUIDE.md](BUILD_GUIDE.md)** - Build from source
2. Explore: **[probe/README.md](probe/README.md)** - Deep dive into probe
3. Configure: **[SETUP.md](SETUP.md)** - Advanced setup

### Advanced Path
1. Analyze: **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design
2. Review: **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Implementation
3. Extend: **[ARCHITECTURE.md#extensibility-points](ARCHITECTURE.md#extensibility-points)** - Customize

---

## 🔗 External Resources

### Technologies Used
- **VS Code Extension API**: https://code.visualstudio.com/api
- **napi-rs**: https://napi.rs/
- **SWC**: https://swc.rs/
- **Rust**: https://www.rust-lang.org/
- **WebSocket (ws)**: https://github.com/websockets/ws
- **TypeScript**: https://www.typescriptlang.org/

### Related Documentation
- **Angular Performance**: https://angular.io/guide/performance-optimization
- **Chrome DevTools Performance**: https://developer.chrome.com/docs/devtools/performance/
- **VS Code Extension Guidelines**: https://code.visualstudio.com/api/references/extension-guidelines

---

## 📝 Documentation Guidelines

### When to Use Each Document

| Your Question | Read This |
|--------------|-----------|
| What does it do? | README.md |
| How do I start quickly? | QUICKSTART.md |
| How do I build it? | BUILD_GUIDE.md |
| How do I set it up? | SETUP.md |
| How does it work? | ARCHITECTURE.md |
| What was implemented? | PROJECT_SUMMARY.md |
| What's the history? | CHANGELOG.md |
| How do I use decorators? | probe/README.md |
| Where's an example? | examples/sample-component.ts |

---

## 🎯 Success Criteria Checklist

After reading the documentation, you should be able to:

- [ ] Understand what Angular Runtime X-Ray does
- [ ] Build the extension from source
- [ ] Install it in VS Code
- [ ] Add the probe to an Angular app
- [ ] Monitor method performance
- [ ] Interpret visual indicators
- [ ] Use AI analysis features
- [ ] Troubleshoot common issues
- [ ] Understand the architecture
- [ ] Verify requirements compliance

---

## 📞 Getting Help

### Documentation Not Clear?
1. Check the specific doc's troubleshooting section
2. Review related examples in `examples/`
3. Check VS Code Output: `View → Output → Angular X-Ray`

### Build Issues?
→ **[BUILD_GUIDE.md#troubleshooting-build-issues](BUILD_GUIDE.md#troubleshooting-build-issues)**

### Runtime Issues?
→ **[SETUP.md#troubleshooting](SETUP.md#troubleshooting)**

### Usage Questions?
→ **[QUICKSTART.md](QUICKSTART.md)** or **[probe/README.md](probe/README.md)**

---

## 🚀 Ready to Start?

### New User?
Start here: **[QUICKSTART.md](QUICKSTART.md)**

### Building from Source?
Start here: **[BUILD_GUIDE.md](BUILD_GUIDE.md)**

### Understanding the System?
Start here: **[ARCHITECTURE.md](ARCHITECTURE.md)**

### Verifying Compliance?
Start here: **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)**

---

## 📄 Document Versions

All documentation is for **Angular Runtime X-Ray v0.1.0**

Last Updated: 2025-01-21

---

**Navigation Tip:** Use your editor's search (Ctrl+F) to find specific topics across all documentation files.

Happy monitoring! 🎉
