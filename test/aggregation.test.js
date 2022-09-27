const Aggregation = require('../src/aggregation')

// import tap test
const tap = require('tap')

// data
const jsonVoid = '{ }'
const jsonOne = '{ "aggregate": "test1", "collection": "test_collection", "pipeline": [{"$match": {"field": 5}}], "allowDiskUse":true}'
const jsonTwo = '{ "aggregate": "test2", "collection": "test_collection", "pipeline": [{"$match": {"shipdate": { "$gt": "ISODate(\'1992-01-02\')" }}}], "allowDiskUse":true}'
const jsonThree = '{ "aggregate": "test3", "collection": "test_collection", "pipeline": [{"$match": {"shipdate": { "$gt": "ISODate(\'992/301/502\')" }, "test": 7, "other_field": "not a date"}}, {"$match": {"field": 5}}], "allowDiskUse":true}'


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
  
tap.test('create an aggregation object from json string including a ISODate', async (childTest) => {
  const aggTwo = Aggregation.fromJSON(jsonTwo)

  childTest.equal(aggTwo.name, "test2")
  childTest.equal(aggTwo.collection, "test_collection")
  childTest.equal(JSON.stringify(aggTwo.pipeline[0]["$match"]["shipdate"]["$gt"]), '"1992-01-02T00:00:00.000Z"')
  childTest.equal(aggTwo.pipeline.length, 1)
  childTest.equal(aggTwo.options.allowDiskUse, true)

  childTest.end()
})

tap.test('create an aggregation object from json string including a bad formatted ISODate', async (childTest) => {
  const aggThree = Aggregation.fromJSON(jsonThree)

  childTest.equal(aggThree.name, "test3")
  childTest.equal(aggThree.collection, "test_collection")
  childTest.equal(JSON.stringify(aggThree.pipeline[0]["$match"]["shipdate"]["$gt"]), "\"ISODate('992/301/502')\"")
  childTest.equal(aggThree.pipeline.length, 2)
  childTest.equal(aggThree.options.allowDiskUse, true)

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
  