var fs = require('fs'),
  nodeUtil = require('util'),
  textract = require('textract');
var request = require('request');

var myArgs = process.argv.slice(2);
var pdf = myArgs[0];

var filePath = './' + pdf;
var config = {
 'preserveLineBreaks' : "true"
};

textract(filePath, config, function( err, text ) {
  if(err) {
    console.log(err);
    return;
  }
  var pdfText = '';
  var reTitle = /SUBJECT:\s([\S\s]*?)\n{2}/;
  var reDate = /Date:\s(.*?)[\n\r]/;
  var reAttach = /ATTACHMENTS:[\S\s]*?(Recurring Update Notification|Manual Instruction|Business Requirements)[\n\r](Recurring Update Notification|Manual Instruction|Business Requirements)?[\n\r]?(Recurring Update Notification|Manual Instruction|Business Requirements)?[\n\r]?/;
  var reRecinds = /(Transmittal\s\d+, dated[\S\s]*?rescinded[\S\s]*?)\n{2}/g;
  var subject = text.match(reTitle)[1];
  var date = text.match(reDate)[1];
  var attach = text.match(reAttach);
  var recindReplace = text.match(reRecinds);

  if (recindReplace) {
    console.log("RECINDS: " + recindReplace);
    var reReplace = /Transmittal\s(\d+),\sdated\s([A-Z]\w+\s\d\d?,\s\d{4})/;
    var trans = reReplace.exec(recindReplace)[1];
    var dates = reReplace.exec(recindReplace)[2];
    subject += " *Rescinds and Replaces Transmittal " + trans + ", dated " + dates + "*";
  }

  subject = subject.replace(/\n/g, " ");

  fs.writeFileSync('textract.txt', text);

  var dateParse = date.match(/([A-Za-z]+)\s(\d+),\s(\d{4})/);
  dateParse.shift();

  var months = {
    "January" : "01",
    "February" : "02",
    "March" : "03",
    "April" : "04",
    "May" : "05",
    "June" : "06",
