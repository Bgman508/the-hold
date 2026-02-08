#!/usr/bin/env node

/**
 * Icon Generation Script for THE HOLD
 * 
 * This script generates PNG icons in various sizes from the base SVG.
 * Run with: node scripts/generate-icons.js
 * 
 * Requires: sharp (npm install sharp)
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.log('Note: sharp is not installed. SVG icons will be used directly.');
  console.log('To generate PNG icons, run: npm install sharp');
  process.exit(0);
}

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const INPUT_SVG = path.join(__dirname, '../public/icons/icon-base.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('Generating icons...');
  
  // Read the SVG file
  const svgBuffer = fs.readFileSync(INPUT_SVG);
  
  for (const size of ICON_SIZES) {
    const outputFile = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`✓ Generated ${size}x${size} icon`);
    } catch (err) {
      console.error(`✗ Failed to generate ${size}x${size} icon:`, err.message);
    }
  }
  
  // Generate favicon sizes
  const faviconSizes = [16, 32];
  for (const size of faviconSizes) {
    const outputFile = path.join(OUTPUT_DIR, `favicon-${size}x${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputFile);
      
      console.log(`✓ Generated favicon-${size}x${size}.png`);
    } catch (err) {
      console.error(`✗ Failed to generate favicon-${size}x${size}.png:`, err.message);
    }
  }
  
  // Generate Apple touch icon
  try {
    await sharp(svgBuffer)
      .resize(180, 180)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'apple-touch-icon.png'));
    
    console.log('✓ Generated apple-touch-icon.png');
  } catch (err) {
    console.error('✗ Failed to generate apple-touch-icon.png:', err.message);
  }
  
  // Generate MS Tile icon
  try {
    await sharp(svgBuffer)
      .resize(150, 150)
      .png()
      .toFile(path.join(OUTPUT_DIR, 'mstile-150x150.png'));
    
    console.log('✓ Generated mstile-150x150.png');
  } catch (err) {
    console.error('✗ Failed to generate mstile-150x150.png:', err.message);
  }
  
  console.log('\nIcon generation complete!');
}

generateIcons().catch(console.error);
