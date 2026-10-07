"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dim = exports.red = exports.yellow = exports.green = exports.cyan = void 0;
exports.printBanner = printBanner;
exports.printError = printError;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;
exports.cyan = cyan;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
exports.green = green;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
exports.yellow = yellow;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
exports.red = red;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;
exports.dim = dim;
function printBanner() { console.log((0, exports.cyan)("둣교 CLI 1.0.0")); console.log((0, exports.dim)("Entry CLI · Project / Community / Git")); console.log(); }
function printError(error) { console.error((0, exports.red)(error instanceof Error ? error.message : String(error))); }
