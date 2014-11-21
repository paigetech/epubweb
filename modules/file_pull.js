var Peepub   = require('pe-epub');
var fs = require('fs');

var outputFilename = './book.json';

fs.writeFile(outputFilename, JSON.stringify(book, null, 4), function(err) {
  if(err) console.log(err);
  console.log("JSON saved to " + outputFilename);
});

var epubJson = require('./book.json'); // see examples/example.json for the specs
var myPeepub = new Peepub(epubJson);

myPeepub.create('./test.epub')
  .then(function(filePath){
  console.log(filePath); // the same path to your epub file!
  });
