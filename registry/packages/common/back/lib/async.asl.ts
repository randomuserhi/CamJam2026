export function yieldExecution() {
    return new Promise<void>(resolve => setImmediate(resolve));
}