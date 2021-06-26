import { Headers } from "tar-stream";
export interface ITarballFile {
    readonly headers: Headers;
    readonly content: Buffer;
    toArrayBuffer(): ArrayBuffer;
    toBlob(mimeType?: string): Blob;
    toBuffer(): Buffer;
    toString(): string;
}
declare class TarballFile implements ITarballFile {
    readonly headers: Headers;
    readonly content: Buffer;
    constructor(headers: Headers, content: Buffer);
    toString(): string;
    toBuffer(): Buffer;
    toBlob(mimeType?: string): Blob;
    toArrayBuffer(): ArrayBuffer;
}
export default class GzipTarball {
    private readonly headers;
    private readonly files;
    private readonly directories;
    constructor();
    constructor(name: string);
    constructor(headers: Headers);
    addDirectory(path: string, directory?: GzipTarball): void;
    addFile(path: string, content: string | Buffer | ArrayBuffer | Uint8Array | Blob | TarballFile): Promise<void>;
    getDirectory(path: string): GzipTarball | null;
    getFile(path: string): TarballFile | null;
    getDirectories(): GzipTarball[];
    getFiles(): TarballFile[];
    pack(): Promise<Blob>;
    static create(data: Blob | File): Promise<GzipTarball>;
    private getAllFilesForPack;
    private getOrCreateParentDirectoryFromPath;
    private blobToBuffer;
    private static getNameFromPath;
    private static getParentPath;
    private static pathParts;
}
export {};
