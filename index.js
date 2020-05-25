'use strict'

const fs = require('fs')
const https = require('https')
const Figma = require ('figma-js')

process.on('unhandledRejection', (error) => {
  console.log(error)
})

module.exports = class Extractor {
  constructor (personalAccessToken, fileID, format = 'svg') {
    this.fileID = fileID
    this.format = format
    this.frames = {}

    this.client = Figma.Client({
      personalAccessToken
    })
  }

  extract (path = '.')  {
    this.path = path

    return new Promise((resolve, reject) => {
      this.client.file(this.fileID).then(({ data }) => {
        let document = data.document
        let pages = document.children
        let ids = []

        pages.forEach((page) => {
          ids.push(...page.children.map(frame => {
            this.frames[frame.id] = { frame, page }
            return frame.id
          }))
        })

        this.getFilesByIds(ids).then((files) => {
          resolve(files)
        })
      }).catch((e) => {
        return reject(e)
      })
    })
  }

  getFilesByIds (ids) {
    return new Promise((resolve, reject) => {
      let format = this.format
      let opts = { format, ids, svg_include_id: true }

      this.client.fileImages(this.fileID, opts)
        .then((fileImages) => {
          this.onGetFileImages(fileImages).then((response) => {
            resolve(response)
          })
        })
        .catch((e) => {
          return reject(e)
        })
    })
  }

 onGetImage (id, res) {
   return new Promise((resolve, reject) => {

     let info = this.frames[id]
     let filename = `${info.frame.name}.${this.format}`
     let path = `${this.path}/${filename}`

     let data = ''

     const addChunk = (chunk) => {
       data += chunk
     }

     const saveFile = () => {
       fs.writeFile(path, data, 'binary', (e) => {
         if (e) {
           return reject(e)
         }
         let page = this.frames[id].page.name
         resolve({ filename, page })
       })
     }

     res.setEncoding('binary')
     res.on('data', addChunk)
     res.on('end', saveFile)
   })
  }

  async onGetFileImages (fileImages) {
    let images = fileImages.data.images
    let promises = []

    for (let id in images) {
      let promise = new Promise((resolve, reject) => {
        let url = images[id]

        try {
          https.get(url, (res) => {
            this.onGetImage(id, res).then((response) => {
              resolve(response)
            }).catch((e) => {
              return reject(e)
            })
          })
        } catch (e) {
          return reject(e)
        }
      })
      promises.push(promise)
    }

    return Promise.all(promises)
  }
}
