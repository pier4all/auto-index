
async function createOne(db, index) {
    let res = await db.command(index);
    if (res.numIndexesBefore >= res.numIndexesAfter) {
        console.log(res)
        throw 'Index not created: ' + res.note
    }
}

async function deleteAll(db) {
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    for (const collection of collections) {
        if (collection.name === "system.views") continue
        if (collection.name === "system.profile") continue
        let res = await db.collection(collection.name).dropIndexes();
        // console.log(res)
    }
}

module.exports = {
    createOne,
    deleteAll
}