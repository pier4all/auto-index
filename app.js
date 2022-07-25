function main() {

  const util = require('./src/util')
  const Generator = require('./src/generator')
  const Combinator = require('./src/combinator')
  const Cleaner = require('./src/cleaner')

  let minimize = true
  console.log('minimize', minimize)

  // const inputQueries = ["./data/input/pipelines/datagen"] //process.argv[1]
  // const inputQueries = ["./data/input/pipelines/custom"] //process.argv[1]
  const inputQueries = [
                        "./data/input/queries/custom",
                        // "./data/input/pipelines/custom",
                        // "./data/input/pipelines/datagen",
                        // "./data/input/pipelines/tpch/s1/point_queries_experiment",
                        // "./data/input/pipelines/tpch/s1/tpch_experiment",
                        // "./data/input/pipelines/tpch/s2/point_queries_experiment",
                        // "./data/input/pipelines/tpch/s2/tpch_experiment",
                        // "./data/input/pipelines/tpch/s3/point_queries_experiment",
                        // "./data/input/pipelines/tpch/s3/tpch_experiment",
                        // "./data/input/pipelines/tpch_udo/s1/point_queries_experiment",
                        // "./data/input/pipelines/tpch_udo/s2/point_queries_experiment",
                        // "./data/input/pipelines/tpch_udo/s3/point_queries_experiment",
                        // "./data/input/pipelines/tpch_udo/s1/tpch_experiment",
                        // "./data/input/pipelines/tpch_udo/s2/tpch_experiment",
                        // "./data/input/pipelines/tpch_udo/s3/tpch_experiment",
                        // "./data/input/pipelines/hr/normalized",
                        // "./data/input/pipelines/hr/denormalized"
                      ] //process.argv[1]

    let queries = []
    console.log()

    for (let inputDir of inputQueries) {
      console.log(" - Reading input directory: " + inputDir)

      // TODO: add the collection to al input files and remove the default collection parameter
      const dirQueries = util.getAggregationsFromDir(inputDir, "lineitems")
      console.log("\t * Got " + dirQueries.length + " queries")

      queries = queries.concat(dirQueries)

    }
    console.log(queries[0].pipeline)

    console.log(" - Read ", queries.length, " queries\n")

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

  }
  
  if (require.main === module) {
    main();
  }