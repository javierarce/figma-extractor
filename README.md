# figma-extractor

Node package that exports  all the frames of a Figma file to different files.


## Installation

  `yarn add figma-extractor`

  or

  `npm install figma-extractor`

## How to use it

```js
const Extractor = require('figma-extractor')

let extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE)

extractor.extract().then((files) => {
  console.log(files) 
}).catch((e) => {
  console.error(e)
})
```

### Result

By default Figma Extractor will export SVG files to the current directory.

```js
[
  { "filename": "Frame 1.svg", "page":"Page 1" },
  { "filename": "Frame 2.svg", "page":"Page 1" }, 
  { "filename": "Frame 3.svg", "page":"Page 1" }, 
  { "filename": "Frame 4.svg", "page":"Page 2" }
]
```

## Customizing the export

```js
const Extractor = require('figma-extractor')

let options = { 
  format: 'svg',         // file type (from the Figma API)
  svg_include_id: true,  // from the Figma API
  ..
  append_frame_id: true, // appends the frame id to the filename
  dont_overwrite: true   // don't overwrite existing files with the same name
}

let destination = 'my_beautiful_designs'

let extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE, options)

extractor.extract(destination).then((files) => {
  console.log(files) 
}).catch((e) => {
  console.error(e)
})
```
