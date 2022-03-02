const Aggregation = require('../src/aggregation')

// import tap test
const tap = require('tap')

// data
const jsonVoid = '{ }'
const jsonOne = '{ "aggregate": "test1", "collection": "test_collection", "pipeline": [{"$match": {"field": 5}}], "allowDiskUse":true}'

// test initialization
tap.before(async function() { 

})

tap.test('create an aggregation object from json string', async (childTest) => {
    const aggOne = Aggregation.fromJSON(jsonOne)
  
    childTest.equal(aggOne.name, "test1")
    childTest.equal(aggOne.collection, "test_collection")
    childTest.equal(aggOne.pipeline.length, 1)
    childTest.equal(aggOne.options.allowDiskUse, true)
  
    childTest.end()
})
  
tap.test('create an aggregation object from file', async (childTest) => {
  const aggFileOne = Aggregation.fromFile("./test/data/test_aggregation_1.json")

  childTest.equal(aggFileOne.name, "test-aggregation-from-file")
  childTest.equal(aggFileOne.collection, "test_collection")
  childTest.equal(aggFileOne.pipeline.length, 1)
  childTest.equal(aggFileOne.options.allowDiskUse, true)

  childTest.end()
})

tap.test('create an aggregation object from empty json', async (childTest) => {
  const aggFileOne = Aggregation.fromJSON(jsonVoid)

  childTest.equal(aggFileOne.name, "")
  childTest.equal(aggFileOne.collection, undefined)
  childTest.equal(aggFileOne.pipeline.length, 0)

  childTest.end()
})

  // test cleanup
  tap.teardown(async function() { 

  })
  