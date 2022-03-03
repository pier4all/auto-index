const Index = require("./index")
const util = require("./util")

// Following: https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/#improve-performance-with-indexes-and-document-filters

// move later to commons/const
// operators that change the syntax
const LOGIC_OPS = ["$or", "$and", "$nor"]
class Generator {
  constructor() {
    // leave it for options
  }

  generate(aggregations) {

    let result = {}

    for (let aggregation of aggregations) {
      result[aggregation.name] = this.generateIndexes(aggregation) 
    }
    return result
  }

  generateIndexes(aggregation) {

    let indexes = []

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

  getMatchIndex(operator, stage, order, sequence, aggregation, name) {

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

    let indexKey = {}
    // loop over match stage elements
    for (const [key, index] of Object.entries(elementDict)) {
      if (!LOGIC_OPS.includes(key)) {
        if (!key.startsWith('$')){
          indexKey[key] = 1          
        }
      } else {
        //deal with logical operator clauses
        /* TODO: write a proper recursive function */ 
        const logicIndex = this.processLogicalOperator(elementDict[key])
        Object.keys(logicIndex).forEach(function(field, pos) {
              indexKey[field] = 1          
        })      
      }
    }

    // return fields index
    return new Index(name, indexKey, aggregation.collection, "$match", order, {} )
  }

  processLogicalOperator(params) {
    let logicfields = {}
    for (let logicParam of params){
      for (const [param, index] of Object.entries(logicParam)) {
        if (!param.startsWith('$')){
          logicfields[param] = 1          
        } else {
          if (LOGIC_OPS.includes(param)) {
            const logicIndex = this.processLogicalOperator(logicParam[param])
            Object.keys(logicIndex).forEach(function(field, pos) {
              logicfields[field] = 1          
            })      
          }
        }
      }
    }
    return logicfields
  }
}




module.exports = Generator