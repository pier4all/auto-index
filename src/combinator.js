const Aggregation = require("./aggregation")
const Index = require("./index")
const util = require("./util")


class Combinator {
    constructor() {
      // leave it for options
    }
  
    combine(indexes) {
        // combine indexes from a single pipeline
        
        let collections = [...new Set(indexes.map(function(i) {return i.collection}))]

        let combinedIndexes = []

        for (let collection of collections){
            let collection_indexes = indexes.filter(i => i.collection == collection) 

            let base_match_key = {}
            // 1. add match indexes
            let match_keys = collection_indexes.filter(i => i.operator == '$match').map(function(i) {return i.key}) 
            
            for (let key_obj of match_keys) {
                for (let key of Object.keys(key_obj)){
                    base_match_key[key] = key_obj[key]
                }
            }

            if (Object.keys(base_match_key).length > 0) {
                combinedIndexes.push(new Index('combine_match_' + Object.keys(base_match_key).join('_') + '_idx', base_match_key, collection, "$match", 0, {} ))
            }

            // 2. add sort index (TODO: take only latest??)

            let sort_keys = collection_indexes.filter(i => i.operator == '$sort').map(function(i) {return i.key})  
            let base_sort_keys = []
            for (let key_obj of sort_keys) {
                let base_sort_key = {}

                for (let key of Object.keys(key_obj)){
                    // create a sort index
                    if (!Object.keys(base_sort_key).includes(key)) {
                        base_sort_key[key] = key_obj[key]
                    }
                    else {
                        break
                    }
                }
                if (Object.keys(base_sort_key).length > 0) {
                    base_sort_keys.push(base_sort_key)
                }
            }        
            // add only latest
            if (base_sort_keys.length > 0) {
                let latest_sort_key = base_sort_keys[base_sort_keys.length - 1]
                combinedIndexes.push(new Index('combine_sort_' + Object.keys(latest_sort_key).join('_') + '_idx', latest_sort_key, collection, "$sort", 0, {} ))
                base_sort_keys = [latest_sort_key]
            }
            
            // 3. Combine sort and match indexes
            let base_sort_match_keys = []
            if ((Object.keys(base_match_key).length > 0) && (base_sort_keys.length > 0)){
                for (let base_sort_key of base_sort_keys){
                    let combined_key = {}
                    for (let key of Object.keys(base_match_key)) {
                        if (!Object.keys(base_sort_key).includes(key)) {
                            combined_key[key] = base_match_key[key]
                        } else {
                            break
                        }
                    }

                    if (Object.keys(combined_key).length > 0) {
                        for (let key of Object.keys(base_sort_key)) {
                            combined_key[key] = base_sort_key[key]
                        }
                        base_sort_match_keys.push(combined_key)
                        combinedIndexes.push(new Index('combine_sort_match_' + Object.keys(combined_key).join('_') + '_idx', combined_key, collection, "$match$sort", 0, {} ))
                    }
                }
            }


            // 4. add lookup indexes
            let lookup_keys = collection_indexes.filter(i => i.operator == '$lookup').map(function(i) {return i.key})  

            let base_lookup_keys = []
            for (let key_obj of lookup_keys) {
                let base_lookup_key = {}

                for (let key of Object.keys(key_obj)){
                    // create a sort index
                    if (!Object.keys(base_lookup_key).includes(key)) {
                        base_lookup_key[key] = key_obj[key]
                    }
                    else {
                        break
                    }
                }
                if (Object.keys(base_lookup_key).length > 0) {
                    base_lookup_keys.push(base_lookup_key)
                    combinedIndexes.push(new Index('combine_lookup_' + Object.keys(base_lookup_key).join('_') + '_idx', base_lookup_key, collection, "$lookup", 0, {} ))
                }
            }            
            

            // 5. add group index (there is only one)
            let group_keys = collection_indexes.filter(i => i.operator == '$group').map(function(i) {return i.key})  

            let base_group_key = {}
            for (let key_obj of group_keys) {
                for (let key of Object.keys(key_obj)){
                    // create a sort index
                    if (!Object.keys(base_group_key).includes(key)) {
                        base_group_key[key] = key_obj[key]
                    }
                }
            }    

            if (Object.keys(base_group_key).length > 0) {
                combinedIndexes.push(new Index('combine_group_' + Object.keys(base_group_key).join('_') + '_idx', base_group_key, collection, "$group", 0, {} ))
            }

            // 3. Combine group with sort and match indexes
            let tags = ['$match', '$sort', '$sort$match']
            if (Object.keys(base_group_key).length > 0){
                let i = 0
                for (let array_keys of [[base_match_key], base_sort_keys, base_sort_match_keys]) {
                    let tag = tags[i]
                    i = i + 1
                    for(let base_key_obj of array_keys) {
                        let combined_key = {}
                        for (let key of Object.keys(base_key_obj)) {
                            if (!Object.keys(base_group_key).includes(key)) {
                                combined_key[key] = base_key_obj[key]
                            } else {
                                break
                            }
                        }

                        if (Object.keys(combined_key).length > 0) {
                            for (let key of Object.keys(base_group_key)) {
                                combined_key[key] = base_group_key[key]
                            }
                            combinedIndexes.push(new Index('combine' + tag.replace('$', '_') + '_group_' + Object.keys(combined_key).join('_') + '_idx', combined_key, collection, tag + "$group", 0, {} ))
                        }
                    }
                }
            }

        }
        return combinedIndexes
    }

    clean(indexes) {
        // remove redundant indexes from an index set

        return []
    }
}

module.exports = Combinator
