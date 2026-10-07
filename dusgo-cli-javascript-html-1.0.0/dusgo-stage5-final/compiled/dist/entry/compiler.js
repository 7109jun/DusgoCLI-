"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileDusgoProject = compileDusgoProject;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const coding_1 = require("../parser/coding");
function compileDusgoProject(paths) {
    const sceneNames = collectSceneNames(paths.scene);
    const scenes = (sceneNames.length ? sceneNames : ["장면 1"]).map((name, i) => ({ name, id: `dsg-scene-${i + 1}` }));
    const codingFiles = collectCodingFiles(paths.coding);
    const files = codingFiles.length ? codingFiles : [node_path_1.default.join(paths.coding, "main.du")];
    const objects = files.map((file, i) => compileObject(paths, file, scenes[i % scenes.length].id, i));
    return {
        name: projectName(paths), speed: 60, scenes, objects, variables: [], messages: [], functions: [],
        interface: { canvasWidth: 640, menuWidth: 280, object: objects[0]?.id ?? "dsg-object-1" }
    };
}
function compileObject(paths, codingFile, sceneId, index) {
    const program = (0, coding_1.parseCodingFile)(codingFile);
    const blocks = compileNodes(program.nodes);
    const id = `dsg-object-${index + 1}`;
    const name = node_path_1.default.basename(codingFile, node_path_1.default.extname(codingFile));
    const pictures = loadPictures(paths.image, index);
    const sounds = loadSounds(paths.sound, index);
    return {
        id, name, objectType: "sprite", active: true, lock: false, rotateMethod: "free", scene: sceneId,
        entity: { rotation: 0, direction: 90, x: index * 80, y: 0, regX: 0, regY: 0, scaleX: 1, scaleY: 1, width: 100, height: 100, imageIndex: 0, visible: true },
        script: JSON.stringify([blocks]),
        sprite: { name, pictures, sounds },
        selectedPictureId: pictures[0]?.id,
        selectedSoundId: sounds[0]?.id
    };
}
function compileNodes(nodes) {
    if (nodes.length === 0 || nodes[0].text !== "when program.start" || nodes[0].indent !== 0) {
        throw new Error("Coding의 시작 블록은 반드시 가장 위에, 들여쓰기 없이 있어야 합니다.");
    }
    const root = { type: "when_run_button_click" };
    const result = [root];
    const stack = [{ indent: 0, body: result, block: root }];
    for (const node of nodes.slice(1)) {
        if (node.indent < 1)
            throw new Error(`Coding:${node.line}: 시작 블록 외 블록은 들여쓸 수 없습니다.`);
        while (stack.length > 1 && node.indent <= stack[stack.length - 1].indent)
            stack.pop();
        const parent = stack[stack.length - 1];
        const statement = compileStatement(node);
        parent.body.push(statement);
        if (isContainer(statement)) {
            const body = [];
            statement.statements = { DO: body };
            stack.push({ indent: node.indent, body, block: statement });
        }
    }
    return result;
}
function compileStatement(node) {
    const t = node.text;
    let m = /^move\(([-+]?\d+(?:\.\d+)?)\)$/.exec(t);
    if (m)
        return { type: "move_direction", params: [numberParam(+m[1])] };
    m = /^wait\((\d+(?:\.\d+)?)\)$/.exec(t);
    if (m)
        return { type: "wait_second", params: [numberParam(+m[1])] };
    m = /^say\(("(?:\\.|[^"\\])*")\)$/.exec(t);
    if (m)
        return { type: "dialog", params: [textParam(JSON.parse(m[1])), "speak", null] };
    m = /^turn\(([-+]?\d+(?:\.\d+)?)\)$/.exec(t);
    if (m)
        return { type: "turn_relative", params: [numberParam(+m[1])] };
    m = /^repeat\((\d+)\)$/.exec(t);
    if (m)
        return { type: "repeat_basic", params: [numberParam(+m[1])] };
    if (t === "hide()")
        return { type: "hide" };
    if (t === "show()")
        return { type: "show" };
    throw new Error(`Coding:${node.line}: 지원하지 않는 블록 문법: ${t}`);
}
function isContainer(b) { return b.type === "repeat_basic"; }
function numberParam(v) { return { type: "number", params: [String(v)] }; }
function textParam(v) { return { type: "text", params: [v] }; }
function collectCodingFiles(dir) { return filesWithExt(dir, ".du"); }
function collectSceneNames(dir) { return filesWithExt(dir, ".scene").map(f => node_path_1.default.basename(f, ".scene")); }
function filesWithExt(dir, ext) {
    if (!node_fs_1.default.existsSync(dir))
        return [];
    return node_fs_1.default.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.toLowerCase().endsWith(ext)).map((e) => node_path_1.default.join(dir, e.name)).sort();
}
function loadPictures(dir, objectIndex) {
    const files = node_fs_1.default.existsSync(dir) ? node_fs_1.default.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && [".jpg", ".png", ".bmp", ".svg", ".eo"].includes(node_path_1.default.extname(e.name).toLowerCase())).map((e) => node_path_1.default.join(dir, e.name)).sort() : [];
    return files.map((file, i) => ({ id: `dsg-picture-${objectIndex + 1}-${i + 1}`, name: node_path_1.default.basename(file, node_path_1.default.extname(file)), fileurl: toDataUrl(file), dimension: { width: 100, height: 100, scaleX: 1, scaleY: 1 }, scale: 100 }));
}
function loadSounds(dir, objectIndex) {
    const files = node_fs_1.default.existsSync(dir) ? node_fs_1.default.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && node_path_1.default.extname(e.name).toLowerCase() === ".mp3").map((e) => node_path_1.default.join(dir, e.name)).sort() : [];
    return files.map((file, i) => ({ id: `dsg-sound-${objectIndex + 1}-${i + 1}`, name: node_path_1.default.basename(file, ".mp3"), fileurl: toDataUrl(file), duration: 0 }));
}
function toDataUrl(file) {
    const ext = node_path_1.default.extname(file).toLowerCase();
    const mime = { ".jpg": "image/jpeg", ".png": "image/png", ".bmp": "image/bmp", ".svg": "image/svg+xml", ".eo": "application/octet-stream", ".mp3": "audio/mpeg" };
    return `data:${mime[ext] ?? "application/octet-stream"};base64,${node_fs_1.default.readFileSync(file).toString("base64")}`;
}
function projectName(paths) {
    const m = /^name\s*=\s*"([^"]*)"/m.exec(node_fs_1.default.readFileSync(paths.config, "utf8"));
    return m?.[1] || node_path_1.default.basename(paths.root);
}
