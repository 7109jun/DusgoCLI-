"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_readline_1 = __importDefault(require("node:readline"));
const commands_1 = require("./cli/commands");
const output_1 = require("./cli/output");
const browser_1 = require("./web/browser");
async function main() {
    const browser = new browser_1.EntryBrowser();
    const context = { exit: false, browser };
    const argv = process.argv.slice(2);
    if (argv.length) {
        try {
            await (0, commands_1.executeCommand)(argv.join(" "), context);
        }
        catch (e) {
            (0, output_1.printError)(e);
            process.exitCode = 1;
        }
        finally {
            await browser.close().catch(() => undefined);
        }
        return;
    }
    (0, output_1.printBanner)();
    const rl = node_readline_1.default.createInterface({ input: process.stdin, output: process.stdout, terminal: true, prompt: `${(0, output_1.cyan)("둣교>")} ` });
    rl.on("line", async (line) => {
        try {
            await (0, commands_1.executeCommand)(line, context);
        }
        catch (e) {
            (0, output_1.printError)(e);
        }
        if (context.exit) {
            await browser.close().catch(() => undefined);
            rl.close();
            return;
        }
        rl.prompt();
    });
    rl.on("close", () => { console.log((0, output_1.dim)("\n둣교 종료.")); });
    rl.prompt();
}
main().catch(e => { (0, output_1.printError)(e); process.exitCode = 1; });
