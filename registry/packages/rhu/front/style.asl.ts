/// Style.ts 
///
/// @randomuserhi

export type ClassName<T extends {} = {}> = {
    [Symbol.toPrimitive]: () => string;
    name: string;
} & T;

interface ClassNameConstructor {
    new<T extends {} = {}>(name?: string): ClassName<T>;
    prototype: ClassName;
}

let id = 69;

export const ClassName = function(this: ClassName, name?: string) {
    if (name !== undefined) {
        this.name = name;
    } else {
        this.name = `rhu-${++id}`;
    }
} as any as ClassNameConstructor;
ClassName.prototype[Symbol.toPrimitive] = function() {
    return this.name;
};

interface Generator {
    (first: TemplateStringsArray, ...interpolations: (string | ClassName)[]): void;
    style<T extends {} = {}>(first: TemplateStringsArray, ...interpolations: (string)[]): ClassName & T;
}

interface Factory  {
    css: Generator;
}

const element: unique symbol = Symbol("style.element");

interface Style {
    <T>(factory: (worker: Factory) => T): T;
    dispose(obj: any): void;
}

function dispose(style: any) {
    const el: HTMLStyleElement | undefined = style[element];
    if (el === undefined) throw new Error("Cannot dispose a non-style object.");
    style[element] = undefined;
    el.remove();
}

export const Style: Style = undefined!;

export const __linkASLRuntime: __linkASLRuntime = (runtime, exports) => {
    const Style: Style = (<T>(factory: (worker: Factory) => T): T => {
        let generatedCode = "";
        const generator = function (first: TemplateStringsArray, ...interpolations: (string | ClassName)[]): void {
            generatedCode += first[0];
            for (let i = 0; i < interpolations.length; ++i) {
                const interpolation = interpolations[i];
                if (typeof interpolation === "object") {
                    if (interpolation instanceof ClassName) {
                        generatedCode += `.${interpolation}`;
                    } else {
                        generatedCode += interpolation;
                    }
                } else {
                    generatedCode += interpolation;
                }
                generatedCode += first[i + 1];
            }
        } as Generator;
        generator.style = function<T extends {} = {}>(first: TemplateStringsArray, ...interpolations: (string)[]): ClassName & T {
            const classname = new ClassName();
            if (first.length > 1 || first[0] !== '' || interpolations.length !== 0) {
                generatedCode += `.${classname} {${first[0]}`;
                for (let i = 0; i < interpolations.length; ++i) {
                    const interpolation = interpolations[i];
                    if (typeof interpolation === "object") {
                        generatedCode += interpolation;
                    } else {
                        generatedCode += interpolation;
                    }
                    generatedCode += first[i + 1];
                }
                generatedCode += "}";
            }
            return classname as ClassName & T;
        };
        const exports = factory({ css: generator });

        generatedCode = generatedCode.replace(/(\r\n|\n|\r)/gm, "").replace(/ +/g, ' ').trim();
        const el = document.createElement("style");
        el.innerHTML = generatedCode;
        
        // Append style to DOM
        document.head.append(el);

        // Automatically remove style on module reload
        runtime.onAbort(() => el.remove());

        (exports as any)[element] = el;

        return exports;
    }) as any;

    Style.dispose = dispose;
    
    return {
        ...exports,
        Style
    };
}