'use strict'

const elasticsearch = require('elasticsearch')

const elasticClient = new elasticsearch.Client({
    host: 'http://localhost:9200'//, log: 'trace'
})

const indexName = 'dsktpsrch'

/*function health() {
    return client.cluster.health({},function(err,resp,status) {  
      console.log("-- Client Health --",resp)
    })
}*/


/**
* Delete an existing index
*/
function deleteIndex() {
    return elasticClient.indices.delete({
        index: indexName
    })
}
exports.deleteIndex = deleteIndex

/**
* create the index
*/
function initIndex() {
    return elasticClient.indices.create({
        index: indexName
    })
}
exports.initIndex = initIndex

/**
* check if the index exists
*/
function indexExists() {
    return elasticClient.indices.exists({
        index: indexName
    })
}
exports.indexExists = indexExists

/**
* init mapping
*/
function initMapping() {
    return elasticClient.indices.putMapping({
        index: indexName,
        type: "document",
        body: {
            properties: {
                title: {
                    type: 'string'
                },
                mtime: {
                    type: 'date'
                },
                content: {
                    type: 'text',
                    analyzer: 'turkish'
                }
            }
        }
    })
}
exports.initMapping = initMapping

function addDocument(document) {
    return elasticClient.index({
        index: indexName,
        type: "document",
        id: document.id,
        body: {
            title: document.title,
            mtime: document.mtime,
            content: document.content
        }
    })
}
exports.addDocument = addDocument

function documentExists(path) {
    return elasticClient.exists({
        index: indexName,
        type: "document",
        id: path
    })
}
exports.documentExists = documentExists


function getSuggestions(input) {
    return elasticClient.suggest({
        index: indexName,
        body: {
            docsuggest: {
                text: input,
                completion: {
                    field: "suggest",
                    fuzzy: true
                }
            }
        }
    })
}
exports.getSuggestions = getSuggestions


function search(query) {

    return elasticClient.search({
        index: indexName,
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
    })

}
exports.search = search

