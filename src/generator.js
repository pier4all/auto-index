const Index = require("./index")
const util = require("./util")

// Following: https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/#improve-performance-with-indexes-and-document-filters

class Generator {
  constructor() {
    // leave it for options
  }

  generateIndexes(aggregations) {

    let indexes = []

    for (const aggregation of aggregations){

      const operatorSeq = aggregation.pipeline.map(util.getAggregationStageOperator); 

      let baseCollection = aggregation.collection

      let stepNum = 0
      for (const stage of aggregation.pipeline){

        const operator = util.getAggregationStageOperator(stage)
        let name = aggregation.name + '_' + baseCollection + '_' + operator.replace('$', '') + '_' + stepNum
        
        let index = this.getStageIndex(operator, stage, stepNum, operatorSeq, aggregation, name) 
        if (index) {
          indexes.push(index)  
        }
        
        //increase index number
        stepNum += 1
      }
    }

    return indexes
  }

  getStageIndex(operator, stage, order, sequence, aggregation, name) {
    switch (operator){
      case '$match':
        return this.getMatchIndex(operator, stage, order, sequence, aggregation, name);
      default:
        return undefined
    }
  }

  getMatchIndex(operator, stage, order, sequence, aggregation, name){

    // $match can use an index to filter documents if $match is the first stage in a pipeline or 
    // if the previous ones are of a type that is moved for later by mongo.
    if (order > 0){
      const valid = ["$project", "$match", "$unset", "$addFields", "$set", "$sort"]
      for (let previous of sequence.slice(0, order)) {
        if (!valid.includes(previous)) {
          return undefined
        }
      }
    }

    const elementDict = stage[operator]

    // operators that change the syntax
    const logicOperators = ["$or", "$and", "$nor"]

    let indexKey = {}
    // loop over match stage elements
    Object.keys(elementDict).forEach(function(key, index) {
      if (!logicOperators.includes(key)) {
        if (!key.startsWith('$')){
          indexKey[key] = 1          
        }
      } else {
        //deal with logical operator clauses
        /* TODO: write a proper recursive function */ 
        let logicParams = elementDict[key]
        for (let logicParam of logicParams){
          Object.keys(logicParam).forEach(function(param, pos) {
            if (!param.startsWith('$')){
              indexKey[param] = 1          
            }
          })
        }
      }
    })

    // simple fields
    return new Index(name, indexKey, aggregation.collection, {} )
  }

}




module.exports = Generator