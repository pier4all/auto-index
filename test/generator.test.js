const Aggregation = require('../src/aggregation')
const util = require('../src/util')
const Generator = require('../src/generator')

// import tap test
const tap = require('tap')

// data
const jsonAgg1 = '{ "aggregate": "test1", "collection": "test_collection", "pipeline": [{"$match": {"age": 35}}], "allowDiskUse":true}'
const jsonAgg2 = '{ "aggregate": "test2", "collection": "test_collection", "pipeline": [{"$match": {"name": "Karl", "active": false, "$unknown_op": 0}}], "allowDiskUse":true}'
const jsonAggNoIndex = '{ "aggregate": "test_no_index", "collection": "test_collection", "pipeline": [{"$unwind": "$adresses"}, {"$match": {"zip": 16543}}], "allowDiskUse":true}'
const jsonAggLogic = '{ "aggregate": "test3", "collection": "test_collection", "pipeline": [{"$sort": {"salary": 1}}, {"$match": {"$or": [{"age": 30}, {"$and": [{"age": 35}, {"vip": true}, {"$or": [{"$unknown_op": 3}]}]}, {"$unknown_op": {}}]}}]}'

// test initialization
tap.before(async function() { 

})

tap.test('generate indexes for aggregation list', async (childTest) => {
  const aggOne = Aggregation.fromJSON(jsonAgg1)
  const aggTwo = Aggregation.fromJSON(jsonAgg2)
  const aggNoIndex = Aggregation.fromJSON(jsonAggNoIndex)
  
  const generator = new Generator()

  const indexes = generator.generateIndexes([aggOne, aggTwo, aggNoIndex])
  childTest.equal(indexes.length, 2)

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

  const index = generator.getMatchIndex("$match", matchStage, 1, sequence, aggregation, "test_index")

  const expectedIndex = {"name":"test_index","key":{"age": 1, "vip": 1},"collection":"test_collection","operator": '$match', "order": 1,"options":{}} 

  childTest.equal(JSON.stringify(index), JSON.stringify(expectedIndex))
  childTest.end()
})

// test cleanup
tap.teardown(async function() { 

})
  