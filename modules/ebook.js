var express = require('express');
var router = express.Router();
var fs = require('fs');
var request = require('request');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var cheerio = require('cheerio');
var Peepub   = require('pe-epub');

var dateNow = function() {
  var dateNow = new Date();
  var dd = dateNow.getDate();
  var monthSingleDigit = dateNow.getMonth() + 1,
  mm = monthSingleDigit < 10 ? '0' + monthSingleDigit : monthSingleDigit;
  var yy = dateNow.getFullYear().toString();
  if (dd < 10) {
    dd = "0" + dd;
  };
  return (yy + '-' + mm + '-' + dd);
};

function doIt(){

  //var url = "https://www.federalregister.gov/articles/2013/08/19/2013-18956/medicare-program-hospital-inpatient-prospective-payment-systems-for-acute-care-hospitals-and-the";
  var url = "https://www.federalregister.gov/articles/2014/11/10/2014-26146/medicare-and-medicaid-programs-hospital-outpatient-prospective-payment-and-ambulatory-surgical";

  var fileName = 'public/temp.html';

  request(url, function(error, response, html){
    if(!error) {
      var $ = cheerio.load(html);
      var source = $('.article').html();


      //building the doc
      var doc = "";
      //H2


      //body Summary and Preface
      //uid
      var uid = "uid"; //need to set up

      //date
      var dateBody = $('.metadata_list').html();
      var date;
      re = /<dt>Publication Date:<\/dt> <dd><a href="\/articles\/(\d+\/\d+\/\d+)">.*?<\/a><\/dd>/g;
      if( (res = re.exec(dateBody)) !== null ){
        date = (res[1].replace(/[\/]/g, "-") );
      }
      var today = dateNow();
      

      //sumary and preface
      var header = "<doc>\n" +
        ":::uid " + uid + "\n" +
        ":::date " + date + "\n" +
        ":::wn " + today + "\n" +
        "<h3 id=\"summary_and_preface\">Summary and Preface</h3>\n" +
        "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\"> \n" +
        "<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n";
        doc = header;

        //build the index list
        var matches = [];
        var index = "";

        //CFRs
        var cfrIndexSource = $('.aside_box dl').html();
        var re = /(\d\d\sCFR\s\d+)/g;
        var CFR = cfrIndexSource.match(re); //so we can use it later
        matches = CFR;


        //input
        var inputIndexSource = $('#related_topics').html();
        re = /\/topics\/([\w\-\d]+)\"/g;
        while( (res = re.exec(inputIndexSource)) !== null ){
          matches.push(res[1]);
        }

        //build the :::index
        matches.forEach(function(item) {
          item = item.replace(/[-\s]/g, "");
          index = index + ":::index " + item + "\n";
        });
        doc = doc + '\n' + index + '\n';

        //title
        var titleText = $('#metadata_content_area h1').html();
        var title = '<p><b>' + titleText + '</b></p>\n';

        doc += '\n' + title + '\n';
        matches = [];

        //body Summary and Preface
        var summBody = $('.metadata_list').html();
        //date
        var publicationDate;
        re = /<dt>Publication Date:<\/dt> <dd><a.*?>(.*?)<\/a><\/dd>/g;
        while( (res = re.exec(summBody)) !== null ){
          publicationDate = res[1];
        }
        publicationDate = "<br><p><b>Publication Date:</b> " + publicationDate + "</p>\n";
        doc += publicationDate + '\n';

        //agencies
        re = /agencies\/.*?">(.*?)<\/a>/g;
        while( (res = re.exec(summBody)) !== null ){
          matches.push(res[1]);
        }
        var agencies = "<br><p><b>Agencies:</b></p>\n";

        matches.forEach(function(item) {
          agencies = agencies + "<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + item + "</p>\n";
        });

        doc += agencies + '\n';

        //Entry Type
        re = /<dt>Entry\sType:<\/dt>\s+<dd>(\w+)<\/dd>/g;
        var entryType = re.exec(summBody)[1];
        entryType = "\n<br><p><b>Entry Type:</b> " + entryType + "</p>\n";

        doc += entryType + '\n';

        //Action
        re = /<dt>Action:\s?<\/dt>\s+<dd>([\w\s\.]+)<\/dd>/g;
        var action = re.exec(summBody)[1];
        action = "<br><p><b>Action:</b> " + action + "</p>\n";

        doc += action + '\n';

        //Document Citation
        re = /<dt>Document Citation.*?\n.*?(\d\d).*?(\d+)<\/span>/g;
        var docCitation = re.exec(summBody);
        var documentCitation = "<br><p><b>Document Citation:</b> " + docCitation[1] + " FR " + docCitation[2] + "</p>\n";

        doc += documentCitation + '\n';
        
        //Page
        re = /<dt>Page[\S\s]*?(\d+[\S\s]*?-\d+[\S\s]*?)\n/g;
        var page = re.exec(summBody)[1];
        page = page.replace(/\n|\s{2,}/g, "");
        var pages = "<br><p><b>Page:</b> " + page + "\n";

        doc += pages + '\n';

        //CFR:
        re = /(\d\d\sCFR\s\d+)/g;
        CFR = cfrIndexSource.match(re); //so we can use it later
        var cfrs = "<br><p><b>CFR:</b></p>\n";
        CFR.forEach(function(item){
          cfrs = cfrs + "<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + item + "<p>\n";
        });

        doc += cfrs + "\n";

        //agency/docet nums
        re = /(CMS-\d+-\w+)/g;
        matches = [];
        while( (res = re.exec(summBody)) !== null ){
          matches.push(res[1]);
        }
        var agencyDocet = "<br><p><b>Agency/Docket Numbers:</b></p>\n";

        matches.forEach(function(item) {
          agencyDocet = agencyDocet + "<p>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[" + item + "] </p>\n";
        });

        doc += agencyDocet + '\n';

        //we now have the info to build the h2
        var h2 = "<doc>\n<h2>" + title + " " + matches  + "</h2>\n:::uid " + uid + "0\n</doc>\n";

        doc = h2 + doc;

        //RINs (***needs editing for more than one)
        re = /<dt>Docket RIN<\/dt>[\S\s]*?">([\S\s]*?)<\/a><\/dd>/g;
        matches = [];
        while( (res = re.exec(summBody)) !== null ){
          matches.push(res[1]);
        }
        var RINs = "<br><p><b>RINs:</b>";

        matches.forEach(function(item) {
          RINs = RINs + item + "</p>\n";
        });

        doc += RINs + '\n';
        
        //shorter URL
        var shortURL = $('.shorter_url').html();

        doc += "<br><p><b>Shorter URL:</b> <a href=\"" + shortURL +"\">" + shortURL + "</a></p>";

        //Find the TOC so that we can remove it while saving it for later
//        var toc = $('#content_area #table_of_contents').html();
//      toc += $('#content_area .table_of_contents').html();
//
//      var tables = $('#content_area #table_of_tables').html();
//      tables += $('#content_area .table_of_tables').html();
      //remove the TOC and table of tables
      $('#content_area .table_of_contents').remove();
      $('#content_area #table_of_contents').remove();
      $('#content_area .table_of_tables').remove();
      $('#content_area #table_of_tables').remove();
//
//      //this is in the wrong stinking place
//      doc += "\n<\/doc>\n<doc>\n:::uid tableofcontents\n<h3>Table of Contents</h3>" + toc + "\n<\/doc>";

        //body info for the rest of the build
        var body = $('#content_area').html();

        //adding indexs and alinks
        re = /<span\sclass="printed_page"\sid="page-(\d+)[\S\s]*?<\/span>/g;
        body = body.replace(re, "\n:::index 79p$1\n<a name=\"79p$1\"><\/a>\n");

        //getting rid of back to top
        re = /<a href="[#_\w]+"\sclass="back_to_top">Back to Top<\/a>/g;
        body = body.replace(re, "");

        //get rid of divs
        re = /<div\s[\w="_\s]+>/g;
        body = body.replace(re, "");
        re = /<\/div>/g;
        body = body.replace(re, "");

        //get rid of h1s
        re = /<h1[\S\s]*?>/g;
        body = body.replace(re, "<br><br><p><b>");
        re = /<\/h1>/g;
        body = body.replace(re, "<\/b><\/p>");

        //setup the different docs

        //first get rid of the h4s we don't want
        re = /<h4[\S\s]*?>/g;
        body = body.replace(re, "<br><p><b>");
        re = /<\/h4>/g;
        body = body.replace(re, "<\/b><\/p>");

        //get rid of the plain h3s
        re = /<h3>([\S\s]*?)<\/h3>/g;
        body = body.replace(re, "<p><b>$1<\/b><\/p>\n");


        //h3s -> h4s for docs
        re = /<h3[\S\s]*?id=\"\w\-(\d+)\"[\S\s]*?>/g;
        replace = "\n<\/doc>\n<doc>\n:::date " + date + "\n:::uid " + uid + "$1\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h4><a name=\"$1\"><\/a>";
        body = body.replace(re, replace);
        re = /<\/h3>/g;
        body = body.replace(re, "<\/h4>\n");

        //look for h3's that should be docs in their own right
        re = /<doc>\n:::uid\s([\w\d]+)\n<h3>([IVX]+\.)([\w\d\s\.\-\:\(\)\\\/]+)<\/h3>[\n\s]+?<p/g;
        replace = "\n<\/doc>\n<doc>\n:::uid " + uid + "head$1\n<h3>$2$3<\/h3>\n\n<\/doc>\n<doc>\n:::date " + date + "\n:::uid $1\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h4>$3<\/h4>\n<p";
        body = body.replace(re, replace);

        //catpture the important h2s
        re = /<h2\sid=\"([\w\d\"\-\s=]+)\"[\w\d\"\-\s=]+\">([IVX]+\.[\S\s]*?)<\/h2>/g;
        replace = "\n<\/doc>\n<doc>\n:::uid " + uid + "$1\n<h3>$2<\/h3>\n";
        body = body.replace(re, replace);
        //get rid of the others
        re = /<h2\sid=\"([\w\d\"\-\s=]+)\"[\w\d\"\-\s=]+\">([\S\s]*?)<\/h2>/g;
        replace = "\n<p><b>$2<\/b><\/p>\n";
        body = body.replace(re, replace);


        //setup for Footnotes
        re = /<p><b>Footnotes/g;
        replace = "\n<\/doc>\n<doc>\n:::date " + date +  "\n:::uid " + uid + "footnotes\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h3>Footnotes<\/h3>\n";
        body = body.replace(re, replace);
        re = /<div[\s\w\d=_\-\"]+class="footnote">/g;
        replace = "";
        body = body.replace(re, replace);

        //setup for List of Subjects
        re = /<p><b>List of Subjects/g;
        replace = "\n<\/doc>\n<doc>\n:::uid " + uid + "headlistofsubject\n<h3>List of Subjects<\/h3>\n\n<\/doc>\n<doc>\n:::date " + date +  "\n:::uid " + uid + "listofsubjects\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h4>List of Subjects<\/h4>\n";
        body = body.replace(re, replace);

        //clean up the rest of the h's
        re = /<h5[\S\s]*?>/g;
        body = body.replace(re, "<br><p><b>");
        re = /<\/h5>/g;
        body = body.replace(re, "<\/b><\/p>");

        //setup the PARTS
        re = /<p><b>(PART\s(\d+)[\S\s]*?)<\/b><\/p>/g;
        replace = "\n<\/doc>\n<doc>\n:::date " + date + "\n:::uid " + uid + "part$2\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/globaltext.css\">\n<link rel=\"stylesheet\" type=\"text/css\" href=\"http://portal.mediregs.com/fedreg.css\">\n<h4>$1<\/h4>";
        body = body.replace(re, replace);

        //clean up double end docs
        re = /<\/doc>\n+<\/doc>/g;
        body = body.replace(re, "<\/doc>");

        //clean up random h2
        re = /<h2([\s\w\d=\"_]+)?><\/h2>/g;
        body = body.replace(re, "");

        //get rid of "back to context"
//        re = /<a[\S\s]*?>Back to Context([\n\s]+)?<\/a>/g;
//      body = body.replace(re, "");
//      //get rid of "back to top"
//      re = /<a[\S\s]*?>Back to Top([\n\s]+)?<\/a>/g;
//      body = body.replace(re, "");
//
//      //get rid of "back to top"
//      re = /\n<\/h(\d)>/g;
//      body = body.replace(re, "<\/h$1>");


        doc += body;
        //fix uids
        re = /(:::uid\s[\w\d]+)\-([\w\d]+)/g;
        doc = doc.replace(re, "$1$2"); 

        doc += "\n<\/doc>";
        console.log("This is the doc" + doc);

        //what is in the doc now
        fs.writeFileSync("xpathTest.html", doc);
        //console.log(doc);
    }
  });

}

doIt();

