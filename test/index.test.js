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
  const indexOne = new Index("idx_lineitem_a", key, "lineitem", options) 
  
    childTest.equal(JSON.stringify(indexOne.toMongoJSON()), JSON.stringify(jsonOne))
  
    childTest.end()
})

tap.test('export an empty index to json string', async (childTest) => {

  const indexBlank = new Index() 
  
    childTest.equal(JSON.stringify(indexBlank.toMongoJSON()), JSON.stringify(jsonBlank))
  
    childTest.end()
})


  // test cleanup
  tap.teardown(async function() { 

  })
  