import process from "process/browser.js";
import { Buffer } from "buffer";
globalThis.process = globalThis.process || process;
globalThis.Buffer = globalThis.Buffer || Buffer;
