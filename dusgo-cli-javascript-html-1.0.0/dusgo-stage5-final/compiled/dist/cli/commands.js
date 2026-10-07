"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCommand = executeCommand;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const compiler_1 = require("../entry/compiler");
const assets_1 = require("../project/assets");
const project_1 = require("../project/project");
const coding_1 = require("../parser/coding");
const git_1 = require("../git");
const community_1 = require("../community");
const output_1 = require("./output");
async function executeCommand(input, ctx) {
    const [command, ...args] = tokenize(input);
    if (!command)
        return;
    switch (command) {
        case "help":
            printHelp();
            return;
        case "version":
        case "ver":
            console.log("둣교 CLI 1.0.0");
            return;
        case "clear":
            console.clear();
            return;
        case "exit":
        case "quit":
            ctx.exit = true;
            return;
        case "init":
            commandInit(args);
            return;
        case "files":
            commandFiles();
            return;
        case "check":
            commandCheck(args);
            return;
        case "image":
            commandAsset("image", args);
            return;
        case "shape":
            commandAsset("shape", args);
            return;
        case "object":
            commandAsset("object", args);
            return;
        case "sound":
            commandAsset("sound", args);
            return;
        case "scene":
            commandScene(args);
            return;
        case "project":
            commandProject(args);
            return;
        case "git":
            commandGit(args);
            return;
        case "web":
            await commandWeb(args, ctx);
            return;
        case "entry":
            await commandEntry(args, ctx);
            return;
        case "community":
            await commandCommunity(args, ctx);
            return;
        case "doctor":
            commandDoctor();
            return;
        default: throw new Error(`알 수 없는 명령: ${command}. 'help'를 입력하세요.`);
    }
}
function printHelp() {
    console.log((0, output_1.cyan)("둣교 CLI 1.0.0"));
    console.log();
    console.log("  init <name> [path]          Project 생성");
    console.log("  project info                Project 정보");
    console.log("  files                       구성요소 보기");
    console.log("  check [file]                Coding 문법 검사");
    console.log("  image add <file>            JPG/PNG/BMP/SVG/EO, 5MB 이하");
    console.log("  shape add <file>            모양 추가 (이미지/EO, 5MB 이하)");
    console.log("  object add <file.eo>        EO 오브젝트 추가, 5MB 이하");
    console.log("  sound add <file.mp3>        MP3 사운드 추가, 10MB 이하");
    console.log("  scene add <name>            Scene 생성");
    console.log("  git init|status|add|commit  Project 구성요소 Git 관리");
    console.log("  git log|diff|branch|checkout");
    console.log("  git merge|pull|push");
    console.log("  web open [url]              브라우저에서 웹사이트 열기");
    console.log("  web status|close");
    console.log("  entry create                Entry 작품 만들기");
    console.log("  entry wait|inspect|sync");
    console.log("  entry run|debug|test|stop");
    console.log("  community open [section]    Entry 커뮤니티 열기");
    console.log("  community search <query>    커뮤니티 검색");
    console.log("  community project <id|url>  작품 열기");
    console.log("  community user <id|url>     회원 페이지 열기");
    console.log("  doctor                      실행 환경 검사");
    console.log("  help|version|clear|exit");
}
function commandInit(args) {
    const name = args[0];
    if (!name)
        throw new Error("사용법: init <name> [path]");
    const root = args[1] ? node_path_1.default.resolve(args[1]) : node_path_1.default.resolve(name);
    const p = (0, project_1.createProject)(root, name);
    process.chdir(p.root);
    console.log((0, output_1.green)("Project 생성 완료"));
    console.log(`  ${p.root}`);
}
function requireProjectConfig() {
    const paths = (0, project_1.findProject)();
    if (!paths)
        throw new Error("둣교 Project(dusgo.toml)를 찾을 수 없습니다.");
    return { paths, config: (0, project_1.readProjectConfig)(paths) };
}
function commandProject(args) {
    const sub = args[0] ?? "info";
    if (sub !== "info")
        throw new Error("사용법: project info");
    const { paths, config } = requireProjectConfig();
    const groups = (0, project_1.listComponentFiles)(paths);
    console.log((0, output_1.cyan)(config.name));
    console.log(`  version: ${config.version}`);
    console.log(`  root: ${paths.root}`);
    for (const [name, files] of Object.entries(groups))
        console.log(`  ${name}: ${files.length}`);
}
function commandFiles() {
    const { paths } = requireProjectConfig();
    const files = (0, project_1.listProjectFiles)(paths);
    if (!files.length) {
        console.log((0, output_1.dim)("Project가 비어 있습니다."));
        return;
    }
    for (const file of files)
        console.log(file);
}
function commandCheck(args) {
    const paths = (0, project_1.findProject)();
    let file = args[0];
    if (!file) {
        if (!paths)
            throw new Error("사용법: check <Coding 파일>");
        file = node_path_1.default.join(paths.coding, "main.du");
    }
    const resolved = node_path_1.default.resolve(file);
    if (!node_fs_1.default.existsSync(resolved))
        throw new Error(`파일이 없습니다: ${resolved}`);
    const program = (0, coding_1.parseCodingFile)(resolved);
    console.log((0, output_1.green)(`문법 정상: ${resolved}`));
    console.log(`  blocks=${program.nodes.length}`);
}
function commandAsset(kind, args) {
    const { paths } = requireProjectConfig();
    if (args[0] !== "add" || !args[1])
        throw new Error(`사용법: ${kind} add <file>`);
    const result = kind === "image" ? (0, assets_1.addImage)(paths, args[1]) : kind === "shape" ? (0, assets_1.addShape)(paths, args[1]) : kind === "object" ? (0, assets_1.addObject)(paths, args[1]) : (0, assets_1.addSound)(paths, args[1]);
    console.log((0, output_1.green)(`${result.kind} 추가 완료`));
    console.log(`  ${node_path_1.default.relative(paths.root, result.destination)} (${(0, assets_1.formatBytes)(result.bytes)})`);
}
function commandScene(args) {
    const { paths } = requireProjectConfig();
    if (args[0] !== "add" || !args[1])
        throw new Error("사용법: scene add <name>");
    const safe = args[1].replace(/[^\p{L}\p{N}_-]+/gu, "-").replace(/^-+|-+$/g, "") || "Scene";
    const target = uniqueFile(paths.scene, safe, ".scene");
    node_fs_1.default.writeFileSync(target, `scene ${args[1]}\n`, "utf8");
    console.log((0, output_1.green)(`Scene 추가 완료: ${node_path_1.default.relative(paths.root, target)}`));
}
function uniqueFile(dir, name, ext) {
    let target = node_path_1.default.join(dir, name + ext), i = 1;
    while (node_fs_1.default.existsSync(target))
        target = node_path_1.default.join(dir, `${name}-${i++}${ext}`);
    return target;
}
function commandGit(args) {
    const { paths } = requireProjectConfig();
    const sub = args[0] ?? "status";
    if (sub === "init") {
        const r = (0, git_1.initGit)(paths);
        console.log((0, output_1.green)("Git 저장소 초기화 완료"));
        if (r.stdout.trim())
            console.log(r.stdout.trimEnd());
        return;
    }
    (0, git_1.requireGitProject)(paths);
    switch (sub) {
        case "status": return printGit((0, git_1.runCheckedGit)(paths, ["status", "--short", "--branch"]));
        case "add": {
            const targets = (0, git_1.allowedGitTargets)(args.slice(1));
            const r = (0, git_1.git)(paths, ["add", "--", ...targets]);
            if (r.code)
                throw (0, git_1.gitError)(r);
            return console.log((0, output_1.green)(`stage: ${targets.join(" ")}`));
        }
        case "commit": {
            if (args[1] !== "-m" || !args[2])
                throw new Error("사용법: git commit -m <message>");
            const r = (0, git_1.git)(paths, ["commit", "-m", args.slice(2).join(" ")]);
            if (r.code)
                throw (0, git_1.gitError)(r);
            return printGit(r.stdout);
        }
        case "log": {
            const head = (0, git_1.git)(paths, ["rev-parse", "--verify", "HEAD"]);
            if (head.code)
                return console.log((0, output_1.dim)("아직 commit이 없습니다."));
            return printGit((0, git_1.runCheckedGit)(paths, ["--no-pager", "log", "--oneline", "--decorate", "-20"]));
        }
        case "diff": return printGit((0, git_1.runCheckedGit)(paths, ["--no-pager", "diff", ...args.slice(1)]));
        case "branch": return args[1] ? printGit((0, git_1.runCheckedGit)(paths, ["branch", args[1]])) : printGit((0, git_1.runCheckedGit)(paths, ["branch", "--no-color"]));
        case "checkout":
            if (!args[1])
                throw new Error("사용법: git checkout <branch>");
            return printGit((0, git_1.runCheckedGit)(paths, ["checkout", args[1]]));
        case "merge":
            if (!args[1])
                throw new Error("사용법: git merge <branch>");
            return printGit((0, git_1.runCheckedGit)(paths, ["merge", args[1]]));
        case "pull": return printGit((0, git_1.runCheckedGit)(paths, ["pull", ...args.slice(1)]));
        case "push": return printGit((0, git_1.runCheckedGit)(paths, ["push", ...args.slice(1)]));
        default: throw new Error("사용법: git init | status | add | commit | log | diff | branch | checkout | merge | pull | push");
    }
}
function printGit(value) { if (value.trim())
    console.log(value.trimEnd()); }
