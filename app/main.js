'use strict'

const electron = require('electron')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const url = require('url')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null
let backgroundWindow = null

function createWindow () {
    // Create main browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600})
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))
    // Open the DevTools. TODO: If development...
    //mainWindow.webContents.openDevTools()
    mainWindow.on('closed', function () {
        mainWindow = null
    })

    // Create BG Worker Window.
    if (backgroundWindow === null) {
        createBackgroundWindow()
    }
}

function createBackgroundWindow() {
    // TODO:
    //backgroundWindow = new BrowserWindow({show:false})
    backgroundWindow = new BrowserWindow({width: 800, height: 600})
    backgroundWindow.webContents.openDevTools()
    backgroundWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'bg-indexer.html'),
        protocol: 'file:',
        slashes: true
    }))
    backgroundWindow.on('closed', function () {
        backgroundWindow = null
    })
}


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    //if (process.platform !== 'darwin') {
        app.quit()
    //}
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }

})

// MAIN APPLICATION -------------------------------------------------

var elasticsearch = require('elasticsearch')
var client = new elasticsearch.Client({
    host: 'localhost:9200'//,  log: 'trace'
})
// Ping the client
client.ping({
    requestTimeout: 1000,
}, function (error) {
    if (error) {
        console.error('elasticsearch cluster is down!')
    } else {
        console.log('elasticsearch is up.')
    }
})


ipcMain.on('query', (event, query) => {

    // console.log('got query:' + query)

    client.search({
        index: 'dsktpsrch',
        body: {
            query: {
                match: {
                    content: {
                        query: query,
                        operator: "and"
                    }
                }
            },
            highlight: {
                fields: {
                    content: {}
                }
            }
        }
    }).then(function (resp) {
        var hits = resp.hits.hits
        // console.log(hits)
        mainWindow.webContents.send('query-response', hits)
    }, function (err) {
        console.trace(err.message)
    })

})

ipcMain.on('reindex', (event, args) => {
    if(backgroundWindow){
        backgroundWindow.close()
        backgroundWindow = null
    }
    createBackgroundWindow()
})

// Message routing between sub-windows
ipcMain.on('indexer-message', (event, args) => {
    mainWindow.webContents.send('indexer-message', args)
})

ipcMain.on('indexer-progress', (event, args) => {
    mainWindow.webContents.send('indexer-progress', args)
})

