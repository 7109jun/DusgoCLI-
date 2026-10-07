"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectPaths = projectPaths;
exports.findProject = findProject;
exports.createProject = createProject;
exports.readProjectConfig = readProjectConfig;
exports.listProjectFiles = listProjectFiles;
exports.listComponentFiles = listComponentFiles;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const types_1 = require("./types");
function projectPaths(root) {
    return {
        root,
        config: node_path_1.default.join(root, "dusgo.toml"),
        coding: node_path_1.default.join(root, "Coding"),
        object: node_path_1.default.join(root, "Object"),
        sound: node_path_1.default.join(root, "Sound"),
        image: node_path_1.default.join(root, "Image"),
        scene: node_path_1.default.join(root, "Scene")
    };
}
function findProject(startDir = process.cwd()) {
    let current = node_path_1.default.resolve(startDir);
    while (true) {
        const paths = projectPaths(current);
        if (node_fs_1.default.existsSync(paths.config))
            return paths;
        const parent = node_path_1.default.dirname(current);
        if (parent === current)
            return null;
        current = parent;
    }
}
function createProject(root, name) {
    if (!/^[^\\/:*?"<>|]+$/.test(name.trim()))
        throw new Error("Project 이름에 사용할 수 없는 문자가 있습니다.");
    const resolvedRoot = node_path_1.default.resolve(root);
    const paths = projectPaths(resolvedRoot);
    if (node_fs_1.default.existsSync(paths.config))
        throw new Error(`이미 둣교 Project가 존재합니다: ${resolvedRoot}`);
    node_fs_1.default.mkdirSync(resolvedRoot, { recursive: true });
    for (const dir of types_1.COMPONENTS)
        node_fs_1.default.mkdirSync(node_path_1.default.join(resolvedRoot, dir), { recursive: true });
    const config = [
        "[project]",
        `name = ${JSON.stringify(name.trim())}`,
        'version = "1"',
        "",
        "[entry]",
        'editor_url = "https://playentry.org/ws"',
        ""
    ].join("\n");
    node_fs_1.default.writeFileSync(paths.config, config, "utf8");
    node_fs_1.default.writeFileSync(node_path_1.default.join(paths.coding, "main.du"), "when program.start\n move(10)\n", "utf8");
    return paths;
}
function readProjectConfig(paths) {
    const out = { name: "", version: "1", entry: { editorUrl: "https://playentry.org/ws" } };
    let section = "";
    for (const raw of node_fs_1.default.readFileSync(paths.config, "utf8").split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith("#"))
            continue;
        const header = /^\[([^\]]+)\]$/.exec(line);
        if (header) {
            section = header[1];
            continue;
        }
        const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/.exec(line);
        if (!match)
            continue;
        const value = parseTomlString(match[2].trim());
        if (section === "project" && match[1] === "name")
            out.name = value;
        if (section === "project" && match[1] === "version")
            out.version = value;
        if (section === "entry" && match[1] === "editor_url")
            out.entry.editorUrl = value;
    }
    if (!out.name)
        throw new Error("dusgo.toml의 project.name이 없습니다.");
    return out;
}
function parseTomlString(value) {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))
        return value.slice(1, -1);
    return value;
}
function listProjectFiles(paths) {
    const result = [];
    const walk = (dir, prefix = "") => {
        if (!node_fs_1.default.existsSync(dir))
            return;
        for (const entry of node_fs_1.default.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === ".git" || entry.name === ".dusgo")
                continue;
            const full = node_path_1.default.join(dir, entry.name);
            const rel = prefix ? node_path_1.default.join(prefix, entry.name) : entry.name;
            if (entry.isDirectory())
                walk(full, rel);
            else
                result.push(rel.replaceAll("\\", "/"));
        }
    };
    walk(paths.root);
    return result.sort();
}
function listComponentFiles(paths) {
    return {
        Coding: filesUnder(paths.coding),
        Object: filesUnder(paths.object),
        Sound: filesUnder(paths.sound),
        Image: filesUnder(paths.image),
        Scene: filesUnder(paths.scene)
    };
}
function filesUnder(dir) {
    if (!node_fs_1.default.existsSync(dir))
        return [];
    return node_fs_1.default.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name).sort();
}
