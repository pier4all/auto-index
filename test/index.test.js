const Index = require('../src/index')

// import tap test
const tap = require('tap')

// data
const jsonOne = { "createIndexes": "lineitem", "indexes": [ { "key": { "l_shipdate": 1, "l_discount": 1, "l_quantity": 1 }, "name": "idx_lineitem_a", "unique": false } ] }
const jsonBlank = { "createIndexes": "", "indexes": [ { "key": { }, "name": "" } ] }

// test initialization
tap.before(async function() { 

})

tap.test('export an index to json string', async (childTest) => {
  const key = { "l_shipdate": 1, "l_discount": 1, "l_quantity": 1 }
  const options = { "unique": false }
  const indexOne = new Index("idx_lineitem_a", key, "lineitem", '$match', 5, options) 
  
  childTest.equal(JSON.stringify(indexOne.toMongoJSON()), JSON.stringify(jsonOne))
  childTest.equal(indexOne.operator, '$match')
  childTest.equal(indexOne.order, 5)
  
  childTest.end()
})

tap.test('export an empty index to json string', async (childTest) => {

    const indexBlank = new Index() 
  
    childTest.equal(JSON.stringify(indexBlank.toMongoJSON()), JSON.stringify(jsonBlank))
    childTest.equal(indexBlank.operator, '')
    childTest.equal(indexBlank.order, 0)
    childTest.end()
})

tap.test('create an empty index from a json string', async (childTest) => {

  const indexBlank = Index.fromJSON("{}") 

  childTest.equal(JSON.stringify(indexBlank.toMongoJSON()), JSON.stringify(jsonBlank))
  childTest.equal(indexBlank.operator, '')
  childTest.equal(indexBlank.order, 0)
  childTest.end()
})

tap.test('create an empty index from a json string', async (childTest) => {

  const indexString = JSON.stringify({"name":"test_index2","key":{"name":1},"collection":"test_collection2","operator": '$match', "order": 0, "options":{}})
  const indexFromJson = Index.fromJSON(indexString) 

  childTest.equal(JSON.stringify(indexFromJson), indexString)
  childTest.end()
})

// test cleanup
tap.teardown(async function() { 

})
  