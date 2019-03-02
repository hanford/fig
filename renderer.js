// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const path = require('path')
const { exec } = require('child_process')
const fs = require('fs')
const ffbinaries = require('ffbinaries');
const { shell, ipcRenderer } = require('electron')

const ffDest = __dirname + '/binaries';

function getConversionCommand(inputFilePath, outputFilePath) {
  console.log({inputFilePath,outputFilePath})
  // http://mwholt.blogspot.com/2014/08/convert-video-to-animated-gif-with.html
  return `ffmpeg -i ${inputFilePath} -r 20 -f image2pipe -vcodec ppm - | convert -layers Optimize - ${outputFilePath}`;
}

function transform({ inputFilePath }) {
  const { name, dir } = path.parse(inputFilePath)
  const output = path.resolve(dir, `${name}.gif`)

  return new Promise((resolve, reject) => {
    // Get absolute paths for input and output files
    const absoluteInputFilePath = path.resolve(inputFilePath);
    const absoluteOutputFilePath = path.resolve(output);

    fileExists(absoluteInputFilePath)
      .then(() => {
        // Get conversion command
        const cmd = getConversionCommand(inputFilePath, output)

        // Execute conversion command
        exec(cmd, (error, stdout, stderr) => {
          console.log({ error, stdout, stderr })
          // Error handling
          if (error) {
            reject(error);
          } else {
            ipcRenderer.send('OPEN_FILE', output)
            resolve({
              stdout,
              stderr,
            });
          }
        });
      })
      .catch((err) => reject(err))
  });
}

function fileExists(path) {
  return new Promise((resolve, reject) => {
    try {
      fs.access(path, fs.F_OK, function(err) {
        if (err) {
          reject(new Error(path))
        } else {
          resolve()
        }
      });
    } catch(error) {
      throw error;
    }
  })
}

(() => {
  ffbinaries.downloadBinaries(['ffmpeg'], {platform: 'mac', quiet: true, destination: ffDest}, function () {
    console.log('Downloaded ffplay and binaries for mac to ' + ffDest + '.');
  });

  var holder = document.body;
  const loader = document.getElementById('loader')

  holder.ondragover = () => {
    return false;
  };

  holder.ondragleave = () => {
    return false;
  };

  holder.ondragend = () => {
    return false;
  };

  holder.ondrop = (e) => {
    e.preventDefault();

    loader.style.opacity = 1;

    for (let f of e.dataTransfer.files) {
      transform({ inputFilePath: f.path })
        .then(() => {
          loader.style.opacity = 0;

        })
    }
    
    return false;
  };
})()