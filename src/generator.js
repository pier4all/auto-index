const Aggregation = require("./aggregation")
const Index = require("./index")
const util = require("./util")

// Following: https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/#improve-performance-with-indexes-and-document-filters

// move later to commons/const
// operators that change the syntax
const LOGIC_OPS = ["$or", "$and", "$nor", "$not"]
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
      case '$lookup':
        return this.getLookupIndex(operator, stage, order, sequence, aggregation, name);
      default:
        return undefined
    }
  }

  getMatchIndex(operator, stage, order, sequence, aggregation, name) {
    // $match can use an index to filter documents if $match is the first stage in a pipeline or 
    // if the previous ones are of a type that is moved for later by mongo.
    if (order > 0){
      const valid = ["$project", "$match", "$unset", "$set", "$sort", "$addFields"] 
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
            // Check if it is a comparison operator
            // TODO: check other types of operators
            if (COMPARISON_OPS.includes(exprOp)) {
              let comparisonFields = elementDict[key][exprOp]
              for (let compField of comparisonFields) {
                if (String(compField).startsWith('$') && !String(compField).startsWith('$$')){
                  indexKey[compField.replace('$', '')] = 1  
                  // only add the first element
                  break
                }
              }
            } else if (LOGIC_OPS.includes(exprOp)) {
              //deal with logical operator clauses
              const logicIndex = this.processLogicalOperator(elementDict[key][exprOp])
              Object.keys(logicIndex).forEach(function(field, pos) {
                    indexKey[field] = 1          
              }) 
            }
          }
        }
      }     
    }

    // get aliases to avoid putting them in the index
    let addedFields = this.getAddedFields(aggregation.pipeline.slice(0, order))
    indexKey = this.applyAliases(addedFields, indexKey) 

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
          } else if (COMPARISON_OPS.includes(param)) {
            let comparisonFields = logicParam[param]
            for (let compField of comparisonFields) {
              if (String(compField).startsWith('$') && !String(compField).startsWith('$$')){
                logicfields[compField.replace('$', '')] = 1  
                // only add the first element
                break
              }
            }  
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

    // get aliases to avoid putting them in the index
    let addedFields = this.getAddedFields(aggregation.pipeline.slice(0, order))
    indexKey = this.applyAliases(addedFields, indexKey) 

    // return fields index
    if (indexKey && Object.keys(indexKey).length>0) {
      return new Index(name, indexKey, aggregation.collection, "$sort", order, {} )
    } else {
      return undefined
    }
  }

  getGroupIndex(operator, stage, order, sequence, aggregation, name) {
    //     $group can potentially use an index to find the first document in each group if:
    //     $group is preceded by $sort that sorts the field to group by, and
    //     there is an index on the grouped field that matches the sort order, and
    //     $first is the only accumulator in $group. 
    //     => Tests: Indexes only used on first field of the group compound id if only $first is used
    //               Either first stage or suitable sort
    //     => Also index on the $first field will be added by the sort already.

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

    // make sure the only group operator is $first and save for possible index
    const elementDict = stage[operator]
    let firstOpFields = {}
    for (const [key, element] of Object.entries(elementDict)) {
      if (key !== "_id") {
        for (const [groupOp, field] of Object.entries(element)) {
          if (groupOp !== "$first"){
            firstOpFields = {}
            break
          } else {
            firstOpFields[field.replace('$', '')] = 1
          }
        }
      }
    }

    // get aliases to avoid putting them in the index
    let addedFields = this.getAddedFields(aggregation.pipeline.slice(0, order))

    // if no previous order, suggest index on the first id field
    if (!(sequence.slice(0, order).includes('$sort'))){
        // if no previous sort only $first allowed
      if(Object.values(firstOpFields).length>0){
        let groupIdFields = Object.values(elementDict["_id"])
        if (groupIdFields.length < 2) {
          let idField = groupIdFields[0].replace('$', '')
          let indexKey = {}
          indexKey[idField] = 1
          for (const key of Object.keys(firstOpFields)) {
            indexKey[key] = 1          
          }
          indexKey = this.applyAliases(addedFields, indexKey) 
          return new Index(name, indexKey, aggregation.collection, "$group", order, {})
        } else {
          // TODO: check again if a compound index can be used (so far not used)
          return undefined
        }
      } else {
        return undefined
      }
    } else {

      // check if the grouping fields match the sort
      let previousSortDict = aggregation.pipeline[previousSortOrder]["$sort"]    
      let validSortFields = {}
      let i = 0
      for (const groupField of Object.values(elementDict["_id"])) {
        let idField = groupField.replace('$', '')

        if(Object.keys(previousSortDict).length > i) {
          let sortField = Object.keys(previousSortDict)[i]
          if (idField === sortField) {
            validSortFields[sortField] = previousSortDict[sortField]
          } else {
            return undefined
          }
        } else {
          // add the compound index fields if there are no more sort fields
          validSortFields[idField] = 1
        }
        i += 1
      }

      // return fields index: validSortFields (IXscan) plus firstOpFields (COVERAGE)
      for (const key of Object.keys(firstOpFields)) {
        validSortFields[key] = 1
      }

      validSortFields = this.applyAliases(addedFields, validSortFields) 
      return new Index(name, validSortFields, aggregation.collection, "$group", order, {})
    }
  }

  getLookupIndex(operator, stage, order, sequence, aggregation, name) {

    //check wether it has a pipeline or not
    let lookupPipeline = stage[operator]["pipeline"]

    if (lookupPipeline) return this.getPipelineLookupIndex(operator, stage, order, sequence, aggregation, name)
    else return this.getBasicLookupIndex(operator, stage, order, sequence, aggregation, name)
  }

  // Basic lookup (no pipeline)
  getBasicLookupIndex(operator, stage, order, sequence, aggregation, name) {
    let foreignField = stage[operator]["foreignField" ]

    if (foreignField === '_id') {
      return undefined
    }

    let indexKey = {}
    indexKey[foreignField] = 1
    return new Index(name, indexKey, stage[operator]["from"], operator, order, {})
  }

  //TODO LOOKUP WITH PIPELINE: review other pipeline options
  getPipelineLookupIndex(operator, stage, order, sequence, aggregation, name) {
    let foreignCollection = stage[operator]["from"]
    let pipeline = stage[operator]["pipeline"]
    let subOrder = 0
    let indexKey = {}
    for (let subStage of pipeline) {
      const suboperator = util.getAggregationStageOperator(subStage)
      if(suboperator == "$match") {
        const subSequence = pipeline.map(util.getAggregationStageOperator); 
        let subindex = this.getMatchIndex(suboperator, subStage, subOrder, subSequence, new Aggregation(aggregation.name, pipeline, foreignCollection, {}), name)
        if (subindex) {
          for (let key of Object.keys(subindex.key)){
            indexKey[key]= 1
          }
        }
      }
      subOrder += 1
    }
    if (Object.keys(indexKey).length > 0) {
      return new Index(name, indexKey, stage[operator]["from"], operator, order, {})
    } else {
      return undefined
    }
  }

  // get the simple alias for existing database fields that can still be used by an index
  // TODO compound indexes
  parseAlias(alias, reference, previous) {
    if(typeof(reference) == 'string' && reference.startsWith('$')) {
      let field = reference.substring(1)
      let fieldRoot = field.split('.')[0]
      if(previous[field]) {
        previous[alias] = previous[field] 
      } else if (previous[fieldRoot]) {
        previous[alias] = previous[fieldRoot] + reference.substring(fieldRoot.length + 1)
      } else {
        previous[alias] = field 
      }
    } else {
      previous[alias] = undefined
    }
    // console.log(previous)

  }

  // return an alias dictionary to still use some fields
  // BAD haas to replace stages one by one as there can be a mix of project and addFields
  getAddedFields(stages) {
    let addedFields = {}

    for (let stage of stages.filter(s => util.getAggregationStageOperator(s) == '$addFields' || util.getAggregationStageOperator(s) == '$project')) {
      if (util.getAggregationStageOperator(stage) == '$addFields') {
        Object.keys(stage['$addFields']).forEach(f => this.parseAlias(f, stage['$addFields'][f], addedFields))
      } else {
        Object.keys(stage['$project']).forEach(f => { if (stage['$project'][f] != 0 && stage['$project'][f] != 1 ) 
        { this.parseAlias(f, stage['$project'][f], addedFields)}})
      }
    }
    return addedFields
  }

  applyAliases(addedFields, indexKey) {

    Object.keys(addedFields).forEach(function(alias) {
      if (!addedFields[alias] ) {
        for (let key of Object.keys(indexKey)){
          if (key.split('.')[0] === alias) {
            console.log("\t ! Deleting ", alias, 'to', addedFields[alias])
            delete indexKey[key]  
          }
        }
      } else {
        // console.log("\t ! Renaming ", alias, 'to', addedFields[alias])
        let renamedKey = {}
        for (let key of Object.keys(indexKey)){
          if (key.split('.')[0] === alias) {
            renamedKey[key.replace(alias, addedFields[alias], 1)] = indexKey[key]
          } else {
            renamedKey[key] = indexKey[key]
          }
        }
        indexKey = renamedKey
      }
    }) 

  return indexKey
  }
}

module.exports = Generator