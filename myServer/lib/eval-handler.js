async function loadWasm(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch WASM: ${response.statusText}`);
        }
        const wasmModule = await WebAssembly.instantiateStreaming(response);
        return wasmModule.instance;
    } catch (error) {
        console.error('Error loading WASM:', error);
        return null;
    }
}

(async () => {
    const wasmInstance = await loadWasm('http://localhost:6969/wasm-file');
    if (wasmInstance) {
        console.log('WASM module loaded and instantiated:', wasmInstance);
    }
})();
