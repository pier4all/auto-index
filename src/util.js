const fs = require('fs')
var path = require('path');
const Aggregation = require('./aggregation');
const Query = require('./query');


exports.getAggregationsFromDir = (inputDir, defaultCollection = undefined) => {

    const dir = fs.opendirSync(inputDir)
    let queries = []
    let dirent
    while ((dirent = dir.readSync()) !== null) {
      if (dirent.name.endsWith(".json")) {
        let aggregation = Aggregation.fromFile(path.join(inputDir, dirent.name))

        if (! aggregation.pipeline || aggregation.pipeline.length == 0) {
          aggregation = Query.fromFile(path.join(inputDir, dirent.name)).toAggregation()
        }

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

exports.removeIndexFromArray = (array, key, value) => {
  const index = array.findIndex(obj => obj[key] === value);
  return index >= 0 ? [
      ...array.slice(0, index),
      ...array.slice(index + 1)
  ] : array;
}

exports.writeIndexResults = (array, ouptputDir) => {

  const indexFileName = 'indexes_' + new Date().toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0] + '.json';
  const indexFilePath = path.join(ouptputDir, indexFileName);

  let  mongoIndexes = []
  let text = "["

  for (let index of array){
    text += JSON.stringify(index.toMongoJSON(), null, 2)
    text += ",\n"
    mongoIndexes.push(index.toMongoJSON())
  }
  text += "]"

  fs.appendFileSync(indexFilePath, text)

  console.log(text)
  return mongoIndexes

}
