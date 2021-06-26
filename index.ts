import * as Stream from "stream"; // makes streams work in the browser
import gunzip from "gunzip-maybe";
import reader from "filereader-stream";
import concat from "concat-stream";
import streamToArray from "stream-to-array";
import { extract, Headers, pack, Pack } from "tar-stream";
import { gzipSync } from "zlib";
import { join } from "path";

export interface ITarballFile {
    readonly headers: Headers;
    readonly content: Buffer;
    toArrayBuffer(): ArrayBuffer;
    toBlob(mimeType?: string): Blob;
    toBuffer(): Buffer;
    toString(): string;
}

class TarballFile implements ITarballFile {
    readonly headers: Headers;
    readonly content: Buffer;

    constructor(headers: Headers, content: Buffer) {
        this.headers = headers;
        this.content = content;
    }

    toString(): string {
        return this.content.toString();
    }

    toBuffer(): Buffer {
        return this.content;
    }

    toBlob(mimeType?: string): Blob {
        return new Blob([ this.content ], mimeType ? { type: mimeType } : undefined);
    }

    toArrayBuffer(): ArrayBuffer {
        return this.content.buffer.slice(
            this.content.byteOffset, this.content.byteOffset + this.content.byteLength
        );
    }
}

export default class GzipTarball {
    private readonly headers: Headers;
    private readonly files: TarballFile[];
    private readonly directories: GzipTarball[];

    constructor();
    constructor(name: string);
    constructor(headers: Headers);
    constructor(headers?: Headers | string) {
        this.headers = {
            ...(headers && typeof headers !== 'string' ? headers as Headers : {}),
            name: GzipTarball.getNameFromPath(headers && (headers as Headers).name || headers as string || '/'),
            type: 'directory'
        };
        this.files = [];
        this.directories = [];
    }

    public addDirectory(path: string, directory?: GzipTarball): void {
        const parentPath = directory ? path : GzipTarball.getParentPath(path);
        const parentGzipTarball = this.getOrCreateParentDirectoryFromPath(parentPath);
        const newDirectory = directory || new GzipTarball(GzipTarball.getNameFromPath(path));
        const duplicateDirectoryIndex = parentGzipTarball.directories.findIndex(directory => directory.headers.name === newDirectory.headers.name);
        if (duplicateDirectoryIndex !== -1) {
            parentGzipTarball.directories[duplicateDirectoryIndex] = newDirectory;
        } else {
            parentGzipTarball.directories.push(newDirectory);
        }
    }

    public async addFile(path: string, content: string|Buffer|ArrayBuffer|Uint8Array|Blob|TarballFile): Promise<void> {
        const filename = GzipTarball.getNameFromPath(path);
        const parentPath = GzipTarball.getParentPath(path);
        const gzipTarball = this.getOrCreateParentDirectoryFromPath(parentPath);
        if (content instanceof TarballFile) {
            gzipTarball.files.push(content);
            return;
        }

        if (content instanceof Blob) {
            content = await this.blobToBuffer(content);
        } else if (content instanceof Uint8Array) {
            content = Buffer.from(content);
        } else if (content instanceof ArrayBuffer) {
            content = Buffer.from(new Uint8Array(content));
        } else {
            content = new Buffer(content as string, "utf8");
        }

        gzipTarball.files.push(new TarballFile({name: filename, type: 'file'}, content as Buffer));
    }

    public getDirectory(path: string): GzipTarball|null {
        let currentDirectory: GzipTarball = this;
        for (const pathPart of GzipTarball.pathParts(path)) {
            const directory: GzipTarball|undefined = currentDirectory.directories.find(directory => directory.headers.name === pathPart);
            if (directory) {
                currentDirectory = directory;
            } else {
                return null;
            }
        }
        return currentDirectory;
    }

    public getFile(path: string): TarballFile|null {
        const filename = GzipTarball.getNameFromPath(path);
        const parentPath = GzipTarball.getParentPath(path);
        const existingDirectory = parentPath ? this.getDirectory(parentPath) : this;
        if(existingDirectory && filename) {
            const file = existingDirectory.files.find(file => file.headers.name === filename)
            return file ? file : null;
        }
        return null;
    }

