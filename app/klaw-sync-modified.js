'use strict'

// Modified from
// https://raw.githubusercontent.com/manidlou/node-klaw-sync/master/klaw-sync.js
// This one does not follow sym links. There are no nodir, nofile, ignore options.

var path = require('path')
var fs
try {
    fs = require('graceful-fs')
} catch (e) {
    fs = require('fs')
}

// http://aganov.github.io/underscore-strings/docs/underscore.strings.html
var endsWith = function (string, pattern) {
    var d = string.length - pattern.length
    return d >= 0 && string.indexOf(pattern, d) === d
}

function anyExtension(iterable, name) {
    for (var index = 0; index < iterable.length; ++index) {
        if (endsWith(name, iterable[index])) return true
    }
    return false
}

function _procPath (dir, pathItem, opts, list) {
    var nestedPath
    var stat
    // here since dir already resolved, we use string concatenation
    // which showed faster performance than path.join() and path.resolve()
    if (path.sep === '/') {
        nestedPath = dir + '/' + pathItem
    } else {
        nestedPath = dir + '\\' + pathItem
    }
    stat = fs.lstatSync(nestedPath)
    // DO NOT FOLLOW SYMBOLIC LINKS!
    if (!stat.isSymbolicLink()) {
        if (stat.isDirectory()) {
            list = walkSync(nestedPath, opts, list)
        } else {
            if (opts.extensions && anyExtension(opts.extensions, nestedPath) ){
                list.push({path: nestedPath, filename: pathItem, stats: stat})
            }
        }
    }
}

function walkSync (dir, opts, list) {
    var files
    var ignore = []
    opts = opts || {}
    list = list || []
    dir = path.resolve(dir)
    try {
        files = fs.readdirSync(dir)
    } catch (er) {
        throw er
    }

    for (var i = 0; i < files.length; i += 1) {
        var file = files[i]
        _procPath(dir, file, opts, list)
    }
    return list
}

module.exports = walkSync
