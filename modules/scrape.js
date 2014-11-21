var request = require('request');
var fs = require('fs');


module.exports = function(url, fileName, err) {
  if(err) throw err;
  request(url).pipe(fs.createWriteStream(fileName));
  console.log("Wrote out " + fileName);
};

