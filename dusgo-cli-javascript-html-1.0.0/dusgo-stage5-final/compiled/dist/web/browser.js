"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntryBrowser = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const debug_1 = require("./debug");
class EntryBrowser {
    context = null;
    page = null;
    debugLog = new debug_1.DebugBuffer();
    playwright() {
        try {
            return require("playwright");
        }
        catch {
            throw new Error("Playwright가 설치되지 않았습니다. 'npm install' 후 실행하세요.");
        }
    }
    profileDir() { const dir = node_path_1.default.join(node_os_1.default.homedir(), ".dusgo", "browser"); node_fs_1.default.mkdirSync(dir, { recursive: true }); return dir; }
    async ensureBrowser() {
        if (this.context && this.page && !this.page.isClosed())
            return;
        const { chromium } = this.playwright();
        const context = await chromium.launchPersistentContext(this.profileDir(), { headless: false, viewport: null, acceptDownloads: true });
        this.context = context;
        this.page = context.pages()[0] ?? await context.newPage();
        const page = this.page;
        page.on("console", (message) => {
            const type = message.type();
            const level = type === "error" ? "error" : type === "warning" ? "warning" : "info";
            this.debugLog.push({ level, source: "console", message: message.text() });
        });
        page.on("pageerror", (error) => this.debugLog.push({ level: "error", source: "pageerror", message: error.message }));
    }
    async open(url) {
        await this.ensureBrowser();
        const page = this.page;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await page.waitForTimeout(1200);
        return this.status();
    }
    async status() {
        await this.ensureBrowser();
        const page = this.page;
        const state = await page.evaluate(() => {
            const entry = window.Entry;
            let project = null;
            try {
                if (entry && typeof entry.exportProject === "function")
                    project = entry.exportProject();
            }
            catch {
                project = null;
            }
            let sceneCount = null;
            if (Array.isArray(project?.scenes))
                sceneCount = project.scenes.length;
            else if (Array.isArray(project?.scenes?.type))
                sceneCount = project.scenes.type.length;
            else if (Array.isArray(project?.scenes?.list))
                sceneCount = project.scenes.list.length;
            const methodNames = ["init", "loadProject", "exportProject", "dispatchEvent", "addEventListener", "clearProject"];
            return {
                entryAvailable: Boolean(entry), methods: entry ? methodNames.filter(k => typeof entry[k] === "function") : [],
                projectAvailable: Boolean(project), objectCount: Array.isArray(project?.objects) ? project.objects.length : null, sceneCount
            };
        });
        return { connected: !page.isClosed(), url: page.url(), title: await page.title().catch(() => ""), ...state };
    }
    async createProjectFromWebsite() {
        await this.ensureBrowser();
        const page = this.page;
        if (!/^https?:\/\/playentry\.org(?:\/|$)/i.test(page.url()))
            await this.open("https://playentry.org/");
        const candidates = [page.getByText("작품 만들기", { exact: true }).first(), page.locator('a[href*="/ws"]').first(), page.locator('button').filter({ hasText: "작품 만들기" }).first()];
        for (const candidate of candidates) {
            try {
                if (await candidate.count()) {
                    await candidate.click();
                    await page.waitForTimeout(1500);
                    return this.status();
                }
            }
            catch { /* try next locator */ }
        }
        throw new Error("Entry 웹사이트에서 작품 만들기 진입점을 찾지 못했습니다. 로그인 상태와 웹사이트 변경 여부를 확인하세요.");
    }
    async ensureEditor(editorUrl = "https://playentry.org/ws") {
        await this.ensureBrowser();
        const status = await this.status();
        if (!status.entryAvailable)
            await this.open(editorUrl);
        await this.waitForEditor();
    }
    async waitForEditor(timeout = 30_000) {
        await this.ensureBrowser();
        await this.page.waitForFunction(() => Boolean(window.Entry && typeof window.Entry.dispatchEvent === "function"), { timeout });
    }
    async inspectProject() {
        await this.ensureEditor();
        return this.page.evaluate(() => {
            const entry = window.Entry;
            if (!entry || typeof entry.exportProject !== "function")
                throw new Error("Entry.exportProject를 찾지 못했습니다.");
            return entry.exportProject();
        });
    }
    async syncProject(project, editorUrl = "https://playentry.org/ws") {
        await this.ensureEditor(editorUrl);
        return this.page.evaluate((patch) => {
            const entry = window.Entry;
            if (typeof entry.loadProject !== "function")
                throw new Error("현재 Entry 페이지에서 Entry.loadProject를 찾지 못했습니다.");
            let current = null;
            try {
                current = typeof entry.exportProject === "function" ? entry.exportProject() : null;
            }
            catch {
                current = null;
            }
            const fallback = current?.objects?.[0] ? JSON.parse(JSON.stringify(current.objects[0])) : null;
            const objects = (patch.objects ?? []).map((incoming, index) => {
                const base = fallback ? JSON.parse(JSON.stringify(fallback)) : {};
                const object = Object.assign(base, incoming);
                object.id = incoming.id || object.id || `dsg-object-${index + 1}`;
                object.sprite = object.sprite || { name: object.name, pictures: [], sounds: [] };
                object.sprite.pictures = Array.isArray(object.sprite.pictures) ? object.sprite.pictures : [];
                object.sprite.sounds = Array.isArray(object.sprite.sounds) ? object.sprite.sounds : [];
                return object;
            });
            const merged = Object.assign({}, current || {}, patch, {
                objects,
                scenes: Array.isArray(patch.scenes) ? { type: patch.scenes } : (patch.scenes ?? current?.scenes ?? { type: [] }),
                interface: Object.assign({}, current?.interface || {}, patch.interface || {}, { object: objects[0]?.id })
            });
            if (typeof entry.clearProject === "function")
                entry.clearProject();
            entry.loadProject(merged);
            const loaded = typeof entry.exportProject === "function" ? entry.exportProject() : merged;
            const loadedScenes = Array.isArray(loaded?.scenes) ? loaded.scenes.length : Array.isArray(loaded?.scenes?.type) ? loaded.scenes.type.length : Array.isArray(loaded?.scenes?.list) ? loaded.scenes.list.length : 0;
            return { objectCount: Array.isArray(loaded?.objects) ? loaded.objects.length : 0, sceneCount: loadedScenes };
        }, project);
    }
    async installRuntimeDebugHooks() {
        await this.ensureEditor();
        await this.page.evaluate(() => {
            const w = window;
            if (w.__dusgoRuntimeDebugInstalled)
                return;
            w.__dusgoRuntimeDebugInstalled = true;
            w.__dusgoRuntimeErrors = [];
            window.addEventListener("error", event => w.__dusgoRuntimeErrors.push({ message: event.message || "window error", source: "runtime" }));
            window.addEventListener("unhandledrejection", event => {
                const reason = event.reason;
                w.__dusgoRuntimeErrors.push({ message: String(reason?.stack || reason?.message || reason), source: "runtime" });
            });
        });
    }
    async run() { await this.ensureEditor(); this.debugLog.clear(); await this.installRuntimeDebugHooks(); await this.dispatchEntryEvent("run"); }
    async stop() { await this.dispatchEntryEvent("stop"); }
    async dispatchEntryEvent(eventName) {
        await this.ensureEditor();
        const ok = await this.page.evaluate((name) => { const entry = window.Entry; if (!entry || typeof entry.dispatchEvent !== "function")
            return false; entry.dispatchEvent(name); return true; }, eventName);
        if (!ok)
            throw new Error("현재 Entry 페이지에서 Entry.dispatchEvent를 찾지 못했습니다.");
    }
    async debugEvents() {
        await this.ensureEditor();
        const runtime = await this.page.evaluate(() => { const w = window; const bucket = Array.isArray(w.__dusgoRuntimeErrors) ? w.__dusgoRuntimeErrors : []; w.__dusgoRuntimeErrors = []; return bucket; });
        for (const e of runtime)
            this.debugLog.push({ level: "error", source: "runtime", message: String(e.message) });
        return this.debugLog.list();
    }
    async close() { if (!this.context)
        return; await this.context.close(); this.context = null; this.page = null; }
}
exports.EntryBrowser = EntryBrowser;
