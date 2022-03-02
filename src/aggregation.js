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
        const pipeline = jsonObject.pipeline || []
        const collection = jsonObject.collection || undefined
        
        const options = {}
        Object.keys(jsonObject).forEach(function(key, index) {
            options[key] = jsonObject[key]
        });

        return new Aggregation(name, pipeline, collection, options)
    }

}

module.exports = Aggregation