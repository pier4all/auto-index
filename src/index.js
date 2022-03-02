class Index {
  constructor(name = "", key = {}, collection = "", options = {}) {
    this.name = name;
    this.key = key;
    this.collection = collection;
    this.options = options;
  }

  toMongoJSON() {
      let jsonIndex = {"key": this.key, "name": this.name}

      for (const [key, value] of Object.entries(this.options)) {
          jsonIndex[key] = value
      }

      return { "createIndexes": this.collection, "indexes": [ jsonIndex ] }
  }
}

module.exports = Index