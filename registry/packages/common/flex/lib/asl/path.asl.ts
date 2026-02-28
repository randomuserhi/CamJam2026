const CHAR_FORWARD_SLASH = 47; /* / */
const CHAR_BACKWARD_SLASH = 92; /* \ */
const CHAR_DOT = 46; /* . */

function isPathSeparator(code: number) {
    return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
}

/**
 * Obtain the location of the extension name for a path
 * Captures full extension name comprised of multiple ".", as per ASL spec
 * 
 * @param path Path
 * @returns File extension
 */
export function findASLExtname(path: string): { start: number, end: number } | undefined {
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
        const code = path.charCodeAt(i);
        if (isPathSeparator(code)) {
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
    return {
        start,
        end
    };
}

/**
 * Obtain extension name from path
 * Captures full extension name comprised of multiple ".", as per ASL spec
 * 
 * @param path Path
 * @returns File extension
 */
export function ASLExtname(path: string) {
    const location = findASLExtname(path);
    if (location === undefined) return "";
    return path.slice(location.start, location.end);
}