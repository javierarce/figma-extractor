# figma-extractor

Export all the frames of a Figma file


### How to use it

```js
const Extractor = require('figma-extractor')

let extractor = new Extractor(FIGMA_TOKEN, FIGMA_FILE, 'svg')

extractor.extract().then((files) => {
  console.log(files)
}).catch((e) => {
  console.error(e)
})
```
