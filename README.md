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

By default Figma Extractor will export SVG files to the current directory. The `extract` command will return the list of exported files in this format:

```js
[
  { "filename": "Frame 1.svg", "page_id": "4:3", "page":"Page 1" },
  { "filename": "Frame 2.svg", "page_id": "4:3", "page":"Page 1" }, 
  { "filename": "Frame 3.svg", "page_id": "4:3", "page":"Page 1" }, 
  { "filename": "Frame 4.svg", "page_id": "8:4", "page":"Page 2" }
]
```

## Customizing the export

```js
const Extractor = require('figma-extractor')

let options = { 
  format: 'svg',                // file type (from the Figma API)
  svg_include_id: true,         // from the Figma API
  pageID: '123:0',              // specify a page
  append_frame_id: true,        // appends the frame id to the filename
  append_page_name: true,       // appends the page name to the filename
  use_pages_as_folders: true,   // create subdirectories with the name of the page
  dont_overwrite: true,         // don't overwrite existing files with the same name
  get_background_color: false,  // get the background color of the page in hexidecimal format
  get_comments: true            // get unresolved comments
}

const extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE, OPTIONS)

extractor.extract(IMAGE_PATH).then((files) => {
  console.log(files)
})

let destination = 'my_beautiful_designs'

let extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE, options)

extractor.extract(destination).then((files) => {
  console.log(files) 
}).catch((e) => {
  console.error(e)
})
```
