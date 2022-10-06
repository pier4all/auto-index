
exports.checkIndexes = async (queries, indexes) => {

    const db_uri = process.env.DB_URI;
    const db_name = process.env.DB_NAME;
    const {MongoClient} = require('mongodb');
    const client = new MongoClient(db_uri, {useUnifiedTopology: true});
    const {ObjectId} = require('mongodb');
    const utils = require('./util_checker.js');
    const index = require('./indexhandler.js');


    //Connect to MongoDB Database
    try {
        // initilize summary
        let index_summary = {}

        for (const id of indexes) { 
            index_summary[id["indexes"][0]["name"]] = {"explain": false, "index_stats": false}
        }

        // connect
        await client.connect();
        console.log("* Connected to DB: ", db_name);
        const db = client.db(db_name);

        //Drop previous indexes
       await index.deleteAll(db);

        //Run queries
        for (const query of queries) {
            let aggregation_name = query["name"];

            console.log('\n\n * Checking query', aggregation_name)

            //Create one index
            for (const id of indexes) {

                const index_name = id["indexes"][0]["name"];
                const index_key = id["indexes"][0]["key"];
                console.log('\n - Creating index', index_name)
                await index.createOne(db, id);

                const query_collection = db.collection(query["collection"]);
                const index_collection = db.collection(id["createIndexes"]);
                const pipeline = query["pipeline"];

                 //Explain
                console.log('   Checking explain ...')
                const exp_start = process.hrtime();
                const exp = await explainQuery(query_collection, pipeline);
                const exp_duration = utils.logTimer(exp_start);
                const exp_usage = await parseExplain(exp, index_name);
                console.log('\t ... explain result:', exp_usage)
                // console.log("Explain: ", JSON.stringify(exp, null, 2));

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

                //Logging results in report file 
                // console.log('REPORT', aggregation_name, index_name, index_collection.collectionName, exp_usage, index_usage, exp_duration, id_duration, aggregation_name.split('-')[0] )
                utils.appendReport(aggregation_name, index_name, index_collection.collectionName, exp_usage, index_usage, exp_duration, id_duration, aggregation_name.split('-')[0], JSON.stringify(index_key));
                
                index_summary[index_name] ={"key": index_key, "explain": index_summary[index_name]["explain"] ? index_summary[index_name]["explain"] : exp_usage, "collection": index_collection.collectionName,
                                            "index_stats": index_summary[index_name]["index_stats"] ? index_summary[index_name]["index_stats"] : index_usage};
                
                await index.deleteAll(db);

            }

        }
        console.log(index_summary)
        for (var index_name in index_summary) {
            utils.appendReport("total", index_name,  index_summary[index_name]["collection"], index_summary[index_name]["explain"], index_summary[index_name]["index_stats"], 0, 0, queries[0].name.split('-').slice(0, -2).join('-'), JSON.stringify(index_summary[index_name]["key"]));
        }
    } finally {
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

