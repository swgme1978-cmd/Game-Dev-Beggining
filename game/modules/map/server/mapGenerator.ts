import sharp from 'sharp';
import { MapData, RawMapRegion, Province, RiverChannel, MapConfig, Point } from './types';

function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0').toUpperCase()).join('');
}

export async function generateMapData(provinceMaskImageBuffer: Buffer, config: MapConfig): Promise<MapData> {
    const image = sharp(provinceMaskImageBuffer);
    const metadata = await image.metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    const rawBuffer = await image.raw().toBuffer();
    const channels = metadata.channels || 3;

    const visited = new Uint8Array(width * height);
    const regions: RawMapRegion[] = [];

    const getPixelIndex = (x: number, y: number) => (y * width + x) * channels;
    const getHexAt = (x: number, y: number) => {
        const idx = getPixelIndex(x, y);
        return rgbToHex(rawBuffer[idx], rawBuffer[idx+1], rawBuffer[idx+2]);
    };

    let nextId = 1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const index = y * width + x;
            if (visited[index]) continue;

            const startHex = getHexAt(x, y);
            
            // flood fill
            const pixels: Point[] = [];
            const queue: Point[] = [{x, y}];
            visited[index] = 1;
            
            let sumX = 0;
            let sumY = 0;

            let head = 0;
            while (head < queue.length) {
                const pt = queue[head++];
                pixels.push(pt);
                sumX += pt.x;
                sumY += pt.y;

                // check 4 neighbors
                const neighbors = [
                    {x: pt.x + 1, y: pt.y},
                    {x: pt.x - 1, y: pt.y},
                    {x: pt.x, y: pt.y + 1},
                    {x: pt.x, y: pt.y - 1}
                ];

                for (const n of neighbors) {
                    if (n.x >= 0 && n.x < width && n.y >= 0 && n.y < height) {
                        const nIndex = n.y * width + n.x;
                        if (!visited[nIndex]) {
                            if (getHexAt(n.x, n.y) === startHex) {
                                visited[nIndex] = 1;
                                queue.push(n);
                            }
                        }
                    }
                }
            }

            const regionId = startHex + "_" + (nextId++);
            
            regions.push({
                id: regionId,
                colorHex: startHex,
                pixels: pixels,
                areaPixels: pixels.length,
                centroid: {
                    x: Math.round(sumX / pixels.length),
                    y: Math.round(sumY / pixels.length)
                },
                outline: [],
                neighbors: []
            });
        }
    }

    // Now find outlines and neighbors
    const pixelToRegion = new Array(width * height);
    for (const region of regions) {
        for (const pt of region.pixels) {
            pixelToRegion[pt.y * width + pt.x] = region.id;
        }
    }

    for (const region of regions) {
        const neighborSet = new Set<string>();
        for (const pt of region.pixels) {
            let isEdge = false;
            
            const adjacents = [
                {x: pt.x + 1, y: pt.y},
                {x: pt.x - 1, y: pt.y},
                {x: pt.x, y: pt.y + 1},
                {x: pt.x, y: pt.y - 1}
            ];
            
            for (const adj of adjacents) {
                if (adj.x >= 0 && adj.x < width && adj.y >= 0 && adj.y < height) {
                    const adjId = pixelToRegion[adj.y * width + adj.x];
                    if (adjId !== region.id) {
                        isEdge = true;
                        neighborSet.add(adjId);
                    }
                } else {
                    isEdge = true; // edge of map
                }
            }
            if (isEdge) {
                region.outline.push(pt);
            }
        }
        region.neighbors = Array.from(neighborSet);
    }

    // Phase 2: Classification & Final Data Population
    const provinces: Province[] = [];
    const riverChannels: RiverChannel[] = [];
    let provCount = 1;
    let riverCount = 1;

    // Map old raw IDs to new IDs
    const idMap = new Map<string, string>();

    for (const region of regions) {
        if (config.riverHexCodes.includes(region.colorHex)) {
            const newId = config.defaultRiverChannelNamePrefix + (riverCount++);
            idMap.set(region.id, newId);
        } else {
            const newId = config.defaultProvinceNamePrefix + (provCount++);
            idMap.set(region.id, newId);
        }
    }

    for (const region of regions) {
        const newId = idMap.get(region.id)!;
        const mappedNeighbors = region.neighbors.map(n => idMap.get(n)!);

        if (config.riverHexCodes.includes(region.colorHex)) {
            riverChannels.push({
                id: newId,
                name: newId,
                colorHex: region.colorHex,
                areaPixels: region.areaPixels,
                centroid: region.centroid,
                outline: region.outline,
                neighbors: mappedNeighbors
            });
        } else {
            let terrainType: 'GRASSLAND' | 'FOREST' | 'DESERT' | 'MOUNTAINOUS' | 'HILLY' | 'OCEAN' | 'UNKNOWN' = 'UNKNOWN';
            
            if (config.oceanProvinceHexes.includes(region.colorHex)) {
                terrainType = 'OCEAN';
            } else if (config.landProvinceTerrainTypes[region.colorHex]) {
                terrainType = config.landProvinceTerrainTypes[region.colorHex];
            } else {
                console.warn(`Warning: Unknown hex color ${region.colorHex} for region ${newId}`);
            }

            provinces.push({
                id: newId,
                name: newId,
                colorHex: region.colorHex,
                terrainType: terrainType,
                areaPixels: region.areaPixels,
                centroid: region.centroid,
                outline: region.outline,
                neighbors: mappedNeighbors,
                ownerId: null
            });
        }
    }

    return {
        width,
        height,
        provinces,
        riverChannels
    };
}
