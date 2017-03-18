'use strict'

const {ipcRenderer} = require('electron')
const remote = require('electron').remote
const async = require('async')
const textract = require('textract')
const elastic = require('./elasticsearch-client.js')
var fs = require('fs')

// -----------------------------------------------

var indexDocuments = function() {

    var process_TXT = function(path, callback) {
        fs.readFile(path, 'utf8', callback)
    }

    var process_DOC = function(path, callback) {
        textract.fromFileWithPath(path, callback)
    }

    var process_DOCX = function(path, callback) {
        textract.fromFileWithPath(path, callback)
    }

    var process_PDF = function(path, callback) {
        textract.fromFileWithPath(path, callback)
    }

    const extensions = {
        'txt': process_TXT,
        'pdf': process_PDF,
        'doc': process_DOC,
        'rtf': process_DOC,
        'docx': process_DOCX
    }

    ipcRenderer.send('indexer-message', 'Calculating index')
    ipcRenderer.send('indexer-progress', [0, 0])

    const Config = require('electron-config')
    const config = new Config()
    const walkSyncModified = require('./klaw-sync-modified.js')
    const path = require('path')
    var folders = config.get('index_folders')
    var paths = []
    folders.forEach( function(f) {
        f = f.trim()
        paths = walkSyncModified(f.trim(), { extensions: Object.keys(extensions) }, paths)
    })

    ipcRenderer.send('indexer-message', paths.length.toString() + ' files will be indexed.')

    var processingStatus = 'building list'
    var lastProcessedFile = ''
    var i = 0
    // TODO: REAL INDEX
    async.eachOfSeries( paths, function(p, i, callback){

        ipcRenderer.send('indexer-message', 'Indexing: ' + p.filename)
        ipcRenderer.send('indexer-progress', [i+1, paths.length])

        elastic.documentExists(p.path).then( function (exists) {
            console.log(exists)
            if (!exists) {

                // Doc does not exist. Process and add doc.
                var re = /(?:\.([^.]+))?$/
                var ext = re.exec(p.path)[1]    // Get file extension.
                if ( Object.keys(extensions).includes(ext) ){

                    (extensions[ext])(p.path, function(err, data){
                        if (err) {
                            console.log('err' + err)
                        }
                        console.log(p.filename)
                        //document.write(data)

                        elastic.addDocument({
                            id: encodeURI(p.path),
                            title: p.filename,
                            mtime: p.stats.mtime,
                            content: data
                        })

                        //.then(callback)
                        callback()
                    })
                } else {
                    process.nextTick(callback)
                }


            } else {
                // Doc exists already. TODO: check mtime.
                process.nextTick(callback)
            }

        }, function(error) {
            console.log(error)
            process.nextTick(callback)
        })


    }, function (err) {
        if (err) console.error(err.message)
        ipcRenderer.send('indexer-message', 'Index ready.')
        ipcRenderer.send('indexer-progress', [paths.length, paths.length])
        Promise.resolve(true)
    })

}

indexDocuments()

