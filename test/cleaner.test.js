const util = require('../src/util')
const Cleaner = require('../src/cleaner')

// import tap test
const tap = require('tap')

// data
const index1 = {"name":"test_index1","key":{"name":1},"collection":"test_collection1","operator": '$match', "order": 0, "options":{}} 
const index1a = {"name":"test_index1a","key":{"name":1,"active":1},"collection":"test_collection1","operator": '$match', "order": 0, "options":{}} 
const index1b = {"name":"test_index1b","key":{"name":1,"address":1},"collection":"test_collection1","operator": '$match', "order": 0, "options":{}} 

const index2 = {"name":"test_index2","key":{"name":1},"collection":"test_collection2","operator": '$match', "order": 0, "options":{}} 
const index2a = {"name":"test_index2a","key":{"name":1,"active":1},"collection":"test_collection2","operator": '$match', "order": 0, "options":{}} 
const index2b = {"name":"test_index2b","key":{"name":1,"address":1},"collection":"test_collection2","operator": '$match', "order": 0, "options":{}} 
const index2c = {"name":"test_index2c","key":{"_id":1,"address":1},"collection":"test_collection2","operator": '$match', "order": 0, "options":{}} 

tap.test('check index redundancy against empty index list returns false', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = []

  const result = cleaner.isRedundantKey(index1, indexes)
  childTest.equal(result, false)
  childTest.end()
})

tap.test('check index redundancy against redundant index list returns true', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = [index1a]

  const result = cleaner.isRedundantKey(index1, indexes)
  childTest.equal(result, true)
  childTest.end()
})

tap.test('check index redundancy against shorter key index in list returns false', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = [index1, index2a]

  const result = cleaner.isRedundantKey(index1a, indexes)
  childTest.equal(result, false)
  childTest.end()
})

tap.test('check index redundancy against different key index in list returns false', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = [index1, index1a]

  const result = cleaner.isRedundantKey(index1b, indexes)
  childTest.equal(result, false)
  childTest.end()
})

tap.test('check index duplicate against different key index in list returns false', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = [index1, index1a]

  const result = cleaner.isDuplicateKey(index1b, indexes)
  childTest.equal(result, false)
  childTest.end()
})

tap.test('check index duplicate against redundant index list returns false', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = [index1a]

  const result = cleaner.isDuplicateKey(index1, indexes)
  childTest.equal(result, false)
  childTest.end()
})

tap.test('check index duplicate against duplicate index list returns true', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = [index1a, index1]

  const result = cleaner.isDuplicateKey(index1, indexes)
  childTest.equal(result, true)
  childTest.end()
})

tap.test('only duplicate indexes are cleaned if minimize is false', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = [index1, index1a, index1, index2b, index2, index2b]

  const result = cleaner.clean(indexes)
  childTest.equal(result.length, 4)

  childTest.end()
})

tap.test('redundant indexes are cleaned if minimize is true and collections are not mixed', async (childTest) => {
  const cleaner = new Cleaner(true)
  
  const indexes = [index1b, index1, index1a, index2b, index2, index2, index1a]

  const result = cleaner.clean(indexes)
  childTest.equal(result.length, 3)
  childTest.end()
})

tap.test('test if isIdIndex returns true for an index containing _id ', async (childTest) => {
  const cleaner = new Cleaner()
  
  const result = cleaner.isIdIndex(index2c)
  childTest.equal(result, true)
  childTest.end()
})

tap.test('test if isIdIndex returns false for an index not containing _id ', async (childTest) => {
  const cleaner = new Cleaner()
  
  const result = cleaner.isIdIndex(index1b)
  childTest.equal(result, false)
  childTest.end()
})

tap.test('test if the index containing _id is cleaned out from the set', async (childTest) => {
  const cleaner = new Cleaner()
  
  const indexes = [index2, index2a, index2b, index2c]

  const result = cleaner.clean(indexes)
  childTest.equal(result.length, 3)
  childTest.equal(result.map(i => i.name).includes('test_index2c'), false)
  
  childTest.end()
})

// test cleanup
tap.teardown(async function() { 

})
  