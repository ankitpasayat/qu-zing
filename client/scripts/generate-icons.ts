import sharp from 'sharp';

// Create SVG buffer
const createSVG = (size: number): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFEB3B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFC107;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background Burst -->
  <path fill="#F44336" stroke="black" stroke-width="10"
        d="M256,20 L290,100 L380,60 L340,140 L440,160 L360,220 L420,300 L320,280 L256,380 L192,280 L92,300 L152,220 L72,160 L172,140 L132,60 L222,100 Z"
        transform="scale(1.1) translate(-25 -25)" />

  <!-- Text -->
  <g transform="rotate(-5 256 256)">
    <text x="256" y="310" font-family="Arial, sans-serif" font-weight="900" font-size="180" 
          fill="url(#grad1)" stroke="black" stroke-width="12" text-anchor="middle"
          style="paint-order: stroke fill;">
      QZ!
    </text>
    <!-- Bolt -->
    <path d="M400,100 L380,160 L410,160 L390,220 L450,140 L420,140 Z" fill="#FFEB3B" stroke="black" stroke-width="5" transform="rotate(15 400 150)"/>
  </g>
</svg>`;

// Generate icons
async function generateIcons(): Promise<void> {
  try {
    // Generate 192x192
    await sharp(Buffer.from(createSVG(192)))
      .png()
      .toFile('public/icon-192.png');
    console.log('✓ Generated icon-192.png');

    // Generate 512x512
    await sharp(Buffer.from(createSVG(512)))
      .png()
      .toFile('public/icon-512.png');
    console.log('✓ Generated icon-512.png');

    // Generate 1024x1024 (for Discord App Icon)
    await sharp(Buffer.from(createSVG(1024)))
      .png()
      .toFile('public/icon-1024.png');
    console.log('✓ Generated icon-1024.png');

    console.log('\n✓ All PWA icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();
