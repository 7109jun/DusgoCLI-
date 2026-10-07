"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addImage = addImage;
exports.addObject = addObject;
exports.addShape = addShape;
exports.addSound = addSound;
exports.formatBytes = formatBytes;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_SOUND_BYTES = 10 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set([".jpg", ".png", ".bmp", ".svg", ".eo"]);
const OBJECT_EXTENSIONS = new Set([".eo"]);
const SOUND_EXTENSIONS = new Set([".mp3"]);
function addImage(paths, source) { return addAsset(paths.image, source, "image", MAX_IMAGE_BYTES, IMAGE_EXTENSIONS); }
function addObject(paths, source) { return addAsset(paths.object, source, "object", MAX_IMAGE_BYTES, OBJECT_EXTENSIONS); }
function addShape(paths, source) {
    const ext = node_path_1.default.extname(source).toLowerCase();
    return ext === ".eo" ? addObject(paths, source) : addImage(paths, source);
}
function addSound(paths, source) { return addAsset(paths.sound, source, "sound", MAX_SOUND_BYTES, SOUND_EXTENSIONS); }
function addAsset(destinationDir, source, kind, maxBytes, allowed) {
    const resolved = node_path_1.default.resolve(source);
    if (!node_fs_1.default.existsSync(resolved))
        throw new Error(`파일이 없습니다: ${resolved}`);
    const stat = node_fs_1.default.statSync(resolved);
    if (!stat.isFile())
        throw new Error(`파일이 아닙니다: ${resolved}`);
    const ext = node_path_1.default.extname(resolved).toLowerCase();
    if (!allowed.has(ext))
        throw new Error(`${kind}에서 지원하지 않는 확장자입니다: ${ext || "(없음)"}`);
    if (stat.size > maxBytes)
        throw new Error(`${kind} 파일은 ${formatBytes(maxBytes)} 이하만 추가할 수 있습니다. 현재 ${formatBytes(stat.size)}입니다.`);
    node_fs_1.default.mkdirSync(destinationDir, { recursive: true });
    const destination = uniqueDestination(destinationDir, node_path_1.default.basename(resolved));
    node_fs_1.default.copyFileSync(resolved, destination);
    return { kind, source: resolved, destination, bytes: stat.size };
}
function uniqueDestination(dir, filename) {
    const parsed = node_path_1.default.parse(filename);
    let candidate = node_path_1.default.join(dir, filename);
    let index = 1;
    while (node_fs_1.default.existsSync(candidate)) {
        candidate = node_path_1.default.join(dir, `${parsed.name}-${index}${parsed.ext}`);
        index += 1;
    }
    return candidate;
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 ** 2)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}
