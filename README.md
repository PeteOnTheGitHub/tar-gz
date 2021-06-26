# tar-gz
A library for packing, unpacking and modifying the contents of gzip tarball files in the browser. Inspired by [jszip](https://stuk.github.io/jszip/) it makes use of node streams converted for the browser using [browserify](http://browserify.org/). The original use case for the library was the modifying of npm packages within the browser.

## Usage

Each GzipTarball represents a directory containing files and sub directories with the parent GzipTarball representing the parent directory in a directory tree.

```ts
class GzipTarball {
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
    static create(data: File | Blob): Promise<GzipTarball>;
}
```
### Creation

A static factory method *create()* is available to create the GzipTarball from a real tarball file. The tarball can be compressed with gzip or uncompressed.

```ts
const newGzipTarball = GzipTarball.create(anExistingTarball);
```
Alternatively the constructor can be used by passing in a string *name* representing the directory name.

```ts 
const newGzipTarball = GzipTarball("directoryName");
```

### Saving

```ts
const realTGZ = gzipTarball.pack();
saveAs(realTGZ, "youfile.tgz"); // Save file in browser
```

### Writing

Directories can be created or added via:

```ts 
gzipTarball.addDirectory('path');
```

Files can be added via:

```ts 
gzipTarball.addFile('path', someFileContent);
```

Both the adding of a file and the adding of a directory support complex path additions; if part of input path does not exist it will be created.

```ts 
gzipTarball.addFile('exsitingDirectory/uncreatedDirectory/', someFileContent);
// or
gzipTarball.addDirectory('exsitingDirectory/uncreatedDirectory/anotherUncreatedDirectory', anotherGzipTarball);
```

### Reading

Reading of files and directories is aways relative to the current GzipTarball directory. It will only return files/directories at the level of the directory the GzipTarball represents and not anything within nested sub directories. 

```ts 
const files = gzipTarball.getFiles();
// or
const directories = gzipTarball.getDirectories();
```

To get a file without traversing the directories or to get a specific directory:

```ts 
const file = gzipTarball.getFile('/folder/nestedFolder/aFile.txt');
// or
const directory = gzipTarball.getDirectory('/folder/nestedFolder/');
```

To read the contents of a file. First select the file then choose a format:

```ts 
const file = gzipTarball.getFile('/folder/nestedFolder/aFile.txt');
const stringContent = file.toString();
```

The following content formats are available:

```ts 
class TarballFile implements ITarballFile {
    constructor(headers: Headers, content: Buffer);
    toString(): string;
    toBuffer(): Buffer;
    toBlob(mimeType?: string): Blob;
    toBuffer(): ArrayBuffer;
}
```

### Basic example

See index.html.

## Development

To build the library and types:

```c
npm run build
```

## Testing

[Jest](https://facebook.github.io/jest/) is the testing framework. Test files are kept in the same folder as the feature and use the convention of *featureName.test.ts(x)*. To run the test:

```c
npm test
```

To run the tests with coverage results:

```c
npm run test:coverage
```
