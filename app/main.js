'use strict'

const electron = require('electron')
const spawn = require('child_process').spawn
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const url = require('url')
const elastic = require('./elasticsearch-client.js')



// Window & process handling functions ----------------------------------------

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow = null
let backgroundWindow = null
var bat = null
var PID = null

function createWindow () {

    // TODO: Bunu diğer .js ye al.
    console.log("------------------------------------------------------")
    console.log( path.resolve('../elasticsearch/bin/elasticsearch.bat') )

    bat = spawn('cmd.exe', ['/c', path.resolve('../elasticsearch/bin/elasticsearch.bat -p PID')])
    console.log(bat.pid)

    // Handle normal output
    bat.stdout.on('data', (data) => {
        // As said before, convert the Uint8Array to a readable string.
        var str = String.fromCharCode.apply(null, data)
        console.info(str)
        var sss = str.indexOf('pid')
        if(sss>0){
            PID = parseInt(str.substr(sss+4, str.indexOf(']', sss) - sss - 4), 10)
            console.info( PID )
        }
    })

    // Handle error output
    bat.stderr.on('data', (data) => {
        // As said before, convert the Uint8Array to a readable string.
        var str = String.fromCharCode.apply(null, data)
        console.error(str)
    })

    // Handle on exit event
    bat.on('exit', (code) => {
        var preText = `Child exited with code ${code} : `

        switch(code){
            case 0:
                console.info(preText+"Something unknown happened executing the batch.")
                break
            case 1:
                console.info(preText+"The file already exists")
                break
            case 2:
                console.info(preText+"The file doesn't exists and now is created")
                break
            case 3:
                console.info(preText+"An error ocurred while creating the file")
                break
        }
    })


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
        exitGracefully()
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

function exitGracefully() {

    if(PID) {
        console.log("Will kill " + PID)
        process.kill(PID)
    }

    if(bat) {
        console.log("Will kill batch process")
        bat.kill()
    }

    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    //if (process.platform !== 'darwin') {
        console.log("Will quit -hopefully- gracefully")
        app.quit()
    //}    
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
    exitGracefully()
})

app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }

})



// Inter-process Communications -----------------------------------------------

ipcMain.on('reindex', (event, args) => {
    if(backgroundWindow){
        backgroundWindow.close()
        backgroundWindow = null
    }

    console.log(args)

    if(args.rebuild){
        elastic.indexExists().then(function(exists){
            if(exists){
                elastic.deleteIndex()
            }
        }).then(elastic.initIndex).then(elastic.initMapping).then(createBackgroundWindow)

    }else{
        createBackgroundWindow()
    }
})

ipcMain.on('indexer-message', (event, args) => {
    mainWindow.webContents.send('indexer-message', args)
})

ipcMain.on('indexer-progress', (event, args) => {
    mainWindow.webContents.send('indexer-progress', args)
})

