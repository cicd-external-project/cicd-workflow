/**
 * In-memory task record. This demo intentionally has no database — the
 * FlowCI starter is meant to show pipeline behavior, not persistence
 * patterns, so an array-backed store keeps the example small.
 */
export interface Task {
  id: number;
  title: string;
  done: boolean;
}
