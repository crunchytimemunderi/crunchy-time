const fs = require('fs');
const path = require('path');
const fbx2gltf = require('fbx2gltf');

const mascotDir = path.join(__dirname, '../public/models/mascot');

async function optimize() {
    console.log('Starting FBX -> GLB Optimization pipeline...');
    
    // Find all .fbx files
    const files = fs.readdirSync(mascotDir).filter(f => f.endsWith('.fbx'));
    console.log(`Found ${files.length} FBX files to convert.\n`);

    for (const file of files) {
        const inputPath = path.join(mascotDir, file);
        const outputPath = path.join(mascotDir, file.replace('.fbx', '.glb'));
        
        console.log(`[CONVERTING] ${file} -> ${path.basename(outputPath)}...`);
        
        try {
            // Convert using Draco compression (--draco) or just binary (--binary) 
            // We use simple binary to preserve Mixamo animations perfectly.
            const destPath = await fbx2gltf(inputPath, outputPath, ['--binary']);
            
            // Check file size reduction
            const originalSize = fs.statSync(inputPath).size / (1024 * 1024);
            const newSize = fs.statSync(destPath).size / (1024 * 1024);
            
            console.log(`  ✅ Done! ${originalSize.toFixed(2)}MB shrunk down to ${newSize.toFixed(2)}MB\n`);
        } catch (error) {
            console.error(`  ❌ Failed to convert ${file}:`, error);
        }
    }
    
    console.log('🎉 Optimization Payload Complete. Ready for NextJS injection.');
}

optimize();
