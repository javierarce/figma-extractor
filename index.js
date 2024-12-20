"use strict";

const fs = require("fs");
const https = require("https");
const Figma = require("figma-js");
const getDirName = require("path").dirname;

const DEFAULT_FILE_FORMAT = "svg";

process.on("unhandledRejection", (error) => {
  console.log(error);
});

module.exports = class Extractor {
  constructor(personalAccessToken, fileID, options) {
    let format = (options && options.format) || DEFAULT_FILE_FORMAT;

    this.fileID = fileID;
    this.pageID = options && options.pageID;
    this.options = { format, ...options };
    this.frames = {};

    this.client = Figma.Client({
      personalAccessToken,
    });
  }

  async getDocumentIds({ data }) {
    return new Promise((resolve, _reject) => {
      this.pages = data.document.children;

      if (this.pageID) {
        this.pages = this.pages.filter((page) => {
          return page.id === this.pageID;
        });
      }

      let ids = [];

      this.pages.forEach((page) => {
        ids.push(
          ...page.children.map((frame) => {
            if (this.options.get_background_color) {
              const backgroundColor = this.rgbToHex(page.backgroundColor);
              this.frames[frame.id] = { frame, page, backgroundColor };
            } else {
              this.frames[frame.id] = { frame, page };
            }

            return frame.id;
          }),
        );
      });

      if (ids && ids.length) {
        resolve(ids);
      } else {
        resolve([]);
      }
    });
  }

  extract(path = ".") {
    this.path = path;

    return this.client
      .file(this.fileID)
      .then(this.getDocumentIds.bind(this))
      .then(this.getFilesByIds.bind(this))
      .then(this.downloadFileImages.bind(this))
      .then(this.getComments.bind(this))
      .catch((e) => {
        console.log(e);
      });
  }

  getComments(data) {
    return new Promise(async (resolve) => {
      if (!this.options.get_comments) {
        return resolve(data);
      }

      this.client.comments(this.fileID).then((response) => {
        let frameComments = {};
        let pageComments = {};

        // Initialize page comments
        this.pages.forEach((page) => {
          pageComments[page.id] = [];
        });

        // First pass: organize parent comments
        response.data.comments.forEach((comment) => {
          if (comment.resolved_at) return;

          // If it's a reply (has parent_id), find the parent's nodeId
          if (comment.parent_id) {
            const parentComment = response.data.comments.find(
              (c) => c.id === comment.parent_id,
            );
            if (parentComment && parentComment.client_meta) {
              const nodeId = parentComment.client_meta.node_id;
              if (this.pages.some((page) => page.id === nodeId)) {
                pageComments[nodeId].push({
                  message: comment.message,
                  user: comment.user.handle,
                  created_at: comment.created_at,
                });
              } else {
                if (!frameComments[nodeId]) {
                  frameComments[nodeId] = [];
                }
                frameComments[nodeId].push({
                  message: comment.message,
                  user: comment.user.handle,
                  created_at: comment.created_at,
                });
              }
            }
            return;
          }

          // Process parent comments with client_meta
          if (comment.client_meta) {
            const nodeId = comment.client_meta.node_id;
            if (this.pages.some((page) => page.id === nodeId)) {
              pageComments[nodeId].push({
                message: comment.message,
                user: comment.user.handle,
                created_at: comment.created_at,
              });
            } else {
              if (!frameComments[nodeId]) {
                frameComments[nodeId] = [];
              }
              frameComments[nodeId].push({
                message: comment.message,
                user: comment.user.handle,
                created_at: comment.created_at,
              });
            }
          }
        });

        // Attach comments to files
        data.forEach((file) => {
          let fileComments = [];

          // Add page comments if they exist
          if (pageComments[file.page_id]?.length > 0) {
            fileComments = [...pageComments[file.page_id]];
          }

          // Add frame comments if they exist
          for (let frameId in this.frames) {
            const frame = this.frames[frameId].frame;
            const framePage = this.frames[frameId].page;

            if (
              framePage.id === file.page_id &&
              frame.name + ".svg" === file.filename
            ) {
              if (frameComments[frameId]) {
                fileComments = [
                  ...fileComments,
                  ...frameComments[frameId],
                ].reverse();
              }
              break;
            }
          }

          // Only add comments property if there are comments
          if (fileComments.length > 0) {
            file.comments = fileComments;
          }
        });

        resolve(data);
      });
    });
  }

  async getFilesByIds(ids) {
    let format = this.options.format;
    let options = this.options;
    return this.client.fileImages(this.fileID, { format, ids, ...options });
  }

  getImageSavePath(id) {
    let info = this.frames[id];
    let frameID = info.frame.id.replace(":", "_");

    let name = info.frame.name;
    let filename = `${name}.${this.options.format}`;

    let pageName = this.options.append_page_name ? info.page.name : undefined;
    let frameName = this.options.append_frame_id ? info.frame.name : undefined;
    let folder = this.options.use_pages_as_folders ? info.page.name : undefined;

    name = [pageName, frameName, frameID].filter((n) => n).join("_");

    let path = [this.path, folder, filename].filter((n) => n).join("/");

    if (this.options.dont_overwrite) {
      let counter = 1;

      while (fs.existsSync(path)) {
        filename = `${name}_(${counter}).${this.options.format}`;
        path = `${this.path}/${filename}`;
        counter++;
      }
    }

    return { filename, path };
  }

  onGetImage(id, res) {
    return new Promise((resolve, _reject) => {
      let data = "";

      res.setEncoding("binary");

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        this.saveFile(id, data).then((response) => {
          resolve(response);
        });
      });
    });
  }

  saveFile(id, data) {
    return new Promise((resolve, reject) => {
      let savePath = this.getImageSavePath(id);

      fs.mkdir(getDirName(savePath.path), { recursive: true }, (error) => {
        if (error) {
          return reject(error);
        }

        fs.writeFile(savePath.path, data, "binary", (e) => {
          if (e) {
            return reject(e);
          }

          let page = this.frames[id].page;

          const result = {
            filename: savePath.filename,
            page_id: page.id,
            page: page.name,
          };

          const backgroundColor = this.frames[id].backgroundColor;

          if (backgroundColor) {
            result.background_color = backgroundColor;
          }

          resolve(result);
        });
      });
    });
  }

  async downloadFileImages(fileImages) {
    let images = fileImages.data.images;
    let promises = [];

    for (let id in images) {
      let url = images[id];
      if (url) {
        promises.push(await this.downloadImage(id, url));
      }
    }
    return Promise.all(promises);
  }

  async downloadImage(id, url) {
    return new Promise((resolve, reject) => {
      try {
        https.get(url, (res) => {
          this.onGetImage(id, res)
            .then((response) => {
              resolve(response);
            })
            .catch((e) => {
              return reject(e);
            });
        });
      } catch (e) {
        return reject(e);
      }
    });
  }

  rgbToHex(color) {
    return (
      "#" +
      [color.r, color.g, color.b]
        .map((x) => {
          const hex = Math.round(x * 255).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("")
    );
  }
};
