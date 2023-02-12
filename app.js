

async function main() {
  require('dotenv').config();

  console.log("DB_URI", process.env.DB_URI)

  const { readFile } = require('./src/checker/util_checker')
  const { checkIndexes } = require('./src/checker/checker');

  const util = require('mongodb-auto-index/source/util')
  const Generator = require('mongodb-auto-index/source/generator')
  const Combinator = require('mongodb-auto-index/source/combinator')
  const Cleaner = require('mongodb-auto-index/source/cleaner')
  const path = require('path');

  // options
  let minimize = false
  console.log('minimize', minimize)

  let doGenerate = true
  console.log('doGenerate', doGenerate)

  let doCheck = true
  console.log('doCheck', doCheck)

  const inputQueries = process.argv.slice(2)

  const outputDirectory = process.env.OUTPUT;

  let queries = []
  console.log()

  for (let inputDir of inputQueries) {
    console.log(" - Reading input directory: " + inputDir)

    // TODO: add the collection to al input files and remove the default collection parameter
    const dirQueries = util.getAggregationsFromDir(inputDir, "default")
    console.log("\t * Got " + dirQueries.length + " queries")

    queries = queries.concat(dirQueries)

  }
  // console.log(queries[0].pipeline)

  console.log(" - Read ", queries.length, " queries\n")

  if (!doGenerate) {

    const inputIndexesPath = "./data/input/indexes/index_udo.json"
    const indexes = readFile(path.join(__dirname, inputIndexesPath) )
    await checkIndexes(queries, indexes)

  } else {
 
    const generator = new Generator()
    let indexeResult = generator.generate(queries)

    let totalStepIndexes = 0
    let combinedIndexes = []
    
    for (const [key, index] of Object.entries(indexeResult)) {
      
      console.log(" - " + key +" (" + indexeResult[key].length + " indexes): ")
      totalStepIndexes += indexeResult[key].length
      for (let index of indexeResult[key]){
        console.log("\t * ", JSON.stringify(index.toMongoJSON()))
      }

      const combinator = new Combinator(minimize)
      let aggregationIndexes = combinator.combine(indexeResult[key])
      combinedIndexes = combinedIndexes.concat(aggregationIndexes)
      console.log("\t => Combined: ", aggregationIndexes.map(i => i.key))
    }

    const cleaner = new Cleaner(minimize)
    let allIndexes = cleaner.clean(combinedIndexes)

    console.log("\t => Cleaned: ", allIndexes.map(i => i.collection + ' ' + JSON.stringify(i.key)))

    console.log("Total Step Indexes: ", totalStepIndexes)
    console.log("Total Combined Indexes: ", combinedIndexes.length)
    console.log("Total Final Indexes: ", allIndexes.length)
    console.log()

    let indexResults = util.writeIndexResults(allIndexes, outputDirectory)
    // console.log(indexResults)

    if (doCheck) {
      await checkIndexes(queries, indexResults)
    }
  }
}

if (require.main === module) {
  main();
}