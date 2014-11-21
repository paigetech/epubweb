var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var fs = require('fs');
var cheerio = require('cheerio');

var selector = '#content_area';

module.exports = function(fileName, selector, err) {
  if(err) throw err;

  var html = fs.readFileSync('./' + fileName, 'utf8');

  console.log("this is the html: " + html);
  doc = cheerio.load(html);
  var selected = doc(selector);
  fs.writeFileSync(fileName , selected, 'utf8');
  console.log("this is the selected: " + selected);
  return;
};
