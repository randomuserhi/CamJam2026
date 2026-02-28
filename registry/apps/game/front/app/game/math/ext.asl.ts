declare global {
    interface Math {
        clamp(value: number, min: number, max: number): number;
        clamp01(value: number): number;
        repeat(t: number, length: number): number;
        deltaAngle(current: number, target: number): number;
        readonly deg2rad: number;
        readonly rad2deg: number;
        readonly epsilon: number;
    }
}

(Math as any).deg2rad = Math.PI / 180.0;
(Math as any).rad2deg = 180.0 / Math.PI;

Math.clamp = function (value, min, max) {
    return Math.min(max, Math.max(value, min));
};
Math.clamp01 = function (value) {
    return Math.clamp(value, 0, 1);
};

// https://github.com/Unity-Technologies/UnityCsReference/blob/e740821767d2290238ea7954457333f06e952bad/Runtime/Export/Math/Mathf.cs#L357
Math.repeat = function(t, length) {
    return Math.clamp(t - Math.floor(t / length) * length, 0, length);
};
Math.deltaAngle = function(current, target) {
    let delta = Math.repeat((target - current), 360.0);
    if (delta > 180.0) {
        delta -= 360.0;
    }
    return delta;
};

(Math as any).epsilon = 1e-6;

export { };

