export class EventManager<EventMap extends { [k: string]: any } = any> {
    private host: Text;
    
    constructor() {
        this.host = document.createTextNode("");
    }

    public addEventListener<T extends keyof EventMap>(type: T | (string & {}), cb: (e: { detail: EventMap[T] }) => void, options?: AddEventListenerOptions | boolean) {
        return this.host.addEventListener(type as string, cb as unknown as EventListener, options);
    }

    public removeEventListener<T extends keyof EventMap>(type: T | (string & {}), cb: (e: { detail: EventMap[T] }) => void, options?: AddEventListenerOptions | boolean) {
        return this.host.removeEventListener(type as string, cb as unknown as EventListener, options);
    }

    public dispatch<T extends keyof EventMap>(type: T | (string & {}), detail: EventMap[T]) {
        return this.host.dispatchEvent(new CustomEvent(type as string, { detail }));
    }
}