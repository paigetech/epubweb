var fs = require('fs');
var cheerio = require('cheerio');

module.exports = function(selector, html, err) {
  if(err) throw err;
  doc = cheerio.load(html);
  var selected = doc(selector);
  console.log("this is what we selected: " + selected);
  return selected;
};
