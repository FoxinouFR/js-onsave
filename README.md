# scss-onsave
Atom package to run the yui compressor when you save a `.js` file.

## Dependencies
* Java.

To install Java, please visit [official website](https://www.java.com/download/).

## Installation

Use atom package manager to install js-onsave.

`apm install js-onsave`

## Configuration file

You need to create a configuration file named `.js-onsave.json` at the root of the project.

The content of the `.js-onsave.json` file must be an array of objects with the following properties:

* `inputDir`: The source directory. The path is relative to `.js-onsave.json`.
* `outputDir`: The destination directory. The path is relative to `.js-onsave.json`.
* `javaBin` _(default to `"java"`)_: You can set the path to the Java executable with this parameter.
* `outputFilename` _(default to `$1.min.js`)_: Set the file name template once they are compressed. The symbol _$1_ represents the name of the file without extension.
* `showStartup` _(default to `false`)_: A boolean indicating whether a notification at startup of compilation should be displayed or not.
* `showOutput` _(default to `false`)_: A boolean indicating whether the output stream should be displayed or not.
* `showError` _(default to `true`)_: A boolean indicating whether the error stream should be displayed or not.

### Example ###

Here is an example of a configuration file.

```
{
	"inputDir": "resources/js/",
	"outputDir": "public/js/",
	"outputFilename": "$1.min.js",
	"javaBin": "java",
	"showStartup":false,
	"showOutput":true,
	"showError":true
}
```

### Compile SCSS ###

You can use the [scss-onsave](https://atom.io/packages/scss-onsave) package that works the same way for SCSS files.

### Credits ###

This atom package contains the compiled executable of _yui-compressor_ in version 2.4.8.

Source : https://github.com/yui/yuicompressor
