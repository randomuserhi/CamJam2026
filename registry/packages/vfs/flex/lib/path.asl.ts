export namespace VfsPath {
    export type StringSlice = { start: number, end: number };

    const StringPrototypeCharCodeAt: (str: string, index: number) => number = Function.call.bind(String.prototype.charCodeAt) as any;
    const StringPrototypeSlice: (str: string, start?: number, end?: number) => string = Function.call.bind(String.prototype.slice) as any;
    const StringPrototypeLastIndexOf: (str: string, searchString: string, position?: number) => number = Function.call.bind(String.prototype.lastIndexOf) as any;
    const ArrayPrototypeJoin: (arr: any[], separator: string) => string = Function.call.bind(Array.prototype.join) as any;

    const CHAR_FORWARD_SLASH = 47; /* / */
    const CHAR_DOT = 46; /* . */

    function normalizeString(path: string, allowAboveRoot: boolean, separator: string) {
        let res = '';
        let lastSegmentLength = 0;
        let lastSlash = -1;
        let dots = 0;
        let code = 0;
        for (let i = 0; i <= path.length; ++i) {
            if (i < path.length) code = StringPrototypeCharCodeAt(path, i);
            else if (code === CHAR_FORWARD_SLASH) break;
            else code = CHAR_FORWARD_SLASH;

            if (code === CHAR_FORWARD_SLASH) {
                if (lastSlash === i - 1 || dots === 1) {
                    // NOOP
                } else if (dots === 2) {
                    if (res.length < 2 || lastSegmentLength !== 2 ||
                        StringPrototypeCharCodeAt(res, res.length - 1) !== CHAR_DOT ||
                        StringPrototypeCharCodeAt(res, res.length - 2) !== CHAR_DOT) {
                        if (res.length > 2) {
                            const lastSlashIndex = res.length - lastSegmentLength - 1;
                            if (lastSlashIndex === -1) {
                                res = '';
                                lastSegmentLength = 0;
                            } else {
                                res = StringPrototypeSlice(res, 0, lastSlashIndex);
                                lastSegmentLength = res.length - 1 - StringPrototypeLastIndexOf(res, separator);
                            }
                            lastSlash = i;
                            dots = 0;
                            continue;
                        } else if (res.length !== 0) {
                            res = '';
                            lastSegmentLength = 0;
                            lastSlash = i;
                            dots = 0;
                            continue;
                        }
                    }
                    if (allowAboveRoot) {
                        res += res.length > 0 ? `${separator}..` : '..';
                        lastSegmentLength = 2;
                    }
                } else {
                    if (res.length > 0)
                        res += `${separator}${StringPrototypeSlice(path, lastSlash + 1, i)}`;
                    else
                        res = StringPrototypeSlice(path, lastSlash + 1, i);
                    lastSegmentLength = i - lastSlash - 1;
                }
                lastSlash = i;
                dots = 0;
            } else if (code === CHAR_DOT && dots !== -1) {
                ++dots;
            } else {
                dots = -1;
            }
        }
        return res;
    }


    const nullByteOrPathSeparatorRegex = /[\0/]/;
    export function isValidFilename(name: string) {
        if (name === "." || name === "..") return false;
        if (nullByteOrPathSeparatorRegex.test(name)) return false;
        return true;
    }

    export function isAbsolute(path: string) {
        return StringPrototypeCharCodeAt(path, 0) === CHAR_FORWARD_SLASH;
    }

    export function normalize(path: string, _trailingSeparator = true): string {
        if (path.length === 0)
            return '.';

        const isAbsolute = StringPrototypeCharCodeAt(path, 0) === CHAR_FORWARD_SLASH;
        const trailingSeparator = StringPrototypeCharCodeAt(path, path.length - 1) === CHAR_FORWARD_SLASH;

        path = normalizeString(path, !isAbsolute, "/");

        if (path.length === 0) {
            if (isAbsolute) return "/";
            return trailingSeparator ? "./" : ".";
        }
        if (trailingSeparator && _trailingSeparator)
            path += "/";

        return isAbsolute ? `/${path}` : path;
    }

    export function first(path: string, offset = 0): StringSlice | undefined {
        let start = -1;
        let end = offset;
        let validCharacters = false;
        let separatorCount = 0;
        for (; end < path.length; ++end) {
            const code = path.charCodeAt(end);
            if (code !== CHAR_FORWARD_SLASH) {
                if (!validCharacters) start = end;
                validCharacters = true;
            } else if (validCharacters || ++separatorCount > 1) {
                break;
            }
        }
        if (start === -1) return undefined;
        return { start, end };
    }

    export function last(path: string, offset = 0, allowTrailingSlash = true): StringSlice | undefined {
        let end = -1;
        let start = path.length - offset;
        let validCharacters = false;
        let separatorCount = allowTrailingSlash ? 0 : 1;
        for (; start > 0; --start) {
            const code = StringPrototypeCharCodeAt(path, start - 1);
            if (code !== CHAR_FORWARD_SLASH) {
                if (!validCharacters) end = start;
                validCharacters = true;
            } else if (validCharacters || ++separatorCount > 1) {
                break;
            }
        }
        if (end === -1) return undefined;
        return { start, end };
    }

    export function extname(path: string): StringSlice | undefined {
        if (typeof path !== "string") {
            throw new TypeError(`The "path" argument must be of type string. Received type ${typeof path}`);
        }
        let start = -1;
        let end = -1;
        let matchedSlash = true;
        // Track the state of characters (if any) we see before our first dot and
        // after any path separator we find
        let preDotState = 0;
        for (let i = path.length - 1; i >= 0; --i) {
            const code = StringPrototypeCharCodeAt(path, i);
            if (code === CHAR_FORWARD_SLASH) {
                // If we reached a path separator that was not part of a set of path
                // separators at the end of the string, stop now
                if (!matchedSlash) {
                    break;
                }

                // Ignore the first path separator if its at the end of the string
                // e.g "a.b/" will still give the extension ".b"
                continue;
            }
            if (end === -1) {
                // We saw the first non-path separator, mark this as the end of our
                // extension
                matchedSlash = false;
                end = i + 1;
            }
            if (code === CHAR_DOT) {
                // Check we did not see 2 dots in a row and that there
                // are characters prior the first dot
                if (preDotState !== 0 && start !== i + 1) {
                    start = i;
                } else {
                    break;
                }
            } else if (start === -1) {
                // We saw a non-dot and non-path separator before our dot, so we should
                // have a good chance at having a non-empty extension
                preDotState = -1;
            }
        }
        if (start === -1 ||
            end === -1 ||
            // We saw a non-dot character immediately before the dot
            preDotState === 0) {
            return undefined;
        }
        return { start, end };
    }

    export function walk(path: string, offset?: number): Generator<string, void, unknown>;
    export function walk(path: string, offset: number, includeFullPath: false): Generator<string, void, unknown>;
    export function walk(path: string, offset: number, includeFullPath: true): Generator<{ part: string, full: string }, void, unknown>;
    export function* walk(path: string, offset: number = 0, includeFullPath?: boolean) {
        let slice = first(path, offset);
        while (slice !== undefined) {
            if (!includeFullPath) {
                yield path.slice(slice.start, slice.end);
            } else {
                yield { part: path.slice(slice.start, slice.end), full: path.slice(0, slice.end) };
            }
            offset = slice.end;
            slice = first(path, offset);
        }
    }

    export function slice(func: (str: string) => StringSlice | undefined, str: string): string {
        const slice = func(str);
        if (slice === undefined) return "";
        return str.slice(slice.start, slice.end);
    }

    export function join(...args: string[]) {
        if (args.length === 0) return ".";

        const path = [];
        for (let i = 0; i < args.length; ++i) {
            const arg = args[i];
            if (arg.length > 0) {
                path.push(arg);
            }
        }

        if (path.length === 0) return ".";

        return normalize(ArrayPrototypeJoin(path, "/"));
    }

    export function dirname(path: string): string {
        const fileSlice = last(path, 0, false);
        if (fileSlice === undefined) return "";
        return path.slice(0, fileSlice.start);
    }
}

export default VfsPath;