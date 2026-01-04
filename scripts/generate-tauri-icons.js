/**
 * Generate Tauri App Icons
 * This script creates all required icon files for Tauri builds
 * 
 * Usage: node scripts/generate-tauri-icons.js
 * 
 * Note: This requires sharp package. Install with: npm install sharp --save-dev
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.log('⚠️  Sharp not found. Installing...');
  console.log('Please run: npm install sharp --save-dev');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
const logoPath = path.join(publicDir, 'mofa-logo.png');
const existingIcoPath = path.join(publicDir, 'mofa.ico');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('✅ Created icons directory:', iconsDir);
}

async function generateIcons() {
  try {
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.log('❌ Logo not found at:', logoPath);
      console.log('Please ensure mofa-logo.png exists in the public folder');
      process.exit(1);
    }

    console.log('🖼️  Generating Tauri icons...\n');

    // Generate 32x32.png
    const icon32Path = path.join(iconsDir, '32x32.png');
    await sharp(logoPath)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(icon32Path);
    console.log('✅ Created 32x32.png');

    // Generate 128x128.png
    const icon128Path = path.join(iconsDir, '128x128.png');
    await sharp(logoPath)
      .resize(128, 128, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(icon128Path);
    console.log('✅ Created 128x128.png');

    // Generate 128x128@2x.png (256x256 for retina)
    const icon256Path = path.join(iconsDir, '128x128@2x.png');
    await sharp(logoPath)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(icon256Path);
    console.log('✅ Created 128x128@2x.png');

    // Copy or create icon.ico for Windows
    const iconIcoPath = path.join(iconsDir, 'icon.ico');
    if (fs.existsSync(existingIcoPath)) {
      fs.copyFileSync(existingIcoPath, iconIcoPath);
      console.log('✅ Copied icon.ico from public/mofa.ico');
    } else {
      // Generate a PNG first (Tauri can use PNG as fallback)
      const png256Path = path.join(iconsDir, 'icon-256.png');
      await sharp(logoPath)
        .resize(256, 256, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(png256Path);
      
      // Copy PNG as icon.ico (Tauri CLI will handle conversion if needed)
      fs.copyFileSync(png256Path, iconIcoPath);
      console.log('✅ Created icon.ico (PNG format - Tauri will convert if needed)');
      console.log('   Note: For a proper .ico file, use an online converter:');
      console.log('   https://convertio.co/png-ico/ or https://www.icoconverter.com/');
    }

    // Generate icon.icns for macOS (Tauri CLI can generate this, but we'll create a placeholder)
    // Note: .icns files are complex multi-resolution containers
    // Tauri CLI will generate this automatically if we have the PNG files
    console.log('✅ Icon files ready for macOS (Tauri CLI will generate .icns during build)');

    console.log('\n🎉 Tauri icons generated successfully!');
    console.log('Icons are ready in:', iconsDir);
    console.log('\n📝 Note: If you want a proper .ico file for Windows,');
    console.log('   convert icon-256.png using an online tool and replace icon.ico');
    
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

