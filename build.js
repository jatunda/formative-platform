const fs = require('fs-extra');
const path = require('path');

async function build() {
  const webDir = path.join(__dirname, 'web');
  const distDir = path.join(__dirname, 'dist');
  
  try {
    console.log('🔨 Starting build process...');
    
    // Clean dist folder
    console.log('🧹 Cleaning dist folder...');
    await fs.remove(distDir);
    
    // Copy all web files to dist
    console.log('📁 Copying web files to dist...');
    await fs.copy(webDir, distDir);
    
    // Remove development files
    const devFiles = [
      'generate-password-hash.html',
      // Add any other dev-only files here
    ];
    
    console.log('🗑️  Removing development files...');
    for (const file of devFiles) {
      const filePath = path.join(distDir, file);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
        console.log(`   ✅ Removed: ${file}`);
      }
    }
    
    // List what was built
    const distFiles = await fs.readdir(distDir);
    console.log('\n📦 Files in dist folder:');
    distFiles.forEach(file => {
      console.log(`   📄 ${file}`);
    });
    
    console.log('\n✅ Build complete! Files copied to dist/');
    console.log('🚀 Ready to deploy from dist/ folder');
    console.log('\n💡 Deploy options:');
    console.log('   • Firebase: firebase deploy');
    console.log('   • Netlify: Drag dist/ folder to netlify.com');
    console.log('   • Vercel: vercel dist/');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
