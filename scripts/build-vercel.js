const fs = require('node:fs/promises');
const path = require('node:path');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public');

const STATIC_FILES = [
    'index.html',
    'style.css',
    'app-state-sync.js',
    'app.js',
    'sw.js',
    'favicon.svg',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
    'site.webmanifest'
];

async function build() {
    await fs.rm(OUTPUT_DIR, { force: true, recursive: true });
    await fs.mkdir(OUTPUT_DIR, { recursive: true });

    await Promise.all(
        STATIC_FILES.map((fileName) =>
            fs.copyFile(path.join(ROOT_DIR, fileName), path.join(OUTPUT_DIR, fileName))
        )
    );
}

build().catch((error) => {
    console.error(error);
    process.exit(1);
});
