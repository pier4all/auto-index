function main() {


  const util = require('./src/util')
  const Generator = require('./src/generator')
  const Combinator = require('./src/combinator')

  //const inputQueries = ["./data/input/queries/datagen"] //process.argv[1]
  // const inputQueries = ["./data/input/queries/custom"] //process.argv[1]
  const inputQueries = [
                        "./data/input/queries/custom",
                        "./data/input/queries/datagen",
                        "./data/input/queries/tpch/s1/point_queries_experiment",
                        "./data/input/queries/tpch/s1/tpch_experiment",
                        "./data/input/queries/tpch/s2/point_queries_experiment",
                        "./data/input/queries/tpch/s2/tpch_experiment",
                        "./data/input/queries/tpch/s3/point_queries_experiment",
                        "./data/input/queries/tpch/s3/tpch_experiment"
                      ] //process.argv[1]

    let queries = []
    console.log()

    for (let inputDir of inputQueries) {
      console.log(" - Reading input directory: " + inputDir)

      const dirQueries = util.getAggregationsFromDir(inputDir, "lineitems")
      console.log("\t * Got " + dirQueries.length + " queries")

      queries = queries.concat(dirQueries)

    }

    console.log(" - Read ", queries.length, " queries\n")

    const generator = new Generator()
    let indexeResult = generator.generate(queries)

    let totalIndexes = 0
    for (const [key, index] of Object.entries(indexeResult)) {
      
      console.log(" - " + key +" (" + indexeResult[key].length + " indexes): ")
      totalIndexes += indexeResult[key].length
      for (let index of indexeResult[key]){
        console.log("\t * ", JSON.stringify(index.toMongoJSON()))
      }

      const combinator = new Combinator()
      let combinedIndexes = combinator.combine(indexeResult[key])
      console.log("\t => Combined: ", combinedIndexes)
    }

    console.log("Total Indexes: ", totalIndexes)
    console.log()

  }
  
  if (require.main === module) {
    main();
  }