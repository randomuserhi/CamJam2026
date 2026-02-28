export function yieldExecution() {
    return new Promise<void>(resolve => setTimeout(resolve, 0));
}