export function encodeBase64(str: string) {
    return Buffer.from(str, "utf-8").toString("base64");
}

// Universal Base64 decode
export function decodeBase64(base64: string) {
    return Buffer.from(base64, "base64").toString("utf-8");
}

// Helper for bit flags
export function hasFlag(self: number, flag: number) {
    return (self & flag) === flag;
}