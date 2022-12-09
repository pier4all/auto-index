
exports.checkIndexes = async (queries, indexes, checked_combinations = [], index_summary = {}) => {

    const db_uri = process.env.DB_URI;
    const db_name = process.env.DB_NAME;
    const {MongoClient} = require('mongodb');
    const client = new MongoClient(db_uri, {useUnifiedTopology: true});
    const {ObjectId} = require('mongodb');
    const utils = require('./util_checker.js');
    const index = require('./indexhandler.js');

    const checkPerformance = true

    //Connect to MongoDB Database
    try {
        // initilize summary
        for (const id of indexes) { 
            index_summary[id["indexes"][0]["name"]] = index_summary[id["indexes"][0]["name"]] || {"explain": false, "index_stats": false}
        }

        // connect
        await client.connect();
        console.log("* Connected to DB: ", db_name);
        const db = client.db(db_name);
        const dbAdmin = client.db("admin");

        //Drop previous indexes
       await index.deleteAll(db);

        //Run queries
        for (const query of queries) {
            let aggregation_name = query["name"];

            console.log('\n\n * Checking query', aggregation_name)

            //Create one index
            for (const id of indexes) {
                if (checked_combinations.includes(id["indexes"][0]["name"] + aggregation_name)) {
                    continue
                }
                // just in case delete all indexes
                await index.deleteAll(db);

                // create index
                const index_name = id["indexes"][0]["name"];
                const index_key = id["indexes"][0]["key"];
                console.log('\n - Creating index', index_name)
                await index.createOne(db, id);

                const query_collection = db.collection(query["collection"]);
                const index_collection = db.collection(id["createIndexes"]);
                const pipeline = query["pipeline"];
                pipeline.push({'$limit': 10})


                 //Explain
                console.log('   Checking explain ...')
                const exp_start = process.hrtime();
                const exp = await explainQuery(query_collection, pipeline);
                const exp_duration = utils.logTimer(exp_start);
                const exp_usage = await parseExplain(exp, index_name);
                console.log('\t ... explain result:', exp_usage)
                // console.log("Explain: ", JSON.stringify(exp, null, 2));

                // PAUSE
                await new Promise(resolve => setTimeout(resolve, 1000));

                console.log('   Checking stats ...')
                const id_start = process.hrtime();
                const query_res = await query_collection.aggregate(pipeline).toArray();
                const index_stats = await index_collection.aggregate([{'$indexStats':{}}]).toArray();
                const id_duration = utils.logTimer(id_start);
                let index_usage = await parseIndexStats(index_stats, index_name);
                if (query_res.length == 0) {
                    console.log('ZERO_RESULTS: No results in query')
                    index_usage =  undefined
                }
                console.log('\t ... stats result:', index_usage)
                // console.log("Index stats:", JSON.stringify(index_stats));
               
                let index_query_perf = 0
                let noid_query_perf = 0

                //check performance with index
                console.log('   Checking index perf ...')
                index_query_perf = await utils.getPerformance(db, [query])
                console.log('                       ...', index_query_perf)

                // delete indexes
                await index.deleteAll(db);

                // PAUSE
                await new Promise(resolve => setTimeout(resolve, 1000));

                // check performance without indexes
                console.log('   Checking noindex perf ...')
                noid_query_perf = await utils.getPerformance(db, [query])
                console.log('                         ...', noid_query_perf)

                //Logging results in report file 
                // console.log('REPORT', aggregation_name, index_name, index_collection.collectionName, exp_usage, index_usage, exp_duration, id_duration, aggregation_name.split('-')[0] )
                utils.appendReport(aggregation_name, index_name, index_collection.collectionName, exp_usage, index_usage, exp_duration, id_duration, noid_query_perf, index_query_perf, aggregation_name.split('-')[0], JSON.stringify(index_key));
                
                index_summary[index_name] ={"key": index_key, "explain": index_summary[index_name]["explain"] ? index_summary[index_name]["explain"] : exp_usage, "collection": index_collection.collectionName,
                                            "index_stats": index_summary[index_name]["index_stats"] ? index_summary[index_name]["index_stats"] : index_usage};
                checked_combinations += [index_name + aggregation_name]
            }

        }
        console.log(index_summary)
        for (var index_name in index_summary) {
            utils.appendReport("total", index_name,  index_summary[index_name]["collection"], index_summary[index_name]["explain"], index_summary[index_name]["index_stats"], 0, 0, 0, 0, queries[0].name.split('-').slice(0, -2).join('-'), JSON.stringify(index_summary[index_name]["key"]));
        }

        if (checkPerformance) {
            // performance check
            console.log('\n * Checking full performance, total indexes:', indexes.length, ", total queries:", queries.length);
            
            // run queries without indexes     
            await index.deleteAll(db);
            
            let total_millis_noindex = await utils.getPerformance(db, queries)
            const all_noindex_perf = Number(total_millis_noindex).toFixed(3);

            // create all indexes
            for (const id of indexes) {
                await index.createOne(db, id);
            }

            // PAUSE
            await new Promise(resolve => setTimeout(resolve, 5000));

            let total_millis_index = await utils.getPerformance(db, queries)
            const all_index_perf = Number(total_millis_index).toFixed(3);

            utils.appendReport("perf_total", "all", "all", "all", "all", 0, 0, all_noindex_perf, all_index_perf, queries[0].name.split('-').slice(0, -2).join('-'), "all");
        }
    
    } catch (e) {
        console.log('ERROR', e)
    }finally {
        await client.close();
        console.log("Done!")
    }
}

async function explainQuery(collection, pipeline) {

    const exp = await collection.aggregate(pipeline).explain();

    return exp;
}

async function parseExplain(exp, index_name) {
    let exp_usage;
    //If exp has not an array of stages catch error
    let winningPlan;
    try {
        winningPlan = await exp.stages[0].$cursor.queryPlanner.winningPlan;
    } catch {
        winningPlan = await exp.queryPlanner.winningPlan;
    }
    const used_index = await findIndex(winningPlan, index_name);
   
    if(typeof used_index === "undefined") {
        exp_usage = false;
    } else {
        exp_usage = used_index === index_name;
    }

    return exp_usage;
}

async function findIndex(winningPlan, index_name) {
    if(winningPlan.stage !== "IXSCAN") {
        const inputStage = winningPlan.inputStage;
        if(typeof inputStage === "undefined") {
            return inputStage;//return undefined
        } else {
            return findIndex(inputStage, index_name);
        }
    } else{
        return winningPlan.indexName;
    }
}

async function parseIndexStats(index_stats, index_name) {
    let index_usage = 0
    for(const index_stat of index_stats) {
        if(index_stat["name"] === index_name) {index_usage = index_stat["accesses"]["ops"];}
        
    }
    // console.log(index_usage)
    return index_usage>0;
}

