function main() {


  const util = require('./src/util')
  const Generator = require('./src/generator')

  //const inputQueries = ["./data/input/queries/datagen"] //process.argv[1]
  const inputQueries = [
                        "./data/input/queries/datagen",
                        "./data/input/queries/tcph/s1/point_queries_experiment",
                        "./data/input/queries/tcph/s1/tpch_experiment",
                        "./data/input/queries/tcph/s2/point_queries_experiment",
                        "./data/input/queries/tcph/s2/tpch_experiment",
                        "./data/input/queries/tcph/s3/point_queries_experiment",
                        "./data/input/queries/tcph/s3/tpch_experiment",] //process.argv[1]

    let queries = []
    console.log()

    for (let inputDir of inputQueries) {
      console.log(" - Reading input directory: " + inputDir)

      const dirQueries = util.getAggregationsFromDir(inputDir, "lineitems")
      console.log("\t * Got " + dirQueries.length + " queries")

      queries = queries.concat(dirQueries)

    }

    console.log(" - Read " + queries.length + " queries")

    const generator = new Generator()
    let indexes = generator.generateIndexes(queries)

    console.log(" - Generated " + indexes.length + " indexes: ")

    for (let index of indexes){
      console.log(JSON.stringify(index.toMongoJSON()))
    }

    console.log()

  }
  
  if (require.main === module) {
    main();
  }