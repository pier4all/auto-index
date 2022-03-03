const Index = require("./index")
const util = require("./util")

// Following: https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/#improve-performance-with-indexes-and-document-filters

// move later to commons/const
// operators that change the syntax
const LOGIC_OPS = ["$or", "$and", "$nor"]
const COMPARISON_OPS = ['$cmp', '$eq', '$gt', '$gte', '$lt', '$lte', '$ne']
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
      case '$sort':
        return this.getSortIndex(operator, stage, order, sequence, aggregation, name);
      case '$group':
        return this.getGroupIndex(operator, stage, order, sequence, aggregation, name);
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
      if (!key.startsWith('$')){
        indexKey[key] = 1          
      } else {
        if (LOGIC_OPS.includes(key)) {
          //deal with logical operator clauses
          const logicIndex = this.processLogicalOperator(elementDict[key])
          Object.keys(logicIndex).forEach(function(field, pos) {
                indexKey[field] = 1          
          })  
        }  else {
          // expressions { $expr: { $gt: [ "$spent" , "$budget" ] } }
          if (key === '$expr'){
            let exprOp = Object.keys(elementDict[key])[0]
            // Check if it is a compariso operator
            // TODO: check other types of operators
            if (COMPARISON_OPS.includes(exprOp)) {
              let comparisonFields = elementDict[key][exprOp]
              for (let compField of comparisonFields) {
                if (String(compField).startsWith('$')){
                  indexKey[compField.replace('$', '')] = 1  
                  // only add the first element
                  break
                }
              }
            }
          }
        }
      }
    }

    // return fields index
    if (indexKey && Object.keys(indexKey).length>0) {
      return new Index(name, indexKey, aggregation.collection, "$match", order, {} )
    } else {
      return undefined
    }
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

  getSortIndex(operator, stage, order, sequence, aggregation, name) {
    // $sort can use an index if $sort is not preceded by a $project, $unwind, or $group stage.
    // TODO: check if one should generate an index for { $sort: { score: { $meta: "textScore" }}
    if (order > 0){
      const notValid = ["$project", "$unwind", "$group"]
      for (let previous of sequence.slice(0, order)) {
        if (notValid.includes(previous)) {
          return undefined
        }
      }
    }

    const elementDict = stage[operator]

    let indexKey = {}
    // loop over match stage elements
    for (const [key, index] of Object.entries(elementDict)) {
      if (!key.startsWith('$')){
        if ((elementDict[key] == 1) || elementDict[key] == -1){
          indexKey[key] = elementDict[key]          
        }
      }
    }

    // return fields index
    if (indexKey && Object.keys(indexKey).length>0) {
      return new Index(name, indexKey, aggregation.collection, "$sort", order, {} )
    } else {
      return undefined
    }
  }

  getGroupIndex(operator, stage, order, sequence, aggregation, name) {
    // $group can potentially use an index to find the first document in each group if:
    //     $group is preceded by $sort that sorts the field to group by, and
    //     there is an index on the grouped field that matches the sort order, and
    //     $first is the only accumulator in $group.    
    if ((order == 0) || (!sequence.slice(0, order).includes('$sort'))){
      return undefined
    }

    // check if there is an invalid previous step
    // and take the chance to get the order of the latest $sort
    let previousSortOrder = 0
    let aggOrder = 0
    const notValid = ["$group", "$project", "$unwind"]
    for (let previous of sequence.slice(0, order)) {
      if (notValid.includes(previous)) {
        return undefined
      } else {
        if(previous === "$sort"){
          previousSortOrder = aggOrder
        }
      }
      aggOrder += 1
    }

    // [
    //   {
    //     $sort:{ x : 1, y : 1 }
    //   },
    //   {
    //     $group: {
    //       _id: { x : "$x" },
    //       y: { $first : "$y" }
    //     }
    //   }
    // ]

    let previousSortDict = aggregation.pipeline[previousSortOrder]["$sort"]

    const elementDict = stage[operator]
    
    // check if the grouping fields match the sort
    let validSortFields = {}
    let i = 0
    for (const groupField of Object.values(elementDict["_id"])) {
      let idField = groupField.replace('$', '')
      let sortField = Object.keys(previousSortDict)[i]
      if (idField === sortField) {
        validSortFields[sortField] = previousSortDict[sortField]
      } else {
        return undefined
      }
      i += 1
    }
    
    // check if there is only a "first" stage with the matching field
    if (Object.keys(previousSortDict).length > Object.keys(validSortFields).length && Object.keys(validSortFields).length>0) {
      let nextSortField = Object.keys(previousSortDict)[Object.keys(validSortFields).length]
      // loop over group stage elements
      for (const [key, element] of Object.entries(elementDict)) {
        if (key !== "_id") {
          for (const [groupOp, field] of Object.entries(element)) {
            if (groupOp == "$first" && String((field)).replace('$', '') == nextSortField){
              validSortFields[nextSortField] = previousSortDict[nextSortField]
            } else {
              return undefined
            }
          }
        }
      }
    } else {
      return undefined
    }

    // return fields index
    let adaptedSortStage = aggregation.pipeline[previousSortOrder]
    adaptedSortStage['$sort'] = validSortFields
    let sortIndex = this.getSortIndex("$sort", adaptedSortStage, previousSortOrder, sequence, aggregation, name)
    sortIndex.order = order
    sortIndex.operator = operator
    return sortIndex
  }

}

module.exports = Generator