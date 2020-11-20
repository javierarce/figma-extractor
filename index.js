'use strict'

const fs = require('fs')
const https = require('https')
const Figma = require ('figma-js')

const DEFAULT_FILE_FORMAT = 'svg'

process.on('unhandledRejection', (error) => {
  console.log(error)
})

module.exports = class Extractor {
  constructor (personalAccessToken, fileID, options) {
    let format = options && options.format || DEFAULT_FILE_FORMAT

    this.fileID = fileID
    this.pageID = options.pageID
    this.options = { format, ...options}
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

        if (this.pageID) {
          pages = pages.filter((page) => {
            return page.id === this.pageID
          })
        }

        pages.forEach((page) => {
          ids.push(...page.children.map(frame => {
            this.frames[frame.id] = { frame, page }
            return frame.id
          }))
        })

        if (ids && ids.length) {
          this.getFilesByIds(ids).then((files) => {
            resolve(files)
          })
        } else {
          resolve([])
        }
      }).catch((e) => {
        return reject(e)
      })
    })
  }

  getFilesByIds (ids) {
    return new Promise((resolve, reject) => {
      let format = this.options.format
      let options = this.options

      this.client.fileImages(this.fileID, { format, ids, ...options })
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
     let frameID = info.frame.id.replace(':', '_')
     let frameName = info.frame.name

     if (this.options.append_frame_id) {
       frameName = `${info.frame.name}_${frameID}`
     }

     let filename = `${frameName}.${this.options.format}`

     let path = `${this.path}/${filename}`

     let data = ''

     const addChunk = (chunk) => {
       data += chunk
     }

     const saveFile = () => {

       if (this.options.dont_overwrite) {
         let counter = 1

         while (fs.existsSync(path)) {
           filename = `${frameName}_(${counter}).${this.options.format}`
           path = `${this.path}/${filename}`
           counter++
         }
       }

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

        if (!url) {
          return
        }

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
