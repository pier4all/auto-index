const Aggregation = require('../src/aggregation')
const util = require('../src/util')
const Generator = require('../src/generator')

// import tap test
const tap = require('tap')

// data
const jsonAgg1 = '{ "aggregate": "test1", "collection": "test_collection", "pipeline": [{"$match": {"age": 35}}, {"$sort": {"salary": 1}}], "allowDiskUse":true}'
const jsonAgg2 = '{ "aggregate": "test2", "collection": "test_collection", "pipeline": [{"$match": {"name": "Karl", "active": false, "$unknown_op": 0}}], "allowDiskUse":true}'
const jsonAggNoIndex = '{ "aggregate": "test_no_index1", "collection": "test_collection", "pipeline": [{"$unwind": "$adresses"}, {"$match": {"zip": 16543}}], "allowDiskUse":true}'
const jsonAggNoIndex2 = '{ "aggregate": "test_no_index2", "collection": "test_collection", "pipeline": [{"$sort": {"salary": {"$unknown_op": 0}}}, {"$sort": {"$unknown_op": 0}}, {"$match": {"$unknown_op": 0}}], "allowDiskUse":true}'
const jsonAggLogic = '{ "aggregate": "test_logic", "collection": "test_collection", "pipeline": [{"$sort": {"salary": 1}}, {"$match": {"$or": [{"age": 30}, {"$and": [{"age": 35}, {"vip": true}, {"$or": [{"$unknown_op": 3}]}]}, {"$unknown_op": {}}]}}]}'
const jsonAggSort = '{ "aggregate": "test_sort1", "collection": "test_collection", "pipeline": [{"$sort": {"salary": -1}}, {"$group": {"_id": { "x" : "$x" },"y": { "$first" : "$y" }}}, {"$sort": {"age": 1}}]}'
const jsonAggGroup1 = '{ "aggregate": "test_group1", "collection": "test_collection", "pipeline": [{"$group": {"_id": { "x" : "$x" },"y": { "$first" : "$y" }}}, {"$group": {"_id": { "z" : "$z" },"k": { "$first" : "$k" }}}]}'
const jsonAggGroup2 = '{ "aggregate": "test_group2", "collection": "test_collection", "pipeline": [{"$match": {"z": 35}}, {"$sort": { "x" : 1, "y": 1}}, {"$group": {"_id": { "x" : "$x" },"y": { "$first" : "$y" }}}]}'
const jsonAggGroup3 = '{ "aggregate": "test_group3", "collection": "test_collection", "pipeline": [{"$unwind": "$t"}, {"$sort": { "x" : 1, "y": 1}}, {"$group": {"_id": { "x" : "$x" },"y": { "$first" : "$y" }}}]}'
const jsonAggGroup4 = '{ "aggregate": "test_group4", "collection": "test_collection", "pipeline": [{"$sort": { "x" : 1, "y": 1}}, {"$group": {"_id": { "x" : "$x", "z": "$z" },"y": { "$first" : "$y" }}}]}'


// test initialization
tap.before(async function() { 

})

tap.test('generate indexes for aggregation list', async (childTest) => {
  const aggOne = Aggregation.fromJSON(jsonAgg1)
  const aggTwo = Aggregation.fromJSON(jsonAgg2)
  const aggNoIndex = Aggregation.fromJSON(jsonAggNoIndex)
  const aggNoIndex2 = Aggregation.fromJSON(jsonAggNoIndex2)
  
  const generator = new Generator()

  const result = generator.generate([aggOne, aggTwo, aggNoIndex, aggNoIndex2])

  childTest.equal(result["test1"].length, 2)
  childTest.equal(result["test2"].length, 1)
  childTest.equal(result["test_no_index1"].length, 0)
  childTest.equal(result["test_no_index2"].length, 0)

  childTest.end()
})

