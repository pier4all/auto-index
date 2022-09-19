const fs = require('fs');
const path = require('path');
const output_dir = process.env.OUTPUT;

const report_file_name = 'report_' + new Date().toISOString().split('T')[0] + '.csv';
// const report_file_name = 'report_' + new Date().toISOString().replace('T', '_').replace(/:/g, '-').split('.')[0] + '.csv';

const report = path.join(output_dir, report_file_name);
if (!fs.existsSync(report)) {
  //print header if file does not exist
  fs.appendFileSync(report, ["aggregation".padEnd(30), "index".padEnd(65), "collection".padEnd(15), "explain".padEnd(15), "index_stats".padEnd(15), "time_ms_exp".padEnd(15), "time_ms_stats".padEnd(15), "input_tag"].join('\t') + '\n')
}


//Read JSON data in specified folder
function readFiles(filePath) {
    console.log('reading dir ', filePath)
    const files = [];
    const fileNames = fs.readdirSync(filePath);
    for (const file of fileNames) {
       if (file.endsWith(".json")) {
          console.log('reading', file)
          const rawdata = fs.readFileSync(path.join(filePath, file));
          var data = JSON.parse(rawdata);
          //Replaces all field (e.g. {$START_DATE}) which are mongodb values
          if (typeof data.pipeline !== 'undefined') {
            data.pipeline.map(stage => replace(stage, file))
          }
          files.push(data);
        }
      }
      return files
}

//Read JSON data in specified folder
function readFile(filePath) {
  console.log('reading file ', filePath)
  let file = {};
  const rawdata = fs.readFileSync(filePath);
  file = JSON.parse(rawdata);
  return file
}

async function getAllQueries(input_dir) {
      const pathQueries = path.join(__dirname, input_dir);
      let queries = readFiles(pathQueries);
    return queries;
}

async function getAllIndexes(index_file) {
    const pathIndexes = path.join(__dirname, index_file);
    let indexes = readFile(pathIndexes);
    return indexes;
}

function replace(obj, file) {

    //Remove .json extension and add .js
    const fileName = path.basename(file, '.json') + '.js';
    //Get Values to replace fields
    try {
        const { values } = require(path.join(pathValues, fileName));

        if (typeof obj === 'object') {
            // iterating over the object fields
            for (var key in obj) {
              //checking if the current value is an object itself
              if (typeof obj[key] === 'object') {
                // if so then again calling the same function
                replace(obj[key], file)
              } else {
              
        for(var tag in values) {
        // getting the field and replacing tag with value if it matches
        if (obj[key] === tag) obj[key] = values[tag];
                }
              }
            }
          }
    } catch(err) {

    }

    return obj;
  }

function appendReport(aggregation, index, collection, exp, index_usage, exp_duration, id_duration, input_tag) {
  //console.log(aggregation, index, exp, index_usage)
  fs.appendFileSync(report, [aggregation.padEnd(30), index.padEnd(65), String(collection).padEnd(15), String(exp).padEnd(15), String(index_usage).padEnd(15), String(exp_duration).padEnd(15),  String(id_duration).padEnd(15), input_tag ].join('\t') + '\n')
}

function logTimer(start) {
    const NS_PER_SEC = 1e9
    const SEP = '\t'
    const diff = process.hrtime(start)
    const time = `${(diff[0] * NS_PER_SEC + diff[1])/1e6}`
    return time;
}

module.exports = {
    getAllQueries,
    getAllIndexes,
    appendReport,
    logTimer
}