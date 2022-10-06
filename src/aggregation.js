var fs = require('fs');

class Aggregation {
    constructor(name, pipeline, collection, options) {
    this.name = name;
    this.pipeline = pipeline;
    this.collection = collection;
    this.options = options;
    }

    static fromFile(path) {
        var jsonString = fs.readFileSync(path, 'utf8');
        return Aggregation.fromJSON(jsonString);
    }

    static fromJSON(jsonString) {

        const jsonObject = JSON.parse(jsonString)

        const name = jsonObject.aggregate || ""
        let pipeline = jsonObject.pipeline || []

        const collection = jsonObject.collection || undefined
        
        const options = {}
        Object.keys(jsonObject).forEach(function(key, index) {
            options[key] = jsonObject[key]
        });

        pipeline = this.replaceISODates(pipeline)

        return new Aggregation(name, pipeline, collection, options)
    }

    static replaceISODates(pipeline){
        // Check for ISODates (not compatible)
        if (JSON.stringify(pipeline).includes("ISODate")) {
            try {
                for (let stage of pipeline) {
                    if(JSON.stringify(stage).includes("ISODate")) {
                        for (let field of Object.keys(stage)) {
                            for (let operator of Object.keys(stage[field])) {
                                for (let text of Object.keys(stage[field][operator])) {
                                    if ((typeof stage[field][operator][text] === 'string' )//|| stage[field][operator][text] instanceof String)
                                    & (stage[field][operator][text].includes("ISODate"))) {
                                        let date_text = stage[field][operator][text].match(/\(([^)]+)\)/)[1].trim().slice(1, -1).trim()
                                        let dateObject = new Date(date_text)
                                        if (dateObject instanceof Date && !isNaN(dateObject)) {
                                            stage[field][operator][text] = dateObject
                                            console.log( " * INFO: Fixed ISODate ", name, stage[field][operator][text])
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } catch { }

            if (JSON.stringify(pipeline).includes("ISODate")) {
                console.warn("Pipeline contains ISODate (not compatible) ", name)
                console.log(JSON.stringify(pipeline,2))
                throw 'fix the ISODate on pipeline ' +  name
            }
         }
         return pipeline
        
    }
}



module.exports = Aggregation