import GzipTarball, { ITarballFile } from "./index";
import { readFileSync, writeFile } from "fs";

describe("Tarball Gzip Package", () => {
    const tgzFolderWithFileName: string = 'folder-with-file.tgz';
    const tgzFileAndEmptyFolderName: string = 'file-and-empty-folder.tgz';
    const tgzFileWithImage: string = 'file-with-image.tgz';
    const npmPackedTar: string = 'npm-pack.tgz'

    test("Should get directories", async () => {
        const content1 = 'test1';
        const content2 = 'test2';

        const tarballGzip: GzipTarball = new GzipTarball();
        await tarballGzip.addDirectory("directory1");
        const directory1 = tarballGzip.getDirectory("directory1");
        await directory1!.addFile('file1.txt', content1);
        await tarballGzip.addDirectory("directory2");
        const directory2 = tarballGzip.getDirectory("directory2");
        await directory2!.addFile('file2.txt', content2);
        const directories: GzipTarball[] = tarballGzip.getDirectories();
        expect(directories.length).toBe(2);
        const file1: ITarballFile|null = directories[0].getFile('file1.txt');
        expect((file1 as ITarballFile).toString()).toBe(content1);
        const file2: ITarballFile|null = directories[1].getFile('file2.txt');
        expect((file2 as ITarballFile).toString()).toBe(content2);
    });

    test("Should get a directory", async () => {
        const content: string = "test";
        const tarballGzip: GzipTarball = new GzipTarball();
        await tarballGzip.addFile("folder/file.txt", content);
        const directory: GzipTarball = tarballGzip.getDirectory("folder") as GzipTarball;
        const file: ITarballFile = directory.getFile("file.txt") as ITarballFile;
        expect(file.toString()).toBe(content);
    });

    test("Should add a directory", async () => {
        const content: string = "test";
        const tarballGzip: GzipTarball = new GzipTarball();
        tarballGzip.addDirectory("/folder/nestedFolder/");
        const directory = tarballGzip.getDirectory("/folder/nestedFolder/");
        await directory!.addFile("test.txt", content);
        const file: ITarballFile = tarballGzip.getFile("/folder/nestedFolder/test.txt") as ITarballFile;
        expect(file.toString()).toBe(content);
    });

    test("Should add a GzipTarabll as a directory", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        const directory = new GzipTarball('subfolder');
        tarballGzip.addDirectory('/folder/', directory);
        const returnDirectory = tarballGzip.getDirectory('/folder/subfolder/');
        expect(directory).toBe(returnDirectory);
    });

    test("Should replace a directory if it already exists", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        tarballGzip.addDirectory('/folder/subfolder/');
        const originalDirectory = tarballGzip.getDirectory('/folder/subfolder/');
        const directory = new GzipTarball('subfolder');
        tarballGzip.addDirectory('/folder/', directory);
        const replacementDirectory = tarballGzip.getDirectory('/folder/subfolder/');

        expect(originalDirectory).not.toBe(replacementDirectory);
        expect(directory).toBe(replacementDirectory);
    });

    test("Should get files", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        const content1: string = "some test content";
        await tarballGzip.addFile("file1.txt", content1);
        const content2: string = "some other test content";
        await tarballGzip.addFile("file2.txt", content2);
        const files: ITarballFile[] = tarballGzip.getFiles();
        expect(files.length).toBe(2);
        const file1: ITarballFile|undefined = files.find(file => file.headers.name === "file1.txt");
        expect((file1 as ITarballFile).toString()).toBe(content1);
    });

    test("Should add a file with a String for content", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        const content: string = "some test content";
        await tarballGzip.addFile("newContent.txt", content);
        const file: ITarballFile = tarballGzip.getFile("newContent.txt") as ITarballFile;
        expect(file.toString()).toBe(content);
    });

    test("Should add a file with a Buffer for content", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        const content: string = "some test content";
        const buffer: Buffer = Buffer.from(content, "utf8");
        await tarballGzip.addFile("newContent.txt", buffer);
        const file: ITarballFile = tarballGzip.getFile("newContent.txt") as ITarballFile;
        expect(file.toString()).toBe(content);
    });

    test("Should add a file with a ArrayBuffer for content", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        const content: string = "some test content";
        const arrayBuffer: ArrayBuffer = stringToArrayBuffer(content);
        await tarballGzip.addFile("newContent.txt", arrayBuffer);
        const file: ITarballFile = tarballGzip.getFile("newContent.txt") as ITarballFile;
        expect(file.toString()).toBe(content);
    });

    test("Should add a file with a Unit8Array for content", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        const content: string = "some test content";
        const arrayBuffer: Uint8Array = stringToUint8Array(content);
        await tarballGzip.addFile("newContent.txt", arrayBuffer);
        const file: ITarballFile = tarballGzip.getFile("newContent.txt") as ITarballFile;
        expect(file.toString()).toBe(content);
    });

    test("Should add a file with a Blob for content", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        const content: string = "some test content";
        const blob: Blob = new Blob([content]);
        await tarballGzip.addFile("newContent.txt", blob);
        const file: ITarballFile = tarballGzip.getFile("newContent.txt") as ITarballFile;
        expect(file.toString()).toBe(content);
    });

    test("Should unpack a real .tgz file and repack it", async () => {
        const fileBuffer: Buffer = readFileSync(npmPackedTar);
        const fileBlob: Blob = new Blob([new Uint8Array(fileBuffer)]);
        const file: File = new File([fileBlob], tgzFolderWithFileName, { type: "application/x-compressed" });
        const tarballGzip: GzipTarball = await GzipTarball.create(file);
        const repackedFileBlob: Blob = await tarballGzip.pack();
        const buffer: Buffer = await blobToBuffer(repackedFileBlob);

        // Repacking compression seems to inconsistently change the file size by 1 byte
        expect(fileBuffer.byteLength).toBeGreaterThanOrEqual(buffer.byteLength - 2);
        expect(fileBuffer.byteLength).toBeLessThanOrEqual(buffer.byteLength + 2);
    });

    test("Should unpack a tarballGzip containing only directories and repack it from a file", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        tarballGzip.addDirectory('/package/directoryOfPackage/');
        const blob = await tarballGzip.pack();
        const file: File = new File([blob], 'tarballFile.tgz', { type: "application/x-compressed" });
        const unpackedTarballGzip: GzipTarball = await GzipTarball.create(file);
        const repackedFileBlob: Blob = await unpackedTarballGzip.pack();
        expect((repackedFileBlob as Blob).size).toBe(blob.size);
    });

    test("Should unpack a real .tgz file with the correct directories", async () => {
        const fileBuffer: Buffer = readFileSync(tgzFileAndEmptyFolderName);
        const fileBlob: Blob = new Blob([new Uint8Array(fileBuffer)]);
        const file: File = new File([fileBlob], tgzFileAndEmptyFolderName, { type: "application/x-compressed" });
        const tarballGzip: GzipTarball = await GzipTarball.create(file);
        const directories = tarballGzip.getDirectories();
        expect(directories.length).toBe(1);
        const directory = tarballGzip.getDirectory('folder');
        expect(directory).not.toBeNull();
    });

    test("Should unpack a tarballGzip containing only directories and repack it from a blob", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        tarballGzip.addDirectory('/package/directoryOfPackage/');
        const blob = await tarballGzip.pack();
        const unpackedTarballGzip: GzipTarball = await GzipTarball.create(blob);
        const repackedFileBlob: Blob = await unpackedTarballGzip.pack();
        expect((repackedFileBlob as Blob).size).toBe(blob.size);
    });

    test("Should unpack a real .tgz blob with the correct directories", async () => {
        const fileBuffer: Buffer = readFileSync(tgzFileAndEmptyFolderName);
        const fileBlob: Blob = new Blob([new Uint8Array(fileBuffer)]);
        const tarballGzip: GzipTarball = await GzipTarball.create(fileBlob);
        const directories = tarballGzip.getDirectories();
        expect(directories.length).toBe(1);
        const directory = tarballGzip.getDirectory('folder');
        expect(directory).not.toBeNull();
    });

    test("Should unpack a real .tgz blob with the correct files", async () => {
        const fileBuffer: Buffer = readFileSync(tgzFileWithImage);
        const fileBlob: Blob = new Blob([new Uint8Array(fileBuffer)]);
        const tarballGzip: GzipTarball = await GzipTarball.create(fileBlob);
        const files = tarballGzip.getFiles();
        expect(files.length).toBe(1);
        const file = tarballGzip.getFile('3mb.jpg');
        expect(file).not.toBeNull();
    });
    
    test("Should pack and unpack a .tgz that only contains directories", async () => {
        const tarballGzip: GzipTarball = new GzipTarball();
        tarballGzip.addDirectory('/package/directoryOfPackage/');
        const blob = await tarballGzip.pack();
        const file: File = new File([blob], 'tarballFile.tgz', { type: "application/x-compressed" });
        const unpackedTarballGzip = await GzipTarball.create(file);
        const directories = unpackedTarballGzip.getDirectories();
        expect(directories.length).toBe(1);
        const unpackedDirectory = unpackedTarballGzip.getDirectory('package');
        expect(unpackedDirectory).not.toBeNull();
        const directoriesofDirectory = unpackedDirectory!.getDirectories();
        expect(directoriesofDirectory.length).toBe(1);
        const unpackedDirectoryofDirectory = unpackedDirectory!.getDirectory('directoryOfPackage');
        expect(unpackedDirectoryofDirectory).not.toBeNull();
    });

    test("Should unpack a real .tgz file and repack it, then write file to disk for a manual check", async () => {
        const fileBuffer: Buffer = readFileSync(tgzFolderWithFileName);
        const fileBlob: Blob = new Blob([new Uint8Array(fileBuffer)]);
        const file: File = new File([fileBlob], tgzFolderWithFileName, { type: "application/x-compressed" });
        const tarballGzip: GzipTarball = await GzipTarball.create(file);
        const blob: Blob = await tarballGzip.pack();
        const buffer: Buffer = await blobToBuffer(blob);
        writeFile("npm-pack.copy.tgz", buffer, {}, (error: Error) => ({}));
        expect(blob).toEqual(fileBlob);
    });
});

function blobToBuffer(blob: Blob): Promise<Buffer> {
    return new Promise ((resolve, reject) => {
        const reader: FileReader = new FileReader();
        reader.onload = () => {
            resolve(new Buffer(reader.result as string));
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(blob);
    });
}

function stringToArrayBuffer(string: string): ArrayBuffer {
    const arrayBuffer: ArrayBuffer = new ArrayBuffer(string.length);
    const bufferView: Uint8Array = new Uint8Array(arrayBuffer);
    for (let index: number = 0, stringLength: number = string.length; index < stringLength; index++) {
      bufferView[index] = string.charCodeAt(index);
    }
    return arrayBuffer;
}

function stringToUint8Array(string: string): Uint8Array {
    let arrayBuffer: ArrayBuffer = new ArrayBuffer(string.length);
    let uInt8Array: Uint8Array = new Uint8Array(arrayBuffer);
    uInt8Array.forEach((_, index) => {
        uInt8Array[index] = string.charCodeAt(index);
    });
    return uInt8Array;
}