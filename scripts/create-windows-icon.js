/**
 * Create Windows Icon from existing logo
 * This script creates icon.ico for Windows Electron builds
 * 
 * Usage: node scripts/create-windows-icon.js
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
  console.log('\n📝 Manual alternative:');
  console.log('1. Use an online tool: https://convertio.co/png-ico/');
  console.log('2. Or use: https://www.icoconverter.com/');
  console.log('3. Convert your mofa-logo.png to icon.ico (256x256)');
  console.log('4. Place icon.ico in the public/ folder');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'mofa-logo.png');
const iconPath = path.join(publicDir, 'icon.ico');

async function createIcon() {
  try {
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.log('❌ Logo not found at:', logoPath);
      console.log('Please ensure mofa-logo.png exists in the public folder');
      process.exit(1);
    }

    console.log('🖼️  Creating Windows icon...');

    // Create ICO file (Windows icon format)
    // Note: sharp doesn't directly support ICO, so we'll create a PNG first
    // For a proper ICO, you'd need a specialized tool, but PNG works for Electron
    const pngIconPath = path.join(publicDir, 'icon-256x256.png');
    
    await sharp(logoPath)
      .resize(256, 256, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(pngIconPath);

    console.log('✅ Created icon-256x256.png');

    // For Electron, we can use PNG as icon on Windows (Electron supports it)
    // But for a proper .ico file, you'll need to use an online converter
    console.log('\n📝 Next Steps:');
    console.log('1. The PNG icon has been created at:', pngIconPath);
    console.log('2. For a proper .ico file, convert it using:');
    console.log('   - Online: https://convertio.co/png-ico/');
    console.log('   - Or: https://www.icoconverter.com/');
    console.log('3. Save as icon.ico in the public/ folder');
    console.log('\n💡 Note: Electron will also accept PNG format, but .ico is preferred for Windows');
    
  } catch (error) {
    console.error('❌ Error creating icon:', error.message);
    console.log('\n📝 Manual alternative:');
    console.log('1. Open mofa-logo.png in an image editor');
    console.log('2. Resize to 256x256 pixels');
    console.log('3. Convert to ICO format using online tool');
    console.log('4. Save as icon.ico in the public/ folder');
    process.exit(1);
  }
}

createIcon();

