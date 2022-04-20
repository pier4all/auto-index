const fs = require('fs')
var path = require('path');
const Aggregation = require('./aggregation')

exports.getAggregationsFromDir = (inputDir, defaultCollection = undefined) => {

    const dir = fs.opendirSync(inputDir)
    let queries = []
    let dirent
    while ((dirent = dir.readSync()) !== null) {
      if (dirent.name.endsWith(".json")) {
        const aggregation = Aggregation.fromFile(path.join(inputDir, dirent.name))
        aggregation.collection = aggregation.collection || defaultCollection
        queries.push(aggregation)
      }
    }
    dir.closeSync()

    queries.sort((a, b) => {
      if (a.name < b.name) return -1
      else  return 1;
    })
    
    return queries
}

exports.getAggregationStageOperator = (stage) => {
    let operator = undefined
    Object.keys(stage).forEach(function(key, index) {
        if ((key.startsWith('$')) && (operator == undefined)) {
            operator = key
        }
    });
    return operator
}

