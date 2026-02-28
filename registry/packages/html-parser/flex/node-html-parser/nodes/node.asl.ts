import { decode, encode } from 'html-parser/he/he.asl';
import HTMLElement from './html.asl';
import NodeType from './type.asl';

/**
 * Node Class as base class for TextNode and HTMLElement.
 */
export default abstract class Node {
    abstract rawTagName: string;
    abstract nodeType: NodeType;
    public childNodes = [] as Node[];
    public range: readonly [number, number] = undefined!;
    abstract text: string;
    abstract rawText: string;
    // abstract get rawText(): string;
    abstract toString(): string;
    abstract clone(): Node;
    public constructor(
        public parentNode = null as HTMLElement | null,
        range?: [number, number]
    ) {
        Object.defineProperty(this, 'range', {
            enumerable: false,
            writable: true,
            configurable: true,
            value: range ?? [-1, -1]
        });
    }
    /**
     * Remove current node
     */
    public remove() {
        if (this.parentNode) {
            const children = this.parentNode.childNodes;
            this.parentNode.childNodes = children.filter((child) => {
                return this !== child;
            });
            this.parentNode = null;
        }
        return this;
    }
    public get innerText() {
        return this.rawText;
    }
    public get textContent() {
        return decode(this.rawText);
    }
    public set textContent(val: string) {
        this.rawText = encode(val);
    }
    public get structure(): string {
        return "";
    }
}
