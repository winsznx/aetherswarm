// Mock pino for client-side compatibility
export const levels = {
    values: {
        trace: 10,
        debug: 20,
        info: 30,
        warn: 40,
        error: 50,
        fatal: 60
    }
};

const noop = () => { };

const mockLogger = {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => mockLogger,
    bindings: () => ({}),
    level: 'info',
    levelVal: 30
};

export default function pino() {
    return mockLogger;
}
