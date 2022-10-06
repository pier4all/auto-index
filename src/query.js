var fs = require('fs');
const Aggregation = require('./aggregation');

class Query {
    constructor(name, query, project, sort, collection, options) {
    this.name = name;
    this.query = query;
    this.project = project;
    this.sort = sort;
    this.collection = collection;
    this.options = options;
    }

    static fromFile(path) {
    var jsonString = fs.readFileSync(path, 'utf8');
    return Query.fromJSON(jsonString);
    }

    static fromJSON(jsonString) {
        const jsonObject = JSON.parse(jsonString)
        const name = jsonObject.name || ""
        const collection = jsonObject.collection || undefined

        const query = jsonObject.query || {}
        const project = jsonObject.project || {}
        const sort = jsonObject.sort || {}
        
        const options = {}
        Object.keys(jsonObject).forEach(function(key, index) {
            options[key] = jsonObject[key]
        });

        return new Query(name, query, project, sort, collection, options)
    }

    toAggregation() {

        let pipeline = []

        if (this.query && !Query.isEmptyObject(this.query)) {
            pipeline.push({'$match': this.query})
        }

        if (this.sort && !Query.isEmptyObject(this.sort)) {
            pipeline.push({'$sort': this.sort})
        }

        if (this.project && !Query.isEmptyObject(this.project)) {
            pipeline.push({'$project': this.project})
        }

        pipeline = Aggregation.replaceISODates(pipeline)

        return new Aggregation(this.name, pipeline, this.collection, this.options)
    }

    static isEmptyObject(obj) {
        return !Object.keys(obj).length;
    }

}

module.exports = Query