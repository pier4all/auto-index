const util = require('../src/util')
const Combinator = require('../src/combinator')
const Cleaner = require('../src/cleaner')

// import tap test
const tap = require('tap')

// data
const index1 = {"name":"test_index1","key":{"name":1},"collection":"test_collection1","operator": '$match', "order": 0, "options":{}} 
const index1a = {"name":"test_index1a","key":{"name":1,"active":1},"collection":"test_collection1","operator": '$match', "order": 1, "options":{}} 
const index1b = {"name":"test_index1b","key":{"name":1,"address":1},"collection":"test_collection1","operator": '$match', "order": 2, "options":{}} 
const index1c = {"name":"test_index1c","key":{"age":1},"collection":"test_collection1","operator": '$match', "order": 3, "options":{}} 
const index1d = {"name":"test_index1d","key":{"age":1},"collection":"test_collection1","operator": '$sort', "order": 4, "options":{}} 
const index1e = {"name":"test_index1e","key":{"name":-1},"collection":"test_collection1","operator": '$sort', "order": 5, "options":{}} 
const index1f = {"name":"test_index1f","key":{"name":1, "address":1},"collection":"test_collection1","operator": '$sort', "order": 6, "options":{}} 

const index2 = {"name":"test_index2","key":{"age":1},"collection":"test_collection2","operator": '$match', "order": 0, "options":{}} 
const index2a = {"name":"test_index2a","key":{"age":1,"salary":1},"collection":"test_collection2","operator": '$match', "order": 1, "options":{}} 
const index2b = {"name":"test_index2b","key":{"custno":1,"salary":1},"collection":"test_collection2","operator": '$match', "order": 02, "options":{}} 
const index2c = {"name":"test_index2c","key":{"custno":1},"collection":"test_collection2","operator": '$lookup', "order": 03, "options":{}} 


tap.test('combine match fields with minimze false returns 3 indexes', async (childTest) => {
  const combinator = new Combinator()
  
  const indexes = [index1, index1c]

  const result = combinator.combine(indexes)

  childTest.equal(result.length, 3)
  childTest.end()
})

tap.test('combine match fields with minimze true returns 1 index', async (childTest) => {
  const combinator = new Combinator(true)
  
  const indexes = [index1, index1c]

  const result = combinator.combine(indexes)
  
  childTest.equal(result.length, 1)
  childTest.end()
})

tap.test('combine sort fields with minimze false returns 3 indexes', async (childTest) => {
  const combinator = new Combinator()
  
  const indexes = [index1d, index1e]

  const result = combinator.combine(indexes)

  childTest.equal(result.length, 1)
  childTest.end()
})

tap.test('combine match fields with minimze true returns 1 index', async (childTest) => {
  const combinator = new Combinator(true)
  
  const indexes = [index1, index1c]

  const result = combinator.combine(indexes)
  
  childTest.equal(result.length, 1)
  childTest.end()
})

tap.test('combine match and sort indexes with minimze false returns 3 unique index', async (childTest) => {
  const combinator = new Combinator()
  
  const indexes = [index1, index1d]

  const result = combinator.combine(indexes)
  
  childTest.equal(result.length, 5)

  const cleaner = new Cleaner()
  const cleanResult = cleaner.clean(result)
  childTest.equal(cleanResult.length, 3)
  
  childTest.end()
})

tap.test('combine match and sort indexes with minimze true returns 1 index', async (childTest) => {
  const combinator = new Combinator(true)
  
  const indexes = [index1, index1d]

  const result = combinator.combine(indexes)

  childTest.equal(result.length, 1)
  childTest.end()
})

tap.test('combine match and sort indexes with minimze true returns 2 indexes', async (childTest) => {
  const combinator = new Combinator(true)
  
  const indexes = [index1, index1a, index1b, index1c, index1e, index1f]

  const result = combinator.combine(indexes)

  childTest.equal(result.length, 2)
  childTest.end()
})

tap.test('combine match and lookup indexes with minimze true returns 2 indexes', async (childTest) => {
  const combinator = new Combinator(true)
  
  const indexes = [index2b, index2c]

  const result = combinator.combine(indexes)

  childTest.equal(result.length, 2)
  childTest.end()
})

tap.test('combine match and lookup indexes with minimze false returns 3 indexes', async (childTest) => {
  const combinator = new Combinator()
  
  const indexes = [index2b, index2c]

  const result = combinator.combine(indexes)

  childTest.equal(result.length, 3)
  childTest.end()
})


tap.test('combine match, sort and group indexes with minimze true returns 2 indexes', async (childTest) => {
  const combinator = new Combinator(true)
  
  const indexes = [
     {name: 'custom-02_figures_match_0', key: { color: 1 }, collection: 'figures', operator: '$match', order: 0, options: {} },
     {name: 'custom-02_figures_sort_1', key: { shape: 1, size: 1, color: -1 }, collection: 'figures', operator: '$sort', order: 1, options: {} },
     {name: 'custom-02_figures_group_2', key: { shape: 1, size: 1 }, collection: 'figures', operator: '$group', order: 2, options: {}}
  ]

  const result = combinator.combine(indexes)

  childTest.equal(result.length, 2)
  childTest.end()
})

tap.test('combine match, sort and group indexes with minimze false returns 6 indexes', async (childTest) => {
  const combinator = new Combinator(false)
  
  const indexes = [
     {name: 'custom-02_figures_match_0', key: { color: 1 }, collection: 'figures', operator: '$match', order: 0, options: {} },
     {name: 'custom-02_figures_sort_1', key: { shape: 1, size: 1, color: -1 }, collection: 'figures', operator: '$sort', order: 1, options: {} },
     {name: 'custom-02_figures_group_2', key: { shape: 1, size: 1 }, collection: 'figures', operator: '$group', order: 2, options: {}}
  ]

  const result = combinator.combine(indexes)

  childTest.equal(result.length, 6)
  childTest.end()
})

// test cleanup
tap.teardown(async function() { 

})
  