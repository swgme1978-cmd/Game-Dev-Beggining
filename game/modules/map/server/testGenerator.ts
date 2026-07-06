import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { generateMapData } from './mapGenerator';
import { MapConfig } from './types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateDummyImage(filePath: string) {
    const width = 100;
    const height = 100;
    const channels = 3;
    const buffer = Buffer.alloc(width * height * channels);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * channels;
            if (x < 30) {
                // Ocean: #000080
                buffer[idx] = 0;
                buffer[idx+1] = 0;
                buffer[idx+2] = 128;
            } else if (x > 40 && x < 50) {
                // River: #0000FF
                buffer[idx] = 0;
                buffer[idx+1] = 0;
                buffer[idx+2] = 255;
            } else {
                // Grassland: #FF0000
                buffer[idx] = 255;
                buffer[idx+1] = 0;
                buffer[idx+2] = 0;
            }
        }
    }

    await sharp(buffer, {
        raw: {
            width,
            height,
            channels
        }
    }).png().toFile(filePath);
    console.log(`Dummy image created at ${filePath}`);
}

async function run() {
    const configPath = path.join(__dirname, 'config', 'map_config.json');
    const config: MapConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const imagePath = path.join(__dirname, 'testAssets', 'dummy_province_mask.png');
    
    // Generate dummy image if it doesn't exist
    if (!fs.existsSync(imagePath)) {
        await generateDummyImage(imagePath);
    }

    const imageBuffer = fs.readFileSync(imagePath);
    
    console.log("Generating map data...");
    const mapData = await generateMapData(imageBuffer, config);

    console.log("\n--- Map Data Summary ---");
    console.log(`Size: ${mapData.width}x${mapData.height}`);
    console.log(`Provinces count: ${mapData.provinces.length}`);
    console.log(`River channels count: ${mapData.riverChannels.length}`);
    
    console.log("\nSample Province:");
    if (mapData.provinces.length > 0) {
        const p = mapData.provinces[0];
        console.log(`  ID: ${p.id}, Name: ${p.name}, Terrain: ${p.terrainType}`);
        console.log(`  Centroid: (${p.centroid.x}, ${p.centroid.y}), Area: ${p.areaPixels}`);
        console.log(`  Neighbors: ${p.neighbors.join(', ')}`);
    }

    console.log("\nSample River Channel:");
    if (mapData.riverChannels.length > 0) {
        const r = mapData.riverChannels[0];
        console.log(`  ID: ${r.id}, Name: ${r.name}`);
        console.log(`  Centroid: (${r.centroid.x}, ${r.centroid.y}), Area: ${r.areaPixels}`);
        console.log(`  Neighbors: ${r.neighbors.join(', ')}`);
    }
}

run().catch(console.error);
