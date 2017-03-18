'use strict'

// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

// TODO: npm jquery bootstrap etc...

const {ipcRenderer} = require('electron')
const {dialog} = require('electron').remote
const Config = require('electron-config')
const config = new Config()
const elastic = require('./elasticsearch-client.js')
const shell = require('electron').shell


// Inter-process Communications -----------------------------------------------

ipcRenderer.on('indexer-message', (event, message) => {
    $('#progress_indicator').attr('title', message).tooltip('fixTitle').tooltip('show')
})


ipcRenderer.on('indexer-progress', (event, progress) => {

    var progressSpinner = function(){
        $('#spinner').show()
        $('#progress').hide()
        $('#checkmark').hide()
    }

    var progressCircle = function (f) {
        $('#spinner').hide()
        $('#progress').show()
        $('#checkmark').hide()
        var x = Math.floor( (12.0 + 10.0 * Math.sin(f*2.0*3.1415)) *10000.0)/10000
        var y = Math.floor( (12.0 + 10.0 * -Math.cos(f*2.0*3.1415)) *10000.0)/10000
        var d = 'M12,12 L12,2 A10,10 0 '+(f>=0.5 ? 1 : 0)+' 1 '+x+','+y+' z'
        $('#progress_circle').attr('d', d)
    }

    var progressDone = function () {
        $('#spinner').hide()
        $('#progress').hide()
        $('#checkmark').show()
        $('.checkmark').css('webkitAnimation', 'none')
        $('.checkmark__circle').css('webkitAnimation', 'none')
        $('.checkmark__check').css('webkitAnimation', 'none')
        setTimeout(function() {
            $('.checkmark').css('webkitAnimation', '')
            $('.checkmark__circle').css('webkitAnimation', '')
            $('.checkmark__check').css('webkitAnimation', '')
        }, 10)
    }

    if(progress[1] == 0) {
        progressSpinner()
    } else if (progress[0] == progress[1]) {
        progressDone()
    } else if(progress[1] > 0) {
        progressCircle(progress[0]/progress[1])
    }
})



// UI Logic -------------------------------------------------------------------

var last_query = ''
$('#q').keyup( _.debounce( function( event ) {
    if ( event.which == 13 ) {
        event.preventDefault()
    }
    var query = $('#q').val().trim()
    if(query != last_query) {
        last_query = query

        elastic.search(query).then(function (resp) {
            var hits = resp.hits.hits

            var ul = $('<ul/>')
            _.each( hits, function(r){
                var li = $('<li/>')
                var a = $('<a/>',{
                    html: decodeURI(r._id),
                    click: function(){
                        // TODO: 
                        console.log(decodeURI(r._id))
                        shell.openItem(decodeURI(r._id))
                    }
                }).css('cursor', 'pointer')
                li.append(a)

                a = $('<a/>',{
                    class: "small_link",
                    html: "[Klasörü Aç...]",
                    click: function(){
                        // TODO: 
                        console.log(decodeURI(r._id))
                        shell.showItemInFolder(decodeURI(r._id))
                    }
                }).css('cursor', 'pointer')
                li.append(" - ")
                li.append(a)

                _.each(r.highlight.content, function(k) {
                    li.append('<br>...' + k + '...')
                })
                ul.append(li)
            })
            $('#results').html(ul)

        }, function (err) {
            console.trace(err.message)
        })

    }
}, 10 ) )


$('#settings_button').click( function() {


    // Construct settings modal box contents.
    // TODO: are you sure?
    var add_list_item = function(r){
        var li = $('<li/>')
        var a = $('<a/>',{
            html: '<i class="glyphicon glyphicon-remove"></i> ' + r,
            click: function(){
                li.remove()
            }
        }).css('cursor', 'pointer')
        return li.append(a)
    }


    var div = $('<div/>')
    var ul = $('<ul/>', {
        id: "modal_list"
    })
    var folders = config.get('index_folders')
    _.each( folders, function(r){
        ul.append(add_list_item(r))
    })
    div.append(ul)
    var add_new = $("<a/>", {
        id: "modal_add_folder",
        html: "Klasör ekle",
        click: function(){
            var folder = dialog.showOpenDialog({properties: ['openDirectory']})
            if (typeof folder != 'undefined') {
                ul.append(add_list_item(folder))
            }
        }
    }).css('cursor', 'pointer')
    div.append(add_new)
    $('#settings_modal_body').html(div)


    // Save settings.
    $('#modal_save_button').click(function(){
        var new_folder_list = []
        ul.find('li').each(function(){
            new_folder_list.push($(this).text())
        })
        config.set('index_folders', new_folder_list)

        // Now, reindex.
        ipcRenderer.send('reindex', {rebuild:false})

        $('#settings_modal').modal('hide')
    })


    // Save settings and rebuild index.
    $('#modal_save_and_reindex_button').click(function(){
        var new_folder_list = []
        ul.find('li').each(function(){
            new_folder_list.push($(this).text())
        })
        config.set('index_folders', new_folder_list)

        // Now, reindex.
        ipcRenderer.send('reindex', {rebuild:true})
        console.log("rebuild")

        $('#settings_modal').modal('hide')
    })


    // Show settings modal.
    $('#settings_modal').modal('toggle')

})


$(document).ready(function() {

    // Necessary for the tooltip function. Required by bootstrap.
    $('[data-toggle="tooltip"]').tooltip()

    // Set focus to the search input.
    $('#q').focus()

})


