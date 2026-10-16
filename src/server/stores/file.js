// @ts-check
// JSON-file store for single-machine pilots: zero setup, survives restarts.
// Writes are atomic (temp file + rename). The audit trail is also appended to
// an append-only JSONL file so it can be archived independently.
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { MemoryStore } from '../../core/store-memory.js';

export class FileStore extends MemoryStore {
  /** @param {string} file @param {any} seed used only when the file does not exist yet */
  constructor(file, seed) {
    const exists = existsSync(file);
    const data = exists ? JSON.parse(readFileSync(file, 'utf8')) : seed;
    super(data);
    if (exists && data.history) this.history = new Map(Object.entries(data.history));
    this.file = file;
    this.auditFile = join(dirname(file), 'audit.jsonl');
    mkdirSync(dirname(file), { recursive: true });
    if (!exists) this.persistSync();
  }
  persistSync() {
    const tmp = this.file + '.tmp';
    writeFileSync(tmp, JSON.stringify(this.snapshot(), null, 1));
    renameSync(tmp, this.file);
  }
  async persist() {
    this.persistSync();
  }
  async appendAudit(entry) {
    appendFileSync(this.auditFile, JSON.stringify(entry) + '\n');
    await super.appendAudit(entry);
  }
}
