# Angular Runtime X-Ray

🚀 **Real-time performance monitoring for Angular applications**

Monitor method execution times, visualize performance bottlenecks, and get AI-powered optimization suggestions - all directly in VS Code!

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/angular-xray.angular-runtime-xray)](https://marketplace.visualstudio.com/items?itemName=angular-xray.angular-runtime-xray)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/angular-xray.angular-runtime-xray)](https://marketplace.visualstudio.com/items?itemName=angular-xray.angular-runtime-xray)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

### 🔍 Real-Time Performance Monitoring

- **Track method execution times** as you develop
- **Visual indicators** for slow methods (>50ms)
- **Performance metrics** displayed inline in your code
- **Zero configuration** - works out of the box

### 📊 Smart Visualizations

- **🔴 Red highlighting** for slow methods
- **🟢 Green indicators** for optimized code
- **📋 Hover tooltips** with detailed statistics
- **🔄 Change detection tracking** for Angular components

### 🤖 AI-Powered Analysis

- **One-click AI analysis** for performance issues
- **Generates comprehensive optimization prompts**
- **Copy-to-clipboard** for easy sharing with AI assistants
- **Smart suggestions** based on your code patterns

### ⚡ Blazing Fast Performance

- **Rust-powered** file searching and parsing
- **Minimal overhead** on your VS Code
- **Real-time WebSocket** communication
- **Cross-platform** support (Windows, macOS, Linux)

## 🚀 Quick Start

### 1. Install Extension

**From VS Code Marketplace:**

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Angular Runtime X-Ray"
4. Click **Install**

**Or install directly:**

```bash
code --install-extension angular-xray.angular-runtime-xray
```

### 2. Setup Your Angular Project

Run the setup command in VS Code:

- Open Command Palette (`Ctrl+Shift+P`)
- Type: `Angular X-Ray: Setup Performance Monitoring`
- Follow the prompts

**Or manually add decorators:**

```typescript
import { Performance } from './probe';

@Component({...})
export class MyComponent {
  @Performance()
  expensiveMethod() {
    // This method will be monitored
    return this.heavyComputation();
  }
}
```

### 3. Run Your App

```bash
ng serve
```

**That's it!** The extension automatically connects and starts monitoring.

## 📸 Screenshots

> 🚧 Screenshots will be added soon showing the extension in action

## 📋 Requirements

- **VS Code**: 1.85.0 or higher
- **Angular project** (any version)
- **No additional setup** required!

## 🛠️ How It Works

### Real-Time Monitoring

1. **Add decorators** to methods you want to monitor
2. **Run your Angular app** - the extension connects automatically
3. **See performance data** in VS Code as you interact with your app
4. **Get AI suggestions** for slow methods with one click

### Visual Feedback

- **🔴 Red background**: Methods taking >50ms
- **📊 Inline metrics**: Execution time displayed in your code
- **💡 CodeLens**: "Analyze with AI" button appears above slow methods
- **📈 Hover details**: Detailed statistics on hover

### AI Integration

When you click "Analyze with AI":

1. 🧠 **Comprehensive analysis prompt** is generated
2. 📋 **Automatically copied** to your clipboard
3. 🤖 **Paste into any AI assistant** (ChatGPT, Claude, etc.)
4. 💡 **Get specific optimization recommendations**

## 🎯 Use Cases

- **🐌 Find slow methods** in your Angular components
- **🔍 Identify performance bottlenecks** during development
- **📊 Monitor change detection** performance
- **🤖 Get AI-powered optimization tips**
- **⚡ Improve app performance** before deployment

## 🏗️ Architecture

### Why Angular Runtime X-Ray is Fast

- **🦀 Rust Native Module**: 10-100x faster file searching and parsing
- **⚡ SWC Parser**: Lightning-fast TypeScript code analysis
- **🔌 WebSocket Communication**: Real-time data streaming
- **💾 Memory Efficient**: Minimal VS Code overhead

### Technology Stack

- **TypeScript**: VS Code extension host and UI
- **Rust**: High-performance native module
- **WebSocket**: Real-time communication
- **napi-rs**: Seamless Node.js ↔ Rust integration

## ⚙️ Configuration

**No configuration needed!** The extension works out of the box.

### Optional Customization

- **WebSocket Port**: Default 3333 (can be changed if needed)
- **Performance Threshold**: Default 50ms for "slow" method detection
- **AI Prompt Templates**: Customizable analysis prompts

## 🎉 Why Choose Angular Runtime X-Ray?

✅ **Zero Configuration** - Install and start monitoring immediately  
✅ **Real-time Feedback** - See performance as you code  
✅ **AI-Powered Insights** - Get smart optimization suggestions  
✅ **Blazing Fast** - Rust-powered performance analysis  
✅ **Developer Friendly** - Integrates seamlessly with your workflow  
✅ **Cross-Platform** - Works on Windows, macOS, and Linux

## 🆘 Support & Troubleshooting

### Common Issues

**Extension not activating?**

- Check VS Code version (requires 1.85.0+)
- Look for errors in Output → Angular X-Ray

**Probe not connecting?**

- Ensure your Angular app is running (`ng serve`)
- Check browser console for connection errors
- Verify port 3333 isn't blocked by firewall

**Need help?**

- 📖 Check our [documentation](https://github.com/angular-xray/angular-runtime-xray)
- 🐛 [Report issues](https://github.com/angular-xray/angular-runtime-xray/issues)
- 💬 [Join discussions](https://github.com/angular-xray/angular-runtime-xray/discussions)

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
# Clone the repository
git clone https://github.com/angular-xray/angular-runtime-xray.git

# Install dependencies
npm install

# Build Rust module
npm run build:rust

# Start development
npm run watch
```

### Contributing Guidelines

- 🧪 Ensure tests pass (`cargo test`)
- 📝 Follow existing code style
- 📖 Update documentation as needed
- 🐛 Include tests for new features

### Development Commands

```bash
npm run watch          # Watch TypeScript changes
npm run build:rust     # Build Rust module (release)
npm run build:rust:debug # Build Rust module (debug)
npm run package        # Create .vsix package
```

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

## 🙏 Credits

Built with amazing open-source technologies:

- 🦀 [Rust](https://www.rust-lang.org/) - Systems programming language
- 🔗 [napi-rs](https://napi.rs/) - Node.js native addons
- ⚡ [SWC](https://swc.rs/) - TypeScript/JavaScript parser
- 🔌 [WebSocket](https://github.com/websockets/ws) - Real-time communication
- 🎨 [VS Code API](https://code.visualstudio.com/api) - Extension platform

---

**⭐ If you find Angular Runtime X-Ray helpful, please give it a star on [GitHub](https://github.com/angular-xray/angular-runtime-xray)!**

**🚀 Happy coding and optimizing your Angular applications!**
