declare module 'gunzip-maybe' {
    export default function(): any
}

declare module 'concat-stream' {
    import { Writable } from "stream";
    export default function concat(cb: (buf: Buffer) => void): Writable;
}

declare module 'filereader-stream' {
    import { Writable } from "stream";
    export default function(file: File): Writable;
}