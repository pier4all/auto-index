
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
        let res = await db.collection(collection.name).dropIndexes();
        // console.log(res)
    }
}

module.exports = {
    createOne,
    deleteAll
}