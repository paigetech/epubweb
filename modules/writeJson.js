var fs = require('fs');
var body = "";

module.exports = function(fileName, err) {
  if(err) return err;
  var data = fs.readFileSync(fileName, 'utf8');
  var book = {
      "title" : "The Peoples E-Book",
      "cover" : "http://placekitten.com/600/800",
      "pages" : [{
        "title" : "PE-EPUB",
        "body" : data
      }]
    };
  var outputFilename = './temp/book.json';
  fs.writeFileSync(outputFilename, JSON.stringify(book, null, 4));
  console.log("JSON saved to " + outputFilename);
  return;
};
