/**
 * Generate PWA icons from existing logo
 * This script creates 192x192 and 512x512 icons for PWA
 * 
 * Usage: node scripts/generate-pwa-icons.js
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
  console.log('\nAlternatively, you can manually create icons:');
  console.log('1. Use an online tool: https://realfavicongenerator.net/');
  console.log('2. Or resize your mofa-logo.png to:');
  console.log('   - icon-192x192.png (192x192 pixels)');
  console.log('   - icon-512x512.png (512x512 pixels)');
  console.log('3. Place them in the public/ folder');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'mofa-logo.png');
const icon192Path = path.join(publicDir, 'icon-192x192.png');
const icon512Path = path.join(publicDir, 'icon-512x512.png');

async function generateIcons() {
  try {
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.log('❌ Logo not found at:', logoPath);
      console.log('Please ensure mofa-logo.png exists in the public folder');
      process.exit(1);
    }

    console.log('🖼️  Generating PWA icons...');

    // Generate 192x192 icon
    await sharp(logoPath)
      .resize(192, 192, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(icon192Path);

    console.log('✅ Created icon-192x192.png');

    // Generate 512x512 icon
    await sharp(logoPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(icon512Path);

    console.log('✅ Created icon-512x512.png');
    console.log('\n🎉 PWA icons generated successfully!');
    console.log('Icons are ready in the public/ folder');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    console.log('\n📝 Manual alternative:');
    console.log('1. Open mofa-logo.png in an image editor');
    console.log('2. Resize to 192x192 and save as icon-192x192.png');
    console.log('3. Resize to 512x512 and save as icon-512x512.png');
    console.log('4. Place both files in the public/ folder');
    process.exit(1);
  }
}

generateIcons();

