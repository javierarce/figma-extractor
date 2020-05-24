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
