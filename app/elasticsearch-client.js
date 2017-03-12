
var elasticsearch = require('elasticsearch');

var elasticClient = new elasticsearch.Client({
    host: 'http://localhost:9200',
    log: 'trace'
});

var indexName = 'dsktpsrch';

/**
* Delete an existing index
*/
function deleteIndex() {
    return elasticClient.indices.delete({
        index: indexName
    });
}
exports.deleteIndex = deleteIndex;

/**
* create the index
*/
function initIndex() {
    return elasticClient.indices.create({
        index: indexName
    });
}
exports.initIndex = initIndex;

/**
* check if the index exists
*/
function indexExists() {
    return elasticClient.indices.exists({
        index: indexName
    });
}
exports.indexExists = indexExists;

/**
* init mapping
*/
function initMapping() {
    return elasticClient.indices.putMapping({
        index: indexName,
        type: "document",
        body: {
            properties: {
                title: { type: "string" },
                content: { type: "string" },
                suggest: {
                    type: "completion",
                    analyzer: "simple",
                    search_analyzer: "simple"
                }
            }
        }
    });
}
exports.initMapping = initMapping;

function addDocument(document) {
    return elasticClient.index({
        index: indexName,
        type: "document",
        id: document.id,
        body: {
            title: document.title,
            mtime: document.mtime,
            content: document.content,
            suggest: {
                input: document.title.split(" ")
            }
        }
    });
}
exports.addDocument = addDocument;

function documentExists(path) {
    return elasticClient.exists({
        index: indexName,
        type: "document",
        id: path
    });
}
exports.documentExists = documentExists;


function getSuggestions(input) {
    return elasticClient.suggest({
        index: indexName,
        type: "document",
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
exports.getSuggestions = getSuggestions;
