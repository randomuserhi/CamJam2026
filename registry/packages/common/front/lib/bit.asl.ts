export function encodeBase64(str: string) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    bytes.forEach((b: number) => binary += String.fromCharCode(b));
    return btoa(binary);
}

// Universal Base64 decode
export function decodeBase64(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
}