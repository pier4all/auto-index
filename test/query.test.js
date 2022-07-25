const Aggregation = require('../src/aggregation')
const Query = require('../src/query')

// import tap test
const tap = require('tap')

// data
const jsonVoid = '{ }'
const jsonOne = '{"name":"test-query-01","query":{"color":"red","round":false},"sort":{"shape":1,"size":1},"project":{"_id":0},"collection":"test_collection","allowDiskUse":true,"maxTimeMS":0,"cursor":{}}'

// test initialization
tap.before(async function() { 

})

tap.test('create an query object from json string', async (childTest) => {
    const queryOne = Query.fromJSON(jsonOne)
  
    childTest.equal(queryOne.name, "test-query-01")
    childTest.equal(queryOne.collection, "test_collection")
    childTest.equal(queryOne.query.color, "red")
    childTest.equal(queryOne.sort.shape, 1)
    childTest.equal(queryOne.project._id, 0)
    childTest.equal(queryOne.options.allowDiskUse, true)
  
    childTest.end()
})
  
tap.test('create a query object from file', async (childTest) => {
  const queryFileOne = Query.fromFile("./test/data/test_query_1.json")

  childTest.equal(queryFileOne.name, "test-query-01")
  childTest.equal(queryFileOne.collection, "figures")
  childTest.equal(queryFileOne.query.round, false)
  childTest.equal(queryFileOne.sort.shape, 1)
  childTest.equal(queryFileOne.options.maxTimeMS, 0)

  childTest.end()
})

tap.test('create a query object from empty json', async (childTest) => {
  const queryEmpty = Query.fromJSON(jsonVoid)

  childTest.equal(queryEmpty.name, "")
  childTest.equal(queryEmpty.collection, undefined)
  childTest.equal(Query.isEmptyObject(queryEmpty.query), true)
  childTest.equal(Query.isEmptyObject(queryEmpty.sort), true)
  childTest.equal(Query.isEmptyObject(queryEmpty.project), true)

  childTest.end()
})

tap.test('convert a query object to an aggregation', async (childTest) => {
  const aggFromQueryOne = Query.fromJSON(jsonOne).toAggregation()

  childTest.equal(aggFromQueryOne.name, "test-query-01")
  childTest.equal(aggFromQueryOne.collection, "test_collection")
  childTest.equal(aggFromQueryOne.pipeline.length, 3)
  childTest.equal(aggFromQueryOne.options.allowDiskUse, true)

  childTest.end()
})

tap.test('convert aen empty query object to an aggregation', async (childTest) => {
  const aggFromQueryEmpty = Query.fromJSON(jsonVoid).toAggregation()

  childTest.equal(aggFromQueryEmpty.pipeline.length, 0)

  childTest.end()
})

  // test cleanup
  tap.teardown(async function() { 

  })
  