tap.test('generate indexes for match stage', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAgg2)
  const matchStage = aggregation.pipeline[0]
  const sequence = aggregation.pipeline.map(util.getAggregationStageOperator)
  
  const generator = new Generator()

  const index = generator.getMatchIndex("$match", matchStage, 0, sequence, aggregation, "test_index")

  const expectedIndex = {"name":"test_index","key":{"name":1,"active":1},"collection":"test_collection","operator": '$match', "order": 0, "options":{}} 
  childTest.equal(JSON.stringify(index), JSON.stringify(expectedIndex))

  childTest.end()
})

tap.test('generate indexes for not applicable match stage', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAggNoIndex)
  const matchStage = aggregation.pipeline[1]
  const sequence = aggregation.pipeline.map(util.getAggregationStageOperator)
  
  const generator = new Generator()

  const index = generator.getMatchIndex("$match", matchStage, 1, sequence, aggregation, "test_index")

  childTest.equal(index, undefined)
  childTest.end()
})

tap.test('generate indexes for match stage with logic operations', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAggLogic)
  const matchStage = aggregation.pipeline[1]
  const sequence = aggregation.pipeline.map(util.getAggregationStageOperator)
  
  const generator = new Generator()

  const index = generator.getMatchIndex("$match", matchStage, 1, sequence, aggregation, "test_index_logic")

  const expectedIndex = {"name":"test_index_logic","key":{"age": 1, "vip": 1},"collection":"test_collection","operator": '$match', "order": 1,"options":{}} 

  childTest.equal(JSON.stringify(index), JSON.stringify(expectedIndex))
  childTest.end()
})

tap.test('generate index for valid sort stage', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAggSort)
  const order = 0
  const stage = aggregation.pipeline[order]
  const sequence = aggregation.pipeline.map(util.getAggregationStageOperator)
  
  const generator = new Generator()

  const index = generator.getSortIndex("$sort", stage, order, sequence, aggregation, "test_index")

  const expectedIndex = {"name":"test_index", "key":{"salary": -1}, "collection":"test_collection","operator": '$sort', "order":order, "options":{}} 

  childTest.equal(JSON.stringify(index), JSON.stringify(expectedIndex))
  childTest.end()
})

tap.test('generate no index for sort stage after group', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAggSort)
  const order = 2
  const stage = aggregation.pipeline[order]
  const sequence = aggregation.pipeline.map(util.getAggregationStageOperator)
  
  const generator = new Generator()

  const index = generator.getSortIndex("$sort", stage, order, sequence, aggregation, "test_index")

  childTest.equal(index, undefined)
  childTest.end()
})

tap.test('generate no index for group stages with no previous sort', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAggGroup1)
   
  const generator = new Generator()

  const indexes = generator.generateIndexes(aggregation)

  childTest.equal(indexes.length, 0)
  childTest.end()
})

tap.test('generate index for group stage with previous suitable sort', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAggGroup2)
  const order = 2
  const stage = aggregation.pipeline[order]
  const sequence = aggregation.pipeline.map(util.getAggregationStageOperator)
  
  const generator = new Generator()

  const index = generator.getGroupIndex("$group", stage, order, sequence, aggregation, "test_index")

  const expectedIndex = {"name":"test_index", "key":{"x": 1, "y": 1}, "collection":"test_collection", "operator": '$group', "order": order, "options":{}} 

  childTest.equal(JSON.stringify(index), JSON.stringify(expectedIndex))
  childTest.end()
})

tap.test('generate no index for group stages with previous unwind', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAggGroup3)
   
  const generator = new Generator()

  const indexes = generator.generateIndexes(aggregation)

  childTest.equal(indexes.length, 0)
  childTest.end()
})

tap.test('generate no index for group stages with no suitable previous sort', async (childTest) => {
  const aggregation = Aggregation.fromJSON(jsonAggGroup4)
   
  const generator = new Generator()

  const indexes = generator.generateIndexes(aggregation)

  childTest.equal(indexes.length, 0)
  childTest.end()
})


// test cleanup
tap.teardown(async function() { 

})
  