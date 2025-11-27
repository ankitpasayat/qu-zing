import sharp from 'sharp';

// ComicLogo SVG for wide assets (1024x576)
const createComicLogoSVG = (width: number, height: number): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1024 576">
  <defs>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFEB3B" />
      <stop offset="100%" style="stop-color:#FFC107" />
    </linearGradient>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1e1b4b" />
      <stop offset="100%" style="stop-color:#0f0a1e" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="576" fill="url(#bgGrad)" />

  <!-- Centered Logo Group -->
  <g transform="translate(512, 288)">
    <!-- Comic Burst Background -->
    <path
      fill="#EF4444"
      stroke="#000"
      stroke-width="6"
      d="M0,-120 L50,−70 L120,-100 L100,-40 L170,-20 L110,40 L150,110 L70,85 L0,140 L-70,85 L-150,110 L-110,40 L-170,-20 L-100,-40 L-120,-100 L-50,-70 Z"
      transform="scale(1.8)"
    />

    <!-- Main Text with stroke -->
    <text
      x="0"
      y="25"
      font-family="Arial Black, Arial, sans-serif"
      font-weight="900"
      font-size="130"
      fill="url(#textGrad)"
      stroke="#000"
      stroke-width="10"
      text-anchor="middle"
      style="paint-order: stroke fill"
    >
      Qu-Zing!
    </text>

    <!-- Lightning Bolt Right -->
    <path
      d="M280,-80 L260,-30 L290,-30 L270,30 L330,-40 L300,-40 Z"
      fill="#FFEB3B"
      stroke="#000"
      stroke-width="4"
      transform="rotate(15 300 -30)"
    />

    <!-- Lightning Bolt Left -->
    <path
      d="M-280,0 L-300,50 L-270,50 L-290,110 L-230,40 L-260,40 Z"
      fill="#FFEB3B"
      stroke="#000"
      stroke-width="4"
      transform="rotate(-15 -270 50)"
    />
  </g>
</svg>`;

// Background asset - content around edges, space in center for UI
const createBackgroundSVG = (width: number, height: number): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 1024 576">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1e1b4b" />
      <stop offset="100%" style="stop-color:#0f0a1e" />
    </linearGradient>
    <linearGradient id="textGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#FFEB3B" />
      <stop offset="100%" style="stop-color:#FFC107" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1024" height="576" fill="url(#bgGrad)" />

  <!-- Top Left Corner Burst -->
  <g transform="translate(100, 100) scale(0.6)">
    <path
      fill="#EF4444"
      stroke="#000"
      stroke-width="5"
      d="M0,-80 L30,-50 L80,-70 L65,-25 L110,-10 L70,30 L100,75 L45,55 L0,95 L-45,55 L-100,75 L-70,30 L-110,-10 L-65,-25 L-80,-70 L-30,-50 Z"
    />
    <text x="0" y="15" font-family="Arial Black" font-weight="900" font-size="50" fill="url(#textGrad)" stroke="#000" stroke-width="4" text-anchor="middle" style="paint-order: stroke fill">QZ!</text>
  </g>

  <!-- Top Right Lightning -->
  <path
    d="M900,40 L880,90 L910,90 L890,150 L950,80 L920,80 Z"
    fill="#FFEB3B"
    stroke="#000"
    stroke-width="3"
    transform="rotate(20 910 90)"
  />

  <!-- Bottom Left Lightning -->
  <path
    d="M80,450 L60,500 L90,500 L70,560 L130,490 L100,490 Z"
    fill="#FFEB3B"
    stroke="#000"
    stroke-width="3"
    transform="rotate(-15 90 500)"
  />

  <!-- Bottom Right Corner Burst -->
  <g transform="translate(920, 480) scale(0.5)">
    <path
      fill="#EF4444"
      stroke="#000"
      stroke-width="5"
      d="M0,-80 L30,-50 L80,-70 L65,-25 L110,-10 L70,30 L100,75 L45,55 L0,95 L-45,55 L-100,75 L-70,30 L-110,-10 L-65,-25 L-80,-70 L-30,-50 Z"
    />
  </g>

  <!-- Decorative question marks -->
  <text x="180" y="500" font-family="Arial Black" font-size="60" fill="#FFEB3B" opacity="0.3" transform="rotate(-20 180 500)">?</text>
  <text x="850" y="150" font-family="Arial Black" font-size="50" fill="#FFEB3B" opacity="0.3" transform="rotate(15 850 150)">?</text>
</svg>`;

async function generateDiscordAssets(): Promise<void> {
  try {
    // Cover Art - Main image with title (1024x576)
    await sharp(Buffer.from(createComicLogoSVG(1024, 576)))
      .png()
      .toFile('public/discord-cover.png');
    console.log('✓ Generated discord-cover.png (1024x576) - Cover Art');

    // Background - Content around edges (1024x576)
    await sharp(Buffer.from(createBackgroundSVG(1024, 576)))
      .png()
      .toFile('public/discord-background.png');
    console.log('✓ Generated discord-background.png (1024x576) - Background');

    console.log('\n✓ Discord Activity assets generated successfully!');
    console.log('\nUpload these to Discord Developer Portal:');
    console.log('  • Cover Art: public/discord-cover.png');
    console.log('  • Background: public/discord-background.png');
    console.log('  • App Icon: public/icon-1024.png (already generated)');
  } catch (error) {
    console.error('Error generating assets:', error);
    process.exit(1);
  }
}

generateDiscordAssets();
