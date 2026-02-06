# Build Resources

This directory contains resources used by electron-builder for packaging the application.

## Required Icons

Before building for distribution, you need to add the following icon files:

### Windows

- `icon.ico` - Windows application icon (256x256 recommended, multi-resolution ICO file)

### macOS

- `icon.icns` - macOS application icon (1024x1024 recommended, ICNS format)

### Linux (optional)

Create an `icons` folder with PNG files at various sizes:

- `icons/16x16.png`
- `icons/32x32.png`
- `icons/48x48.png`
- `icons/64x64.png`
- `icons/128x128.png`
- `icons/256x256.png`
- `icons/512x512.png`

## Creating Icons

You can use tools like:

- [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) - Generate all icon formats from a single PNG
- [IconWorkshop](https://www.axialis.com/iconworkshop/) - Professional icon editor (Windows)
- [Icon Slate](https://www.kodlian.com/apps/icon-slate) - macOS icon editor

### Using electron-icon-builder

```bash
npm install -g electron-icon-builder
electron-icon-builder --input=./source-icon.png --output=./build
```

## Build Commands

After adding icons, use these commands to build:

```bash
# Build for current platform
npm run build

# Build for Windows only
npm run build:win

# Build for macOS only
npm run build:mac

# Build for all platforms
npm run build:all
```

## Output

Built packages will be placed in the `release` directory:

- Windows: `.exe` (NSIS installer) and portable `.exe`
- macOS: `.dmg` and `.zip`
- Linux: `.AppImage` and `.deb`
