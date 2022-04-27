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
  
  childTest.equal(aggregations.length, 3)
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
  childTest.equal(aggregations.length, 3)
  childTest.end()
})

tap.test('get aggregationstage operator', async (childTest) => {
  const stage = {"$match": {"name": "Fran"}, "bad_element": "bad"}
  const operator = util.getAggregationStageOperator(stage)

  childTest.equal(operator, "$match")
  childTest.end()
})

tap.test('remove existing object from array by matching key-value pair', async (childTest) => {
  const object_array = [
     {"key":{"color":1},"name":"custom-01_figures_match_0"},
     {"key":{"shape":1},"name":"custom-02_figures_sort_1"},
     {"key":{"size":1},"name":"custom-03_figures_sort_2"},
     {"key":{"round":1},"name":"custom-04_figures_match_3"}
  ]
  const key2delete = "name"
  const value2delete = "custom-03_figures_sort_2"
  const new_array = util.removeIndexFromArray(object_array, key2delete, value2delete)
  childTest.equal(object_array.length-1, new_array.length)
  childTest.end()
})

tap.test('remove non-existing object from array by matching key-value pair', async (childTest) => {
  const object_array = [
    {"key":{"color":1},"name":"custom-01_figures_match_0"},
    {"key":{"shape":1},"name":"custom-02_figures_sort_1"},
    {"key":{"round":1},"name":"custom-04_figures_match_3"}
 ]
  const key2delete = "name"
  const value2delete = "custom-03_figures_sort_2"
  const new_array = util.removeIndexFromArray(object_array, key2delete, value2delete)
  childTest.equal(object_array.length, new_array.length)
  childTest.end()
})

// test cleanup
tap.teardown(async function() { 

})
  