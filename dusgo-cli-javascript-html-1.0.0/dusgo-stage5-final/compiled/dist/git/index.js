"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.git = git;
exports.requireGitProject = requireGitProject;
exports.initGit = initGit;
exports.allowedGitTargets = allowedGitTargets;
exports.gitError = gitError;
exports.runCheckedGit = runCheckedGit;
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const types_1 = require("../project/types");
function git(paths, args) {
    const r = (0, node_child_process_1.spawnSync)("git", args, { cwd: paths.root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    if (r.error)
        throw new Error(`Git 실행 실패: ${r.error.message}`);
    return { stdout: r.stdout ?? "", stderr: r.stderr ?? "", code: r.status ?? 1 };
}
function requireGitProject(paths) { if (!node_fs_1.default.existsSync(node_path_1.default.join(paths.root, ".git")))
    throw new Error("Git 저장소가 없습니다. 'git init'을 먼저 실행하세요."); }
function initGit(paths) {
    const r = git(paths, ["init"]);
    if (r.code !== 0)
        throw gitError(r);
    const exclude = node_path_1.default.join(paths.root, ".git", "info", "exclude");
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(exclude), { recursive: true });
    let text = node_fs_1.default.existsSync(exclude) ? node_fs_1.default.readFileSync(exclude, "utf8") : "";
    for (const rule of ["dusgo.toml", ".dusgo/"])
        if (!text.split(/\r?\n/).includes(rule))
            text += `${text.endsWith("\n") || !text ? "" : "\n"}${rule}\n`;
    node_fs_1.default.writeFileSync(exclude, text, "utf8");
    return r;
}
function allowedGitTargets(args) {
    if (!args.length || args.includes("."))
        return [...types_1.COMPONENTS];
    return args.map(raw => {
        const value = raw.replaceAll("\\", "/").replace(/^\.\//, "");
        if (value.includes(".."))
            throw new Error(`상위 경로는 Git 대상으로 사용할 수 없습니다: ${raw}`);
        const top = value.split("/")[0];
        if (!types_1.COMPONENTS.includes(top))
            throw new Error(`Git 대상은 Coding/Object/Sound/Image/Scene만 허용합니다: ${raw}`);
        return value;
    });
}
function gitError(r) { return new Error((r.stderr || r.stdout || `git가 코드 ${r.code}로 종료되었습니다.`).trim()); }
function runCheckedGit(paths, args) { requireGitProject(paths); const r = git(paths, args); if (r.code !== 0)
    throw gitError(r); return r.stdout.trimEnd(); }
