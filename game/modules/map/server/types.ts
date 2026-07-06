export interface Point {
    x: number;
    y: number;
}

export interface RawMapRegion {
    id: string;
    colorHex: string;
    pixels: Point[];
    areaPixels: number;
    centroid: Point;
    outline: Point[];
    neighbors: string[];
}

export type TerrainType = 'GRASSLAND' | 'FOREST' | 'DESERT' | 'MOUNTAINOUS' | 'HILLY' | 'OCEAN' | 'UNKNOWN';

export interface Province {
    id: string;
    name: string;
    colorHex: string;
    terrainType: TerrainType;
    areaPixels: number;
    centroid: Point;
    outline: Point[];
    neighbors: string[];
    ownerId: string | null;
}

export interface RiverChannel {
    id: string;
    name: string;
    colorHex: string;
    areaPixels: number;
    centroid: Point;
    outline: Point[];
    neighbors: string[];
}

export interface MapData {
    width: number;
    height: number;
    provinces: Province[];
    riverChannels: RiverChannel[];
}

export interface MapConfig {
    riverHexCodes: string[];
    oceanProvinceHexes: string[];
    landProvinceTerrainTypes: { [hex: string]: TerrainType };
    defaultProvinceNamePrefix: string;
    defaultRiverChannelNamePrefix: string;
}
