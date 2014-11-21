var Peepub   = require('pe-epub');
var fs = require('fs');

module.exports = function(fileName, err) {
  var epubJson = require('../temp/book.json');
  var myPeepub = new Peepub(epubJson);

  myPeepub.create( 'public/' + fileName + '.epub')
    .then(function(filePath){
    console.log("Wrote Epub: " + filePath);
    });
  return;
};
