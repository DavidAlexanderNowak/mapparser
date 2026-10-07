const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const vendorDirectory = path.join(
    projectRoot,
    "src",
    "main",
    "resources",
    "META-INF",
    "resources",
    "assets",
    "vendor"
);

const assets = {
    "jquery.min.js": ["jquery", "dist/jquery.min.js"],
    "maplibre-gl.css": ["maplibre-gl", "dist/maplibre-gl.css"],
    "maplibre-gl.mjs": ["maplibre-gl", "dist/maplibre-gl.mjs"],
    "maplibre-gl-worker.mjs": ["maplibre-gl", "dist/maplibre-gl-worker.mjs"]
};

fs.rmSync(vendorDirectory, { recursive: true, force: true });
fs.mkdirSync(vendorDirectory, { recursive: true });

for (const [fileName, [dependency, relativeAssetPath]] of Object.entries(assets)) {
    const source = path.join(
        projectRoot,
        "node_modules",
        dependency,
        relativeAssetPath
    );

    const destination = path.join(vendorDirectory, fileName);

    if (fileName.endsWith(".js")) {
        let content = fs.readFileSync(source, "utf8");

        // Strip source map references from copied JavaScript assets.
        content = content.replace(
            /(?:\/\/|\/\*)[#@]\s*sourceMappingURL=.*?(?:\*\/)?\s*$/gm,
            ""
        );

        fs.writeFileSync(destination, content);
    } else {
        fs.copyFileSync(source, destination);
    }
}
