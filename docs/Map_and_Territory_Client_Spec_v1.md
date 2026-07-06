# Map and Territory System - Client-Side Rendering Specification - v1

## 1. Module Overview

This module is responsible for fetching the mechanical `MapData` from the server and rendering it visually in the client's "Game Preview" interface. It will provide the interactive visual foundation for all subsequent client-side game features.

## 2. Dependencies & Data Source

*   **Server-Side Map Data API**: This module will consume the `MapData` exposed by the `/api/game/map` endpoint, as implemented by the server-side Map and Territory module.
*   **`MapData` Structure**: Relies on the `MapData` interface defined in `game/modules/map/server/types.ts`, specifically the `provinces` and `riverChannels` arrays, which contain `outline` coordinates, `centroid` data, `colorHex`, and `terrainType` for each region.

## 3. Module Location & Main Component

*   **Module Directory**: All client-side code for this module will reside in `/game/modules/map/client/`.
*   **Main Component**: The primary React component responsible for rendering the map will be `MapRenderer.tsx` located at `/game/modules/map/client/MapRenderer.tsx`.

## 4. Rendering Technology

*   **HTML Canvas**: The map will be rendered using an HTML `<canvas>` element. This choice is based on its performance benefits for drawing complex, dynamic shapes and its flexibility for future enhancements involving units, effects, and detailed overlays.

## 5. Component Structure (`MapRenderer.tsx`)

The `MapRenderer.tsx` React component will be structured as follows:

*   **State Management (`useState`)**:
    *   A state variable (e.g., `mapData: MapData | null`) will be used to store the fetched map data.
*   **DOM Reference (`useRef`)**:
    *   A ref will be used to obtain a direct reference to the `<canvas>` DOM element, allowing direct manipulation via its 2D rendering context.
*   **Side Effects & Lifecycle (`useEffect`)**:
    *   **Data Fetching**: A `useEffect` hook will be used to perform an asynchronous `fetch` call to the `/api/game/map` endpoint when the component mounts. The fetched data will then update the `mapData` state.
    *   **Drawing Trigger**: Another `useEffect` (or the same one, conditionally) will be responsible for triggering the map drawing function whenever `mapData` changes or the component mounts/resizes.
*   **Drawing Function**:
    *   A dedicated, encapsulated function (e.g., `drawMap(ctx: CanvasRenderingContext2D, data: MapData)`) will handle all Canvas drawing operations. This function will iterate through `mapData.provinces` and `mapData.riverChannels` to render them.
*   **JSX Render**: The component's `render` method will primarily return the `<canvas>` element.

## 6. Initial Display Requirements (Minimum Viable Product)

The initial render of the map will include:

*   **Canvas Initialization**: The canvas will be initialized with appropriate `width` and `height` based on the fetched `mapData.width` and `mapData.height`.
*   **Region Outlines**: The `outline` data (array of `{x, y}` points) for each `Province` and `RiverChannel` will be drawn on the canvas, creating visible borders.
*   **Region Fill Colors**:
    *   Each `Province` will be filled with a distinct color. Initially, this can be derived from its `colorHex` property, or a simplified representation based on its `terrainType`.
    *   Each `RiverChannel` will be filled with a distinct river-like color (e.g., a specific blue), potentially derived from its `colorHex`.
*   **Centroids & Labels (for Debugging)**: For initial verification and debugging, a small dot will be drawn at the `centroid` of each `Province` and `RiverChannel`. Optionally, the `id` or `name` of the region can be rendered as text near the centroid. This will help confirm that centroid calculations are correct and that regions are uniquely identifiable.

## 7. Hooks & Integration Points

*   **Client-Side (`MapRenderer.tsx` exports)**:
    *   The `MapRenderer` component will be exported as the primary entry point for displaying the map.
*   **GDA UI (`src/App.tsx`)**:
    *   A `GameEntry` component (or directly `MapRenderer`) will be mounted within the "Game Preview" area of `src/App.tsx` to display the rendered map.
*   **Future Events (e.g., for `Unit` module, `Economy` module)**:
    *   `onProvinceClick(provinceId: string, x: number, y: number)`: An event emitted when a player clicks on a specific province (to be implemented in a future phase).
    *   `getMapCoordinates(provinceId: string, locationType?: 'centroid' | 'random'): { x: number; y: number; }`: Utility to get visual coordinates for placing units, buildings, etc.

## 8. Future Considerations

*   **Background Image**: Overlaying the `world_background.png` (the artistic map) behind the rendered mechanical regions.
*   **Zoom & Pan**: Implementing interactive controls for navigating the map.
*   **Dynamic Overlays**: Displaying units, buildings, and ownership changes dynamically.
*   **Tooltip/Hover Information**: Showing province details on mouse hover.