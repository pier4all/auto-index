const util = require('../src/util')

// import tap test
const tap = require('tap')

// data
const inputDir = "./test/data"

// test initialization
tap.before(async function() { 

})

tap.test('get aggregations from directory', async (childTest) => {
  const defaultCollection  = "default_collection"
  const aggregations = util.getAggregationsFromDir(inputDir, defaultCollection)

  let aggregationDefaultCollection = aggregations.find(element => element.name === "test-aggregation-no-coll");
  let aggregationWithCollection = aggregations.find(element => element.name === "test-aggregation-from-file");
  
  childTest.equal(aggregations.length, 2)
  childTest.equal(aggregationDefaultCollection.collection, defaultCollection)
  childTest.equal(aggregationWithCollection.collection, "test_collection")
  childTest.end()
})

tap.test('get aggregations from directory without default collection', async (childTest) => {
  const aggregations = util.getAggregationsFromDir(inputDir)

  let aggregationDefaultCollection = aggregations.find(element => element.name === "test-aggregation-no-coll");
  let aggregationWithCollection = aggregations.find(element => element.name === "test-aggregation-from-file");

  childTest.equal(aggregationDefaultCollection.collection, undefined)
  childTest.equal(aggregationWithCollection.collection, "test_collection")
  childTest.equal(aggregations.length, 2)
  childTest.end()
})

tap.test('get aggregationstage operator', async (childTest) => {
  const stage = {"$match": {"name": "Fran"}, "bad_element": "bad"}
  const operator = util.getAggregationStageOperator(stage)

  childTest.equal(operator, "$match")
  childTest.end()
})

// test cleanup
tap.teardown(async function() { 

})
  