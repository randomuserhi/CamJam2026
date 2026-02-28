export * from "./feeds.asl";
export * from "./helpers.asl";
export * from "./legacy.asl";
export * from "./manipulation.asl";
export * from "./querying.asl";
export * from "./stringify.asl";
export * from "./traversal.asl";
/** @deprecated Use these methods from `domhandler` directly. */
export {
    hasChildren, isCDATA, isComment,
    isDocument, isTag, isText
} from "html-parser/domhandler/index.asl";

