export type EventCategory = "agent" | "terminal" | "git";

export interface EngineEvent {
  id: string;
  category: EventCategory;
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

type Listener = (event: EngineEvent) => void;

const MAX_HISTORY = 200;

class EventBus {
  private listeners = new Set<Listener>();
  private history: EngineEvent[] = [];

  emit(
    category: EventCategory,
    type: string,
    payload: Record<string, unknown> = {}
  ): EngineEvent {
    const event: EngineEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      category,
      type,
      payload,
      timestamp: new Date().toISOString(),
    };

    this.history.push(event);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    this.listeners.forEach((listener) => listener(event));

    return event;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getHistory(category?: EventCategory): EngineEvent[] {
    return category
      ? this.history.filter((event) => event.category === category)
      : [...this.history];
  }
}

export const eventBus = new EventBus();
