'use strict'

const fs = require('fs')
const https = require('https')
const Figma = require ('figma-js')
const getDirName = require('path').dirname

const DEFAULT_FILE_FORMAT = 'svg'

process.on('unhandledRejection', (error) => {
  console.log(error)
})

module.exports = class Extractor {
  constructor (personalAccessToken, fileID, options) {
    let format = options && options.format || DEFAULT_FILE_FORMAT

    this.fileID = fileID
    this.pageID = options && options.pageID
    this.options = { format, ...options}
    this.frames = {}

    this.client = Figma.Client({
      personalAccessToken
    })
  }

  async getDocumentIds ({ data }) {
    return new Promise((resolve, reject) => {
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
        resolve(ids)
      } else {
        resolve([])
      }
    })
  }

  extract (path = '.')  {
    this.path = path

    return this.client.file(this.fileID)
      .then(this.getDocumentIds.bind(this))
      .then(this.getFilesByIds.bind(this))
      .then(this.downloadFileImages.bind(this))
      .catch((e) => {
        console.log(e)
      })
  }

  async getFilesByIds (ids) {
    let format = this.options.format
    let options = this.options
    return this.client.fileImages(this.fileID, { format, ids, ...options })
  }

  onGetImage (id, res) {
    return new Promise((resolve, reject) => {

      let info = this.frames[id]
      let frameID = info.frame.id.replace(':', '_')
      let name = info.frame.name
      let pageName = undefined
      let frameName = undefined

      if (this.options.append_page_name) {
        pageName = info.page.name
      }

      if (this.options.append_frame_id) {
        frameName = info.frame.name
      }

      name = [pageName, frameName, frameID].filter(n => n).join('_')

      let filename = `${name}.${this.options.format}`

      let folder = this.options.use_pages_as_folders ? info.page.name : undefined
      let path = [this.path, folder, filename].filter(n => n).join('/')

      let data = ''

      const addChunk = (chunk) => {
        data += chunk
      }

      const saveFile = () => {

        if (this.options.dont_overwrite) {
          let counter = 1

          while (fs.existsSync(path)) {
            filename = `${name}_(${counter}).${this.options.format}`
            path = `${this.path}/${filename}`
            counter++
          }
        }

        fs.mkdir(getDirName(path), { recursive: true}, (error) => {
          if (error) {
            return reject(error)
          }

          fs.writeFile(path, data, 'binary', (e) => {
            if (e) {
              console.log('error')
              return reject(e)
            }

            let page = this.frames[id].page.name
            resolve({ filename, page })
          })
        })
      }


      res.setEncoding('binary')
      res.on('data', addChunk)
      res.on('end', saveFile)
    })
  }

  async downloadFileImages (fileImages) {
    let images = fileImages.data.images
    let promises = []

    for (let id in images) {
      let url = images[id]
      if (url) {
        promises.push(await this.downloadImage(id, url))
      }
    }
    return Promise.all(promises)
  }

  async downloadImage (id, url) {
    return new Promise((resolve, reject) => {
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
  }
}
