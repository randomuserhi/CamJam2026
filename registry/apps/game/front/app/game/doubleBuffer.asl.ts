export class DoubleBuffer<T> {
    public buffer: T[] = [];
    private _buffer: T[] = [];

    public push(...items: T[]) {
        this._buffer.push(...items);
    }

    public swap() {
        this.buffer.length = 0;
        const temp = this.buffer;
        this.buffer = this._buffer;
        this._buffer = temp;
    }
}