    public getDirectories(): GzipTarball[] {
        return this.directories;
    }

    public getFiles(): TarballFile[] {
        return this.files;
    }

    public async pack(): Promise<Blob>{
        const stream: Pack = pack();
        const allFiles: {headers: Headers, content?: Buffer}[] = this.getAllFilesForPack();
        for (const file of allFiles) {
            stream.entry(file.headers, file.content)
        }
        stream.finalize();
        const buffers: Buffer[] = (await streamToArray(stream))
            .map(part => Buffer.isBuffer(part) ? part : Buffer.from(part));
        const gzipAsBuffer: Buffer = gzipSync(Buffer.concat(buffers));
        return new Blob([gzipAsBuffer]);
    }

    public static create(data: Blob|File): Promise<GzipTarball> {
        return new Promise((resolve, reject) => {
            const gzipTarball: GzipTarball = new GzipTarball('/');
            reader(data as File)
                .pipe(gunzip())
                .pipe(extract())
                .on("entry", (headers: Headers, stream: Stream.PassThrough, next: () => void) => {
                    const relativeHeaders = {
                        ...headers,
                        name: GzipTarball.getNameFromPath(headers.name)
                    }
                    if (headers.type === "directory") {
                        const parentPath = GzipTarball.getParentPath(headers.name);
                        gzipTarball.addDirectory(parentPath, new GzipTarball(relativeHeaders));
                        stream.resume();
                        next();
                        return;
                    }
                    stream.pipe(concat((data: Buffer) => {
                        gzipTarball.addFile(headers.name,  new TarballFile(relativeHeaders, data));
                        next();
                    }));
                })
                .on("finish", () => resolve(gzipTarball))
                .on("error", (error: Error) => reject(error));
        });
    }

    private getAllFilesForPack(path: string = ''): {headers: Headers, content?: Buffer}[] {
        let files: { headers: Headers, content?: Buffer }[] = [];
        for (const file of this.getFiles()) {
            files.push({
                headers: { name: join(path, file.headers.name), type: 'file' },
                content: file.toBuffer()
            })
        }
        for (const directory of this.getDirectories()) {
            const directoryPath = join(path, directory.headers.name);
            if (directory.getFiles().length === 0) {
                files.push({
                    headers: { name: directoryPath, type: 'directory' }
                });
            }
            files = [...files, ...directory.getAllFilesForPack(directoryPath)];
        }
        return files;
    }

    private getOrCreateParentDirectoryFromPath(path: string): GzipTarball {
        const pathParts = GzipTarball.pathParts(path);
        const existingDirectory = path && pathParts.length ? this.getDirectory(path) : this;

        let currentGzipTarball: GzipTarball = this;
        if (existingDirectory) {
            currentGzipTarball = existingDirectory;
        } else {
            for (const pathPart of pathParts) {
                let existingDirectory = currentGzipTarball.getDirectory(pathPart);
                if (!existingDirectory) {
                    currentGzipTarball.directories.push(new GzipTarball(pathPart));
                    existingDirectory = currentGzipTarball.getDirectory(pathPart) as GzipTarball;
                }
                currentGzipTarball = existingDirectory;
            }
        }
        return currentGzipTarball;
    }

    private blobToBuffer(blob: Blob): Promise<Buffer> {
        return new Promise ((resolve, reject) => {
            const reader: FileReader = new FileReader();
            reader.onload = () => {
                resolve(new Buffer(reader.result as string));
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(blob);
        });
    }

    private static getNameFromPath(path: string): string {
        if (/^([\/\\])$/.test(path)) return path;
        const pathParts = GzipTarball.pathParts(path);
        return pathParts.pop() || '';
    }

    private static getParentPath(path: string) {
        const pathParts = GzipTarball.pathParts(path);
        pathParts.pop();
        return pathParts.join('/');
    }

    private static pathParts(path: string): string[] {
        return path.replace("\\", "/").replace(/^\//, "").replace(/\/$/, '').split('/');
    }
}