async function commandWeb(args, ctx) {
    const sub = args[0] ?? "status";
    if (sub === "open") {
        const s = await ctx.browser.open(args[1] ?? "https://playentry.org/");
        printWeb(s);
        return;
    }
    if (sub === "status") {
        printWeb(await ctx.browser.status());
        return;
    }
    if (sub === "close") {
        await ctx.browser.close();
        console.log((0, output_1.green)("브라우저 종료"));
        return;
    }
    throw new Error("사용법: web open [url] | web status | web close");
}
function printWeb(s) {
    console.log((0, output_1.cyan)("둣교 Web"));
    console.log(`  connected=${s.connected}`);
    console.log(`  url=${s.url}`);
    console.log(`  title=${s.title}`);
    console.log(`  Entry=${s.entryAvailable}`);
    console.log(`  project=${s.projectAvailable}`);
    console.log(`  objects=${s.objectCount ?? "?"} scenes=${s.sceneCount ?? "?"}`);
}
async function commandEntry(args, ctx) {
    const sub = args[0] ?? "status";
    if (sub === "create") {
        const s = await ctx.browser.createProjectFromWebsite();
        console.log((0, output_1.green)("Entry에서 작품 만들기를 시작했습니다."));
        console.log(s.url);
        return;
    }
    if (sub === "wait") {
        await ctx.browser.waitForEditor();
        console.log((0, output_1.green)("Entry 편집기 준비 완료"));
        return;
    }
    if (sub === "inspect") {
        const p = await ctx.browser.inspectProject();
        console.log((0, output_1.cyan)("Entry Project"));
        console.log(`  objects=${Array.isArray(p?.objects) ? p.objects.length : "?"}`);
        console.log(`  scenes=${Array.isArray(p?.scenes) ? p.scenes.length : Array.isArray(p?.scenes?.type) ? p.scenes.type.length : Array.isArray(p?.scenes?.list) ? p.scenes.list.length : "?"}`);
        return;
    }
    if (sub === "sync") {
        const { paths } = requireProjectConfig();
        const p = (0, compiler_1.compileDusgoProject)(paths);
        const r = await ctx.browser.syncProject(p);
        console.log((0, output_1.green)(`Entry 반영 완료: objects=${r.objectCount}, scenes=${r.sceneCount}`));
        return;
    }
    if (sub === "run") {
        await ctx.browser.run();
        console.log((0, output_1.green)("Entry 실행"));
        return;
    }
    if (sub === "stop") {
        await ctx.browser.stop();
        console.log((0, output_1.green)("Entry 정지"));
        return;
    }
    if (sub === "debug") {
        const events = await ctx.browser.debugEvents();
        if (!events.length)
            return console.log((0, output_1.green)("오류 없음"));
        for (const e of events)
            console.log(`[${e.level}] ${e.source}: ${e.message}`);
        return;
    }
    if (sub === "test") {
        const { paths } = requireProjectConfig();
        const p = (0, compiler_1.compileDusgoProject)(paths);
        const r = await ctx.browser.syncProject(p);
        await ctx.browser.run();
        const ms = Number(args[1] ?? 1000);
        if (!Number.isFinite(ms) || ms < 0 || ms > 60000)
            throw new Error("대기 시간은 0~60000 ms입니다.");
        if (ms)
            await new Promise(res => setTimeout(res, Math.floor(ms)));
        const events = await ctx.browser.debugEvents();
        if (!events.length)
            console.log((0, output_1.green)(`Entry 테스트 통과 (objects=${r.objectCount}, scenes=${r.sceneCount})`));
        else {
            console.log((0, output_1.red)(`실행 오류 ${events.length}건`));
            for (const e of events)
                console.log(`[${e.level}] ${e.source}: ${e.message}`);
        }
        return;
    }
    throw new Error("사용법: entry create | wait | inspect | sync | run | debug | test [ms] | stop");
}
async function commandCommunity(args, ctx) {
    const sub = args[0] ?? "open";
    if (sub === "open") {
        const url = await (0, community_1.communityOpen)(ctx.browser, args[1] ?? "projects");
        console.log((0, output_1.green)(`Community: ${url}`));
        return;
    }
    if (sub === "search") {
        const url = await (0, community_1.communitySearch)(ctx.browser, args.slice(1).join(" "));
        console.log((0, output_1.green)(`Search: ${url}`));
        return;
    }
    if (sub === "project") {
        if (!args[1])
            throw new Error("사용법: community project <id|url>");
        console.log((0, output_1.green)(`Project: ${await (0, community_1.communityProject)(ctx.browser, args[1])}`));
        return;
    }
    if (sub === "user") {
        if (!args[1])
            throw new Error("사용법: community user <id|url>");
        console.log((0, output_1.green)(`User: ${await (0, community_1.communityUser)(ctx.browser, args[1])}`));
        return;
    }
    throw new Error("사용법: community open [section] | search <query> | project <id|url> | user <id|url>");
}
function commandDoctor() {
    console.log((0, output_1.cyan)("둣교 Doctor"));
    console.log(`  Node.js: ${process.version}`);
    try {
        const r = (0, git_1.git)({ root: process.cwd(), config: "", coding: "", object: "", sound: "", image: "", scene: "" }, ["--version"]);
        console.log(`  Git: ${r.code === 0 ? r.stdout.trim() : "unavailable"}`);
    }
    catch {
        console.log("  Git: unavailable");
    }
    try {
        require("playwright");
        console.log("  Playwright: installed");
    }
    catch {
        console.log("  Playwright: not installed");
    }
}
function tokenize(input) {
    const out = [];
    let current = "", quote = "", escape = false;
    for (const ch of input.trim()) {
        if (escape) {
            current += ch;
            escape = false;
            continue;
        }
        if (ch === "\\" && quote) {
            escape = true;
            continue;
        }
        if (quote) {
            if (ch === quote)
                quote = "";
            else
                current += ch;
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            continue;
        }
        if (/\s/.test(ch)) {
            if (current) {
                out.push(current);
                current = "";
            }
            continue;
        }
        current += ch;
    }
    if (quote)
        throw new Error("닫히지 않은 따옴표입니다.");
    if (current)
        out.push(current);
    return out;
}
