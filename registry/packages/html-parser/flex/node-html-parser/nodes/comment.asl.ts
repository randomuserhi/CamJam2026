import HTMLElement from './html.asl';
import Node from './node.asl';
import NodeType from './type.asl';

export default class CommentNode extends Node {
    public clone(): CommentNode {
        return new CommentNode(this.rawText, null, undefined, this.rawTagName);
    }
    public constructor(public rawText: string, parentNode = null as HTMLElement | null, range?: [number, number], public rawTagName = '!--') {
        super(parentNode, range);
    }

    /**
	 * Node Type declaration.
	 * @type {Number}
	 */
    public nodeType = NodeType.COMMENT_NODE;

    /**
	 * Get unescaped text value of current node and its children.
	 * @return {string} text content
	 */
    public get text() {
        return this.rawText;
    }

    public toString() {
        return `<!--${this.rawText}-->`;
    }
}
