# figma-extractor

Node package that exports  all the frames of a Figma file to separate files.


## Installation

  `yarn add figma-extractor`

  or

  `npm install figma-extractor`

## Use

```js
const Extractor = require('figma-extractor')

let extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE, 'svg')

extractor.extract().then((files) => {
  console.log(files) 
}).catch((e) => {
  console.error(e)
})
```

### Result

```js
[
  { "filename": "Frame 1.svg", "page":"Page 1" },
  { "filename": "Frame 2.svg", "page":"Page 1" }, 
  { "filename": "Frame 3.svg", "page":"Page 1" }, 
  { "filename": "Frame 4.svg", "page":"Page 2" }
]
```
