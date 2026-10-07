"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebugBuffer = void 0;
class DebugBuffer {
    events = [];
    push(event) { this.events.push({ ...event, time: new Date().toISOString() }); if (this.events.length > 500)
        this.events.splice(0, this.events.length - 500); }
    clear() { this.events = []; }
    list() { return [...this.events]; }
    errors() { return this.events.filter(e => e.level === "error"); }
}
exports.DebugBuffer = DebugBuffer;
