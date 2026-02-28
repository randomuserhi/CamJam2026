export class Result<T, ErrorType = any> {
    private static readonly OK = Symbol("Result.OK");

    readonly raw: T;
    readonly error: ErrorType | typeof Result.OK;
    
    private constructor(item: T | undefined, error: ErrorType | typeof Result.OK = Result.OK) {
        this.raw = item!;
        this.error = error;
    }

    get item(): T {
        if (this.ok()) return this.raw;
        else throw this.error;
    }

    public ok(): boolean {
        return this.error === Result.OK;
    }

    static ok<T, ErrorType = any>(result: T) {
        return new Result<T, ErrorType>(result);
    }

    static err<T, ErrorType = any>(err: ErrorType) {
        return new Result<T, ErrorType>(undefined, err);
    }
}

export type ResultError<T extends (...args: any[]) => Result<any>> = ReturnType<T> extends Result<any, infer ErrorType> ? ErrorType : never;