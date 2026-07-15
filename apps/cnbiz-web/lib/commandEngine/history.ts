import type { CommandHistoryStore, CommandRecord } from "./types";

const MAX_HISTORY = 200;

export class InMemoryCommandHistoryStore implements CommandHistoryStore {
  private entries: CommandRecord[] = [];

  record(entry: CommandRecord): void {
    this.entries.push(entry);

    if (this.entries.length > MAX_HISTORY) {
      this.entries.shift();
    }
  }

  list(limit?: number): CommandRecord[] {
    const all = [...this.entries].reverse();
    return typeof limit === "number" ? all.slice(0, limit) : all;
  }
}

export const commandHistoryStore: CommandHistoryStore = new InMemoryCommandHistoryStore();

export function getCommandHistory(limit?: number): CommandRecord[] {
  return commandHistoryStore.list(limit);
}
