import CommentNode from './nodes/comment.asl';
import HTMLElement, { Options } from './nodes/html.asl';
import Node from './nodes/node.asl';
import TextNode from './nodes/text.asl';
import NodeType from './nodes/type.asl';
import baseParse from './parse.asl';
import valid from './valid.asl';

export { Options } from './nodes/html.asl';

export default function parse(data: string, options = {} as Partial<Options>) {
    return baseParse(data, options);
}

parse.parse = baseParse;
parse.HTMLElement = HTMLElement;
parse.CommentNode = CommentNode;
parse.valid = valid;
parse.Node = Node;
parse.TextNode = TextNode;
parse.NodeType = NodeType;

export {
    CommentNode, HTMLElement, Node, NodeType, parse, TextNode, valid
};

