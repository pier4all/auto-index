const Index = require("./index")
const util = require("./util")


class Cleaner {
    
    constructor(minimize=false) {
      // leave it for options
      this.minimize = minimize
    }
  
    isRedundantKey(index, indexes) {
        let collection = index.collection
        let key = Object.keys(index.key).map((k) => [k, index.key[k]]);

        for (let index_obj of indexes) {
            if (index_obj.collection == collection) {
                let obj_key = Object.keys(index_obj.key).map((k) => [k, index_obj.key[k]]);

                // compared key is shorter than input key
                if (obj_key.length < key.length){
                    continue
                }

                let i = 0
                let isEqual = true
                for (let key_item of key) {
                    if(key_item[0] === obj_key[i][0] && key_item[1] == obj_key[i][1]) {
                       i = i + 1 
                    } else {
                        isEqual = false
                        break
                    }      
                }
                if (isEqual) {
                    return true
                }
            }
        }
        return false
    }

    isDuplicateKey(index, indexes) {
        let collection = index.collection
        let key = JSON.stringify(index.key)

        for (let index_obj of indexes) {
            if (index_obj.collection == collection) {
                if (JSON.stringify(index_obj.key) === key) {
                    return true
                }
            }
        }
        return false
    }

    clean(indexes) {
        // remove redundant indexes from an index set
        let collections = [...new Set(indexes.map(function(i) {return i.collection}))]

        // remove duplicates
        let cleanedIndexes = []
        for (let collection of collections){
            let collection_indexes = indexes.filter(i => i.collection == collection) 

            // sort them descending by length
            collection_indexes.sort((a, b) => {
                if (Object.keys(a.key).length < Object.keys(b.key).length) return 1
                else  return -1;
            })
            
            for (let index of collection_indexes) {
                if (! this.isDuplicateKey(index, cleanedIndexes)) {
                    cleanedIndexes.push(index)
                }
            }        

        }


        if (this.minimize) {
        // remove contained indexes if minimize = true
        // sort by length and check from largest to shortest
        let uniqueIndexes = []

            for (let collection of collections){
                let collection_indexes = cleanedIndexes.filter(i => i.collection == collection) 
            
                // sort them descending by length
                collection_indexes.sort((a, b) => {
                    if (Object.keys(a.key).length < Object.keys(b.key).length) return 1
                    else  return -1;
                })

                for (let index of collection_indexes) {
                    if (! this.isRedundantKey(index, uniqueIndexes)) {
                        uniqueIndexes.push(index)
                    }
                }   
            }

            cleanedIndexes = uniqueIndexes
        }

        return cleanedIndexes
    }
}

module.exports = Cleaner
