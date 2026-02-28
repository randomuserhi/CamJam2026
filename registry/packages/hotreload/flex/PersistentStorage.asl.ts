/**
 * Persistent storage across module hot reloads
 * 
 * Storage instances are unique per module, so there are no name clashes outside of a given module.
 */
class Storage {
    private data = new Map<string, any>();

    /**
     * Get the given data value
     * 
     * @param name
     * @returns
     */
    public get(name: string) {
        return this.data.get(name);
    }

    /**
     * Sets the given data under a name
     * 
     * @param name
     * @param value 
     * @returns 
     */
    public set(name: string, value: any) {
        return this.data.set(name, value);
    }
}

const modules = new Map<ASLModuleId, Storage>();

function getStorage(mid: ASLModuleId) {
    let storage = modules.get(mid);
    if (storage === undefined) {
        storage = new Storage();
        modules.set(mid, storage);
    }
    return storage;
}

export const __linkASLRuntime: __linkASLRuntime = (runtime, exports) => {
    return {
        ...exports,
        default: getStorage(runtime.mid)
    };
};

export const bruh = 2;

// Type coersion for exports since we are using `__linkASLRuntime` to generate a specific storage object
// per module runtime
const storage: Storage = undefined!;
export default storage;