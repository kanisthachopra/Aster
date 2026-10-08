# Boulder 01

Source: https://polyhaven.com/a/boulder_01
License: CC0-1.0 (https://polyhaven.com/license)
Downloaded 2026-10-08 from https://api.polyhaven.com/files/boulder_01, 1K glTF package.

The original glTF descriptor and binary are retained, alongside 1K diffuse/OpenGL normal/ARM maps. HeroBoulders.ts reads this specific single-mesh asset, mirrors Z and reverses winding for the left-handed world, and instances the mesh ten times. No cloud loading is required at runtime.

The runtime uses a derived LOD (boulder-lod.bin plus its layout JSON), made by 2.2 cm vertex clustering with UV-island separation. Its 15,621 vertices and 26,455 triangles reduce scene geometry while retaining the scanned silhouette and original UV/material appearance. The full original binary is retained for provenance and later higher-detail production work.
