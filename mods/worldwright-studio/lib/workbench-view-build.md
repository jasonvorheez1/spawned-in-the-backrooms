# Private viewer codec build
Three.js 0.186.0, esbuild; MIT viewer, Apache-2.0 Basis Universal codec.
Bundle workbench-view.js with injected Three, GLTFLoader, OrbitControls, TransformControls, GLTFExporter, MeshoptDecoder, KTX2Loader and WebGLTextureUtils. Output IIFE WWWorkbench3D with minification; define import.meta.url to a valid absolute build URL (default transcoder paths are never used; workbench-codecs.js maps both files to local blobs). Upload the text artifact and update VIEWER in ui-workbench.js. Basis payload contains the matching vendored JS and base64-encoded WASM, not a model or user data.

Compressed fixture regression: rig with a KHR_texture_basisu/UASTC texture loads one mesh and two joints, permits joint selection, exports a 3520-byte GLB and disposes decoder resources. This is a browser fixture receipt, not the creator tablet.


2026-09-14 model-detail installation: use `research/model-detail/build-viewer.cjs`, which enumerates the required THREE symbols rather than an obsolete fixed injection list. The installed viewer hash is `2fce87293679c4cb04119eecfd90d45f2236b576202568afefa98c1c3aba98ba`, 995,666 bytes (4,334 bytes headroom). Rebuild the embedded worker with `build-worker.cjs` after kernel changes, then rebuild/recheck the viewer. Upload only a passing candidate. The final client has `viewerRef`-keyed handoff as well as its version; do not discard drafts during a loader update. Full evidence and limits: `research/model-detail/README.md`.
