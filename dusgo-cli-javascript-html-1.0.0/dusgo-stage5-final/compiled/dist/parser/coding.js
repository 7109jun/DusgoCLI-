"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodingSyntaxError = void 0;
exports.parseCoding = parseCoding;
exports.parseCodingFile = parseCodingFile;
const node_fs_1 = __importDefault(require("node:fs"));
class CodingSyntaxError extends Error {
    line;
    constructor(message, line) {
        super(`Coding:${line}: ${message}`);
        this.line = line;
        this.name = "CodingSyntaxError";
    }
}
exports.CodingSyntaxError = CodingSyntaxError;
function parseCoding(text) {
    const rawLines = text.replace(/\r\n/g, "\n").split("\n");
    const nodes = [];
    let seenStart = false;
    let previousIndent = 0;
    let sawNonBlank = false;
    for (let i = 0; i < rawLines.length; i++) {
        const raw = rawLines[i];
        if (raw.trim() === "")
            continue;
        sawNonBlank = true;
        if (raw.includes("\t"))
            throw new CodingSyntaxError("들여쓰기에 탭을 사용할 수 없습니다.", i + 1);
        const match = /^( *)(.*)$/.exec(raw);
        if (!match)
            throw new CodingSyntaxError("줄을 해석할 수 없습니다.", i + 1);
        const indent = match[1].length;
        const content = match[2].trimEnd();
        if (!seenStart) {
            if (indent !== 0)
                throw new CodingSyntaxError("시작 블록은 반드시 가장 위에 있어야 합니다.", i + 1);
            if (!isStartBlock(content))
                throw new CodingSyntaxError("Coding의 첫 번째 블록은 시작 블록이어야 합니다.", i + 1);
            seenStart = true;
            previousIndent = 0;
            nodes.push({ line: i + 1, indent, text: content });
            continue;
        }
        if (indent < 1)
            throw new CodingSyntaxError("시작 블록이 아닌 블록은 반드시 1칸 이상 들여써야 합니다.", i + 1);
        if (indent > previousIndent + 1)
            throw new CodingSyntaxError("들여쓰기는 한 단계에서 1칸씩만 증가할 수 있습니다.", i + 1);
        previousIndent = indent;
        nodes.push({ line: i + 1, indent, text: content });
    }
    if (!sawNonBlank)
        throw new CodingSyntaxError("빈 Coding입니다. 시작 블록이 필요합니다.", 1);
    if (!seenStart)
        throw new CodingSyntaxError("시작 블록이 없습니다.", 1);
    return { nodes };
}
function parseCodingFile(file) { return parseCoding(node_fs_1.default.readFileSync(file, "utf8")); }
function isStartBlock(text) { return /^when\s+program\.start\s*$/.test(text); }
