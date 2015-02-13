var express = require('express');
var router = express.Router();
var fs = require('fs');
var request = require('request');
var xpath = require('xpath');
var dom = require('xmldom').DOMParser;
var cheerio = require('cheerio');
var Peepub   = require('pe-epub');
var mkdirp = require('mkdirp');

var dateNow = function() {
  var dateNow = new Date();
  var dd = dateNow.getDate();
  var monthSingleDigit = dateNow.getMonth() + 1,
  mm = monthSingleDigit < 10 ? '0' + monthSingleDigit : monthSingleDigit;
  var yy = dateNow.getFullYear().toString();
  if (dd < 10) {
    dd = "0" + dd;
  }
  return (yy + '-' + mm + '-' + dd);
};

function doIt(url, articleName){

  //var url = "https://www.federalregister.gov/articles/2010/12/30/2010-33169/recruiting-and-hiring-students-and-recent-graduates";

  console.log("Downloading URL: " + url);
  //write out what we're pulling down for testing purposes
  fs.writeFileSync("origional.html", url);

  request(url, function(error, response, html){
    if(!error) {
      var $ = cheerio.load(html);
      var source = $('.article').html();

      var FRVolume = $('.volume').html();
      var edition = $('.page').html();

      //building the doc
      var doc = "";

      doc += url + "\n\n :::index " + FRVolume + "p" + edition + "\n\n";


      //date
      var dateBody = $('.metadata_list').html();
      var date;
      re = /<dt>Publication Date:<\/dt> <dd><a href="\/articles\/(\d+\/\d+\/\d+)">.*?<\/a><\/dd>/g;
      if( (res = re.exec(dateBody)) !== null ){
        date = (res[1].replace(/[\/]/g, "-") );
      }
      var today = dateNow();



      //body info for the rest of the build
      var body = $('#content_area').html();
      if (!body) {
        console.log("error, content_area not found");
      }

      //adding indexs and alinks
      re = /<span[\s\S]+?class="printed_page"\sid="page-(\d+)[\S\s]*?<\/span>/g;
      body = body.replace(re, "\n:::index " + FRVolume + "p$1\n<a name=\"" + FRVolume + "p$1\"><\/a>\n");

      //getting rid of back to top
      re = /<a href="[#_\w]+"\sclass="back_to_[\w_]+">Back to Top<\/a>/g;
      body = body.replace(re, "");

      //get rid of divs
      re = /<div\s[\w="_\s]+>/g;
      body = body.replace(re, "");
      re = /<\/div>/g;
      body = body.replace(re, "");

      //get rid of h1s
      re = /<h\d[\S\s]*?>/g;
      body = body.replace(re, "<br><p><b>");
      re = /<\/h\d>/g;
      body = body.replace(re, "<\/b><\/p>");

      //add the body to the prepared doc
      doc += body;

      //run the find and replace set

      //convert FR links to rex links
      re = /<a href=\"\/citation\/(([\d]+)-FR-[\d]+)\">([\s\w\"\-=\n]+)<\/a>/g;
      replace = "<!!ln dp_fr$2 $1p$2 #$1p$2>$3<\/!!ln>";
      doc = doc.replace(re, replace);

      //get rid of any hrefs
      re = /<a[\S\s]*?>/g;
      replace = "";
      doc = doc.replace(re, replace);
      //get rid of any hrefs
      re = /<\/a>/g;
      replace = "";
      doc = doc.replace(re, replace);

      re = /<a[\s\w\d\-\"#=]+rel=\"footnote\">([\s\n]+\[\d+\][\s\n]+)<\/a>/g;
      replace = "\n$1\n";
      doc = doc.replace(re, replace);

      //get rid of classes
      re = /\sclass=\"([\w\d\-_\s]+)?\"/g;
      doc = doc.replace(re, "");
      
      //header id removal
      re = /(<h\d)\s[\w\s\d=\"]+>/g;
      replace = "$1>";
      doc = doc.replace(re, replace);

      //replace the closing ln tages with the proper closing a tag 
      re = /<\/!!ln>/g;
      replace = "<\/a>";
      doc = doc.replace(re, replace);


      //download the images we'll need
      var loadedFile = source;

      re = /src=\"(https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/.*?\/\w+\.\w{3})\"/ig;

      //make sure the frvolume directory is available
      var directory = 'images/' + FRVolume + "/";
      mkdirp( directory , function (err) {
            if (err) console.error(err);
            else console.log('Made the directory: ' + directory);
      });

      var captures = [];
      while (match = re.exec(loadedFile)) {
            captures.push(match[1]);
      }

      if (captures.length > 0) {
        captures.forEach(function(url) {
          var re = /https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([\d\w\.]+)\/\w+\.\w{3}/ig;
          var fileVar = re.exec(url);
          if (fileVar) {
            var fileName = "images/" + FRVolume + "/" + fileVar[1].toLowerCase() + '.png';
            request(url).pipe(fs.createWriteStream(fileName));
          }

        });
      }

      doc = doc.replace(/https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([a-z0-9\.%]+)\/\w+\.\w{3}/ig, function($1) {
            return( $1.toLowerCase() ); 
          });

      var re = /https:\/\/s\d\.amazonaws\.com\/images\.federalregister\.gov\/([\d\w\.%]+)\/\w+\.\w{3}/ig;
      var replace = "http://p.i.mediregs.com/fr" + FRVolume + "/$1.png\"><\/a><\/p>";
      doc = doc.replace(re, replace);

      //take care of any images
      re = /<img src=/gi;
      replace = "<!!img><img src=";
      doc = doc.replace(re, replace);

      console.log('complete');

      doc += "\n<\/doc>";
      console.log("Done");

      //what is in the doc now
      fs.writeFileSync( articleName, doc );
      //console.log(doc);
  }
});

}

var missing = [
"https://www.federalregister.gov/articles/2015/02/04/2015-02226/notice-of-inventory-completion-california-state-university-sacramento-sacramento-ca",
"https://www.federalregister.gov/articles/2015/02/09/2015-02179/energy-conservation-program-for-consumer-products-energy-conservation-standards-for-hearth-products",
"https://www.federalregister.gov/articles/2010/04/22/2010-9451/establishing-the-presidents-management-advisory-board",
"https://www.federalregister.gov/articles/2010/04/22/2010-9324/bureau-of-educational-and-cultural-affairs-eca-request-for-grant-proposals-dancemotion-usa",
"https://www.federalregister.gov/articles/2010/08/23/2010-21020/establishment-of-pakistan-and-afghanistan-support-office",
"https://www.federalregister.gov/articles/2010/08/23/2010-21016/classified-national-security-information-program-for-state-local-tribal-and-private-sector-entities",
"https://www.federalregister.gov/articles/2010/12/07/2010-30827/provision-of-us-drug-interdiction-assistance-to-the-government-of-brazil",
"https://www.federalregister.gov/articles/2010/12/07/2010-30828/presidential-determination-with-respect-to-section-404c-of-the-child-soldiers-prevention-act-of-2008",
"https://www.federalregister.gov/articles/2010/12/07/2010-30826/fiscal-year-2011-refugee-admissions-numbers-and-authorizations-of-in-country-refugee-status-pursuant",
"https://www.federalregister.gov/articles/2010/12/07/2010-30819/waiver-of-restriction-on-providing-funds-to-the-palestinian-authority",
"https://www.federalregister.gov/articles/2010/12/07/2010-30831/presidential-determination-on-sudan",
"https://www.federalregister.gov/articles/2010/12/17/2010-31878/white-house-council-for-community-solutions",
"https://www.federalregister.gov/articles/2010/12/30/2010-33169/recruiting-and-hiring-students-and-recent-graduates",
"https://www.federalregister.gov/articles/2010/02/03/2010-2419/presidents-advisory-council-on-financial-capability",
"https://www.federalregister.gov/articles/2010/01/26/2010-1492/agency-information-collection-extension",
"https://www.federalregister.gov/articles/2010/01/26/2010-1220/water-quality-standards-for-the-state-of-floridas-lakes-and-flowing-waters",
"https://www.federalregister.gov/articles/2010/01/27/2010-1477/premanufacture-notification-exemption-for-polymers-amendment-of-polymer-exemption-rule-to-exclude",
"https://www.federalregister.gov/articles/2010/01/29/2010-1944/notice-of-entering-into-a-compact-with-the-republic-of-moldova",
"https://www.federalregister.gov/articles/2010/06/02/2010-12271/energy-conservation-program-for-consumer-products-test-procedure-for-residential-central-air",
"https://www.federalregister.gov/articles/2010/06/07/2010-13021/safeguarding-child-support-information",
"https://www.federalregister.gov/articles/2010/06/10/2010-13977/wire-decking-from-the-peoples-republic-of-china-final-determination-of-sales-at-less-than-fair-value",
"https://www.federalregister.gov/articles/2010/06/16/2010-14566/prohibited-transaction-exemptions-morgan-stanley-and-co-inc-and-its-current-and-future-affiliates",
"https://www.federalregister.gov/articles/2010/06/16/2010-14613/establishing-the-national-prevention-health-promotion-and-public-health-council",
"https://www.federalregister.gov/articles/2010/06/18/2010-14797/carbazole-violet-pigment-23-from-india-rescission-of-countervailing-duty-administrative-review",
"https://www.federalregister.gov/articles/2010/06/18/2010-14879/unexpected-urgent-refugee-and-migration-needs-related-to-somalia-and-food-pipeline-breaks-for",
"https://www.federalregister.gov/articles/2010/06/28/2010-15851/presidents-council-on-fitness-sports-and-nutrition",
"https://www.federalregister.gov/articles/2010/06/29/2010-14717/truth-in-lending",
"https://www.federalregister.gov/articles/2010/07/08/2010-16864/optimizing-the-security-of-biological-select-agents-and-toxins-in-the-united-states",
"https://www.federalregister.gov/articles/2010/07/08/2010-16566/self-regulatory-organizations-edga-exchange-inc-notice-of-filing-and-immediate-effectiveness-of",
"https://www.federalregister.gov/articles/2010/07/16/2010-17329/proposed-agency-information-collection-renewal-joint-submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2010/07/22/2010-18169/stewardship-of-the-ocean-our-coasts-and-the-great-lakes",
"https://www.federalregister.gov/articles/2010/07/30/2010-18731/office-of-the-secretary-notice-of-order-soliciting-community-proposals",
"https://www.federalregister.gov/articles/2010/03/01/2010-3294/general-provisions-revised-list-of-migratory-birds",
"https://www.federalregister.gov/articles/2010/03/16/2010-5837/national-export-initiative",
"https://www.federalregister.gov/articles/2010/03/19/2010-6086/request-for-comment-on-implementation-of-the-family-smoking-prevention-and-tobacco-control-act",
"https://www.federalregister.gov/articles/2010/03/29/2010-7154/ensuring-enforcement-and-implementation-of-abortion-restrictions-in-the-patient-protection-and",
"https://www.federalregister.gov/articles/2010/05/03/2010-8282/asset-backed-securities",
"https://www.federalregister.gov/articles/2010/05/07/2010-10765/broadband-initiatives-program",
"https://www.federalregister.gov/articles/2010/05/07/2010-8159/light-duty-vehicle-greenhouse-gas-emission-standards-and-corporate-average-fuel-economy-standards",
"https://www.federalregister.gov/articles/2010/05/07/2010-10761/notice-of-public-information-collection-being-reviewed-by-the-federal-communications-commission-for",
"https://www.federalregister.gov/articles/2010/05/21/2010-12210/in-the-matter-of-certain-electronic-paper-towel-dispensing-devices-and-components-thereof-notice-of",
"https://www.federalregister.gov/articles/2010/11/01/2010-27668/continuation-of-us-drug-interdiction-assistance-to-the-government-of-colombia",
"https://www.federalregister.gov/articles/2010/11/01/2010-27672/unexpected-urgent-refugee-and-migration-needs-resulting-from-violence-in-kyrgyzstan",
"https://www.federalregister.gov/articles/2010/11/01/2010-27676/presidential-determination-on-major-illicit-drug-transit-or-major-illicit-drug-producing-countries",
"https://www.federalregister.gov/articles/2010/11/01/2010-27673/unexpected-urgent-refugee-and-migration-needs-resulting-from-flooding-inpakistan",
"https://www.federalregister.gov/articles/2010/11/01/2010-27674/presidential-determination-with-respect-to-foreign-governments-efforts-regarding-trafficking-in",
"https://www.federalregister.gov/articles/2010/11/09/2010-28360/controlled-unclassified-information",
"https://www.federalregister.gov/articles/2010/11/09/2010-28365/providing-an-order-of-succession-within-the-department-of-justice",
"https://www.federalregister.gov/articles/2010/11/15/2010-28854/export-enforcement-coordination-center",
"https://www.federalregister.gov/articles/2010/11/22/2010-29579/fundamental-principles-and-policymaking-criteria-for-partnerships-with-faith-based-and-other",
"https://www.federalregister.gov/articles/2010/10/01/2010-24738/notice-of-intent-to-prepare-a-programmatic-environmental-impact-statement-on-implementing-recovery",
"https://www.federalregister.gov/articles/2010/10/01/2010-24839/blocking-property-of-certain-persons-with-respect-to-serious-human-rights-abuses-by-the-government",
"https://www.federalregister.gov/articles/2010/10/07/2010-24871/endangered-and-threatened-wildlife-and-plants-12-month-finding-on-a-petition-to-list-the-sacramento",
"https://www.federalregister.gov/articles/2010/10/08/2010-25578/establishing-the-gulf-coast-ecosystem-restoration-task-force",
"https://www.federalregister.gov/articles/2010/10/13/2010-25731/notice-of-public-meeting-of-the-committee-on-regulation",
"https://www.federalregister.gov/articles/2010/10/13/2010-25663/notice-of-proposed-change-to-section-iv-of-the-virginia-state-technical-guide",
"https://www.federalregister.gov/articles/2010/10/13/2010-25662/notice-of-proposed-change-to-section-iv-of-the-virginia-state-technical-guide",
"https://www.federalregister.gov/articles/2010/10/13/2010-25647/trade-adjustment-assistance-for-farmers",
"https://www.federalregister.gov/articles/2010/10/13/2010-25650/trade-adjustment-assistance-for-farmers",
"https://www.federalregister.gov/articles/2010/10/13/2010-25698/mt-hood-national-forest-oregon-cooper-spur-government-camp-land-exchange",
"https://www.federalregister.gov/articles/2010/10/13/2010-25755/superior-national-forest-minnesota",
"https://www.federalregister.gov/articles/2010/10/13/2010-25588/fresno-county-resource-advisory-committee",
"https://www.federalregister.gov/articles/2010/10/13/2010-25655/united-states-et-al",
"https://www.federalregister.gov/articles/2010/10/13/2010-25695/proposed-data-collections-submitted-for-public-comment-and-recommendations",
"https://www.federalregister.gov/articles/2010/10/13/2010-25694/proposed-data-collections-submitted-for-public-comment-and-recommendations",
"https://www.federalregister.gov/articles/2010/10/13/2010-25693/proposed-data-collections-submitted-for-public-comment-and-recommendations",
"https://www.federalregister.gov/articles/2010/10/13/2010-25703/advisory-committee-to-the-director-acd-centers-for-disease-control-and-prevention-cdc",
"https://www.federalregister.gov/articles/2010/10/13/2010-25713/award-of-a-single-source-expansion-supplement-to-the-research-foundation-of-cuny-on-behalf-of-hunter",
"https://www.federalregister.gov/articles/2010/10/13/2010-25709/award-of-a-single-source-expansion-supplement-to-the-tribal-law-and-policy-institute",
"https://www.federalregister.gov/articles/2010/10/13/2010-25715/award-of-a-single-source-expansion-supplement-to-the-child-welfare-league-of-america",
"https://www.federalregister.gov/articles/2010/10/13/2010-25719/award-of-a-single-source-expansion-supplement-to-the-university-of-southern-maine-muskie-school-of",
"https://www.federalregister.gov/articles/2010/10/13/2010-25711/award-of-a-single-source-expansion-supplement-to-the-university-of-oklahoma-national-resource-center",
"https://www.federalregister.gov/articles/2010/10/13/2010-25710/award-of-a-single-source-program-expansion-supplement-to-chapel-hill-training-outreach-project-inc",
"https://www.federalregister.gov/articles/2010/10/13/2010-25722/award-of-a-single-source-grant-to-chapin-hall-at-the-university-of-chicago-chicago-il",
"https://www.federalregister.gov/articles/2010/10/13/2010-25648/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25692/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25669/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25775/applications-for-duty-free-entry-of-scientific-instruments",
"https://www.federalregister.gov/articles/2010/10/13/2010-25668/proposed-information-collection-comment-request-socio-economic-assessment-of-snapper-grouper",
"https://www.federalregister.gov/articles/2010/10/13/2010-25781/ball-bearings-and-parts-thereof-from-germany-amended-final-results-of-antidumping-duty",
"https://www.federalregister.gov/articles/2010/10/13/2010-25776/chlorinated-isocyanurates-from-spain-and-the-peoples-republic-of-china-continuation-of-antidumping",
"https://www.federalregister.gov/articles/2010/10/13/2010-25772/silicon-metal-from-the-peoples-republic-of-china-extension-of-time-limit-for-the-final-results-of",
"https://www.federalregister.gov/articles/2010/10/13/2010-25777/carbazole-violet-pigment-23-from-india-final-results-of-antidumping-duty-changed-circumstances",
"https://www.federalregister.gov/articles/2010/10/13/2010-25770/first-antidumping-duty-administrative-review-of-sodium-hexametaphosphate-from-the-peoples-republic",
"https://www.federalregister.gov/articles/2010/10/13/2010-25768/grant-of-interim-extension-of-the-term-of-us-patent-no-5407914-surfaxin-lucinactant",
"https://www.federalregister.gov/articles/2010/10/13/2010-25767/grant-of-interim-extension-of-the-term-of-us-patent-no-4919140-andaratm",
"https://www.federalregister.gov/articles/2010/10/13/2010-25566/36b1-arms-sales-notifications",
"https://www.federalregister.gov/articles/2010/10/13/2010-25549/36b1-arms-sales-notifications",
"https://www.federalregister.gov/articles/2010/10/13/2010-25762/notice-of-proposed-information-collection-requests",
"https://www.federalregister.gov/articles/2010/10/13/2010-25686/individual-exemption-involving-general-motors-company-general-motors-holdings-llc-and-general-motors",
"https://www.federalregister.gov/articles/2010/10/13/2010-25761/proposed-agency-information-collection",
"https://www.federalregister.gov/articles/2010/10/13/2010-25672/northern-border-pipeline-company-notice-of-availability-of-the-environmental-assessment-for-the",
"https://www.federalregister.gov/articles/2010/10/13/2010-25673/eagle-power-authority-inc-supplemental-notice-that-initial-market-based-rate-filing-includes-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25674/astoria-energy-ii-llc-supplemental-notice-that-initial-market-based-rate-filing-includes-request-for",
"https://www.federalregister.gov/articles/2010/10/13/2010-25671/transmission-vegetation-management-practices-notice-of-technical-conference",
"https://www.federalregister.gov/articles/2010/10/13/2010-25786/twenty-fourth-update-of-the-federal-agency-hazardous-waste-compliance-docket",
"https://www.federalregister.gov/articles/2010/10/13/2010-25444/2017-and-later-model-year-light-duty-vehicle-ghg-emissions-and-cafe-standards-notice-of-intent",
"https://www.federalregister.gov/articles/2010/10/13/2010-25787/revisions-to-epas-rule-on-protections-for-subjects-in-human-research-involving-pesticides",
"https://www.federalregister.gov/articles/2010/10/13/2010-25869/sunshine-act-notice-of-meeting",
"https://www.federalregister.gov/articles/2010/10/13/2010-25967/leif-erikson-day-2010",
"https://www.federalregister.gov/articles/2010/10/13/2010-25968/general-pulaski-memorial-day-2010",
"https://www.federalregister.gov/articles/2010/10/13/2010-25700/airworthiness-directives-pacific-aerospace-limited-model-fu24-954-and-fu24a-954-airplanes",
"https://www.federalregister.gov/articles/2010/10/13/2010-25780/notice-of-public-information-collections-being-reviewed-by-the-federal-communications-commission",
"https://www.federalregister.gov/articles/2010/10/13/2010-25778/notice-of-public-information-collections-being-reviewed-by-the-federal-communications-commission",
"https://www.federalregister.gov/articles/2010/10/13/2010-25752/notice-of-public-information-collections-being-submitted-to-omb-for-review-and-approval",
"https://www.federalregister.gov/articles/2010/10/13/2010-25933/sunshine-act-meeting-fcc-to-hold-open-commission-meeting-thursday-october-14-2010",
"https://www.federalregister.gov/articles/2010/10/13/2010-23858/wrc-07-table-clean-up-order",
"https://www.federalregister.gov/articles/2010/10/13/2010-25631/update-to-notice-of-financial-institutions-for-which-the-federal-deposit-insurance-corporation-has",
"https://www.federalregister.gov/articles/2010/10/13/2010-25664/proposed-flood-elevation-determinations",
"https://www.federalregister.gov/articles/2010/10/13/2010-25659/appraisal-subcommittee-notice-of-meeting",
"https://www.federalregister.gov/articles/2010/10/13/2010-25661/appraisal-subcommittee-notice-of-meeting",
"https://www.federalregister.gov/articles/2010/10/13/2010-25696/notice-of-final-federal-agency-actions-on-proposed-highway-in-vermont",
"https://www.federalregister.gov/articles/2010/10/13/2010-25697/notice-of-final-federal-agency-actions-on-the-route-250-bypass-interchange-at-mcintire-road-project",
"https://www.federalregister.gov/articles/2010/10/13/2010-25679/change-in-bank-control-notices-acquisitions-of-shares-of-a-bank-or-bank-holding-company",
"https://www.federalregister.gov/articles/2010/10/13/2010-25854/sunshine-act-notice-of-meeting",
"https://www.federalregister.gov/articles/2010/10/13/2010-25653/notice-of-request-for-the-approval-of-information-collection",
"https://www.federalregister.gov/articles/2010/10/13/2010-25656/notice-of-request-for-the-approval-of-information-collection",
"https://www.federalregister.gov/articles/2010/10/13/2010-25707/endangered-and-threatened-wildlife-and-plants-permit-habitat-conservation-plan-for-operation-and",
"https://www.federalregister.gov/articles/2010/10/13/2010-25687/cooperative-agreement-to-support-building-global-capacity-for-the-surveillance-and-monitoring-of",
"https://www.federalregister.gov/articles/2010/10/13/2010-25600/innovations-in-technology-for-the-treatment-of-diabetes-clinical-development-of-the-artificial",
"https://www.federalregister.gov/articles/2010/10/13/2010-25728/screening-framework-guidance-for-providers-of-synthetic-double-stranded-dna",
"https://www.federalregister.gov/articles/2010/10/13/2010-25657/agency-information-collection-activities-submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25705/current-list-of-laboratories-which-meet-minimum-standards-to-engage-in-urine-drug-testing-for",
"https://www.federalregister.gov/articles/2010/10/13/2010-25646/advisory-council-on-blood-stem-cell-transplantation-notice-of-meeting",
"https://www.federalregister.gov/articles/2010/10/13/2010-25676/national-toxicology-program-ntp-interagency-center-for-the-evaluation-of-alternative-toxicological",
"https://www.federalregister.gov/articles/2010/10/13/2010-25666/notice-of-issuance-of-final-determination-concerning-an-adflotm",
"https://www.federalregister.gov/articles/2010/10/13/2010-25764/announcement-of-funding-awards-for-the-self-help-homeownership-opportunity-program-shop-for-fiscal",
"https://www.federalregister.gov/articles/2010/10/13/2010-25785/reno-sparks-indian-colony-liquor-control-ordinance",
"https://www.federalregister.gov/articles/2010/10/13/2010-25754/national-register-of-historic-places-notification-of-pending-nominations-and-related-actions",
"https://www.federalregister.gov/articles/2010/10/13/2010-25753/national-register-of-historic-places-notification-of-pending-removal-of-listed-property",
"https://www.federalregister.gov/articles/2010/10/13/2010-25724/notice-of-availability-of-the-record-of-decision-for-the-chevron-energy-solutions-lucerne-valley",
"https://www.federalregister.gov/articles/2010/10/13/2010-25723/notice-of-availability-of-the-record-of-decision-for-the-imperial-valley-solar-project-and",
"https://www.federalregister.gov/articles/2010/10/13/2010-25690/notice-of-lodging-of-settlement-agreement-under-the-comprehensive-environmental-response",
"https://www.federalregister.gov/articles/2010/10/13/2010-25670/notice-of-lodging-of-consent-decree-under-sections-107a-and-113g2-of-the-comprehensive-environmental",
"https://www.federalregister.gov/articles/2010/10/13/2010-25773/agency-information-collection-activities-proposed-extension-with-change-of-a-previously-approved",
"https://www.federalregister.gov/articles/2010/10/13/2010-25739/keystone-steel-and-wire-company-grant-of-a-permanent-variance",
"https://www.federalregister.gov/articles/2010/10/13/2010-25790/sunshine-act-meetings",
"https://www.federalregister.gov/articles/2010/10/13/2010-25644/notice-of-permit-applications-received-under-the-antarctic-conservation-act-of-1978-pub-l-95-541",
"https://www.federalregister.gov/articles/2010/10/13/2010-25654/notice-of-permit-applications-received-under-the-antarctic-conservation-act-of-1978-pub-l-95-541",
"https://www.federalregister.gov/articles/2010/10/13/2010-25685/advisory-committee-for-mathematical-and-physical-sciences-notice-of-meeting",
"https://www.federalregister.gov/articles/2010/10/13/2010-25758/agency-information-collection-activities-proposed-collection-comment-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25783/draft-regulatory-guide-issuance-availability",
"https://www.federalregister.gov/articles/2010/10/13/2010-25862/sunshine-federal-register-notice",
"https://www.federalregister.gov/articles/2010/10/13/2010-25757/notice-of-availability-of-safety-evaluation-report-areva-enrichment-services-llc-eagle-rock",
"https://www.federalregister.gov/articles/2010/10/13/2010-25605/product-change-express-mail-negotiated-service-agreement",
"https://www.federalregister.gov/articles/2010/10/13/2010-25607/product-change-priority-mail-negotiated-service-agreement",
"https://www.federalregister.gov/articles/2010/10/13/2010-25610/product-change-priority-mail-negotiated-service-agreement",
"https://www.federalregister.gov/articles/2010/10/13/2010-25737/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25738/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25620/self-regulatory-organizations-fixed-income-clearing-corporation-order-approving-proposed-rule-change",
"https://www.federalregister.gov/articles/2010/10/13/2010-25624/self-regulatory-organizations-international-securities-exchange-llc-notice-of-filing-and-immediate",
"https://www.federalregister.gov/articles/2010/10/13/2010-25625/self-regulatory-organizations-financial-industry-regulatory-authority-inc-notice-of-filing-and",
"https://www.federalregister.gov/articles/2010/10/13/2010-25742/self-regulatory-organizations-nasdaq-omx-bx-inc-notice-of-filing-and-immediate-effectiveness-of",
"https://www.federalregister.gov/articles/2010/10/13/2010-25740/self-regulatory-organizations-financial-industry-regulatory-authority-inc-notice-of-filing-and",
"https://www.federalregister.gov/articles/2010/10/13/2010-25621/self-regulatory-organizations-nyse-arca-inc-notice-of-filing-of-a-proposed-rule-change-relating-to",
"https://www.federalregister.gov/articles/2010/10/13/2010-25622/self-regulatory-organizations-national-stock-exchange-inc-notice-of-filing-and-immediate",
"https://www.federalregister.gov/articles/2010/10/13/2010-25623/self-regulatory-organizations-financial-industry-regulatory-authority-inc-notice-of-filing-of",
"https://www.federalregister.gov/articles/2010/10/13/2010-25361/disclosure-for-asset-backed-securities-required-by-section-943-of-the-dodd-frank-wall-street-reform",
"https://www.federalregister.gov/articles/2010/10/13/2010-25628/data-collection-available-for-public-comments-and-recommendations",
"https://www.federalregister.gov/articles/2010/10/13/2010-25627/arizona-disaster-az-00012",
"https://www.federalregister.gov/articles/2010/10/13/2010-25618/iowa-disaster-number-ia-00024",
"https://www.federalregister.gov/articles/2010/10/13/2010-25727/national-small-business-development-center-advisory-board-meeting",
"https://www.federalregister.gov/articles/2010/10/13/2010-25734/persons-and-entities-on-whom-sanctions-have-been-imposed-under-the-iran-sanctions-act-of-1996",
"https://www.federalregister.gov/articles/2010/10/13/2010-25750/30-day-notice-of-proposed-information-collection-form-ds-5504-application-for-a-us-passport-name",
"https://www.federalregister.gov/articles/2010/10/13/2010-25749/30-day-notice-of-proposed-information-collection-form-ds-3053-statement-of-consent-or-special",
"https://www.federalregister.gov/articles/2010/10/13/2010-25735/30-day-notice-of-proposed-information-collection-form-ds-11-application-for-a-us-passport-omb",
"https://www.federalregister.gov/articles/2010/10/13/2010-25733/30-day-notice-of-proposed-information-collection-form-ds-82-us-passport-renewal-application-for",
"https://www.federalregister.gov/articles/2010/10/13/2010-25732/30-day-notice-of-proposed-information-collection-form-ds-4085-application-for-additional-visa-pages",
"https://www.federalregister.gov/articles/2010/10/13/2010-25748/culturally-significant-objects-imported-for-exhibition-determinations-indias-fabled-city-the-art-of",
"https://www.federalregister.gov/articles/2010/10/13/2010-25613/re-delegation-by-the-under-secretary-of-state-to-the-director-office-of-chemical-and-biological",
"https://www.federalregister.gov/articles/2010/10/13/2010-25704/eastern-berks-gateway-railroad-company-modified-rail-certificate-in-berks-county-pa",
"https://www.federalregister.gov/articles/2010/10/13/2010-25760/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2010/10/13/2010-25726/senior-executive-service-legal-division-performance-review-board",
"https://www.federalregister.gov/articles/2010/10/13/2010-25756/privacy-act-of-1974-proposed-implementation",
"https://www.federalregister.gov/articles/2010/10/22/2010-27004/white-house-initiative-on-educational-excellence-for-hispanics",
"https://www.federalregister.gov/articles/2010/10/29/2010-26531/program-integrity-issues",
"https://www.federalregister.gov/articles/2010/09/03/2010-22279/no-title-available",
"https://www.federalregister.gov/articles/2010/09/07/2010-22434/continuation-of-the-exercise-of-certain-authorities-under-the-trading-with-the-enemy-act",
"https://www.federalregister.gov/articles/2010/09/28/2010-24338/endangered-and-threatened-wildlife-and-plants-determination-of-endangered-status-for-the-african",
"https://www.federalregister.gov/articles/2011/08/02/2011-17162/endangered-and-threatened-wildlife-and-plants-listing-23-species-on-oahu-as-endangered-and",
"https://www.federalregister.gov/articles/2011/08/03/2011-19620/food-labeling-gluten-free-labeling-of-foods-reopening-of-the-comment-period",
"https://www.federalregister.gov/articles/2011/08/03/2011-19421/security-ratings",
"https://www.federalregister.gov/articles/2011/08/09/2011-20112/nrc-enforcement-policy",
"https://www.federalregister.gov/articles/2011/08/18/2011-21062/surinder-dang-md-revocation-of-registration",
"https://www.federalregister.gov/articles/2011/12/05/2011-31090/national-forest-system-invasive-species-management-policy",
"https://www.federalregister.gov/articles/2011/12/05/2011-31097/newspapers-used-for-publication-of-legal-notices-in-the-southwestern-region-which-includes-arizona",
"https://www.federalregister.gov/articles/2011/12/05/2011-31150/notice-of-request-for-extension-of-a-currently-approved-information-collection",
"https://www.federalregister.gov/articles/2011/12/05/2011-30992/prior-label-approval-system-generic-label-approval",
"https://www.federalregister.gov/articles/2011/12/05/2011-31083/common-crop-insurance-regulations-prune-crop-insurance-provisions",
"https://www.federalregister.gov/articles/2011/12/05/2011-31085/general-administrative-regulations-mutual-consent-cancellation-food-security-act-of-1985",
"https://www.federalregister.gov/articles/2011/12/05/2011-31141/proposed-establishment-of-the-inwood-valley-viticultural-area",
"https://www.federalregister.gov/articles/2011/12/05/2011-31142/revisions-to-distilled-spirits-plant-operations-reports-and-regulations",
"https://www.federalregister.gov/articles/2011/12/05/2011-31089/accessibility-guidelines-for-pedestrian-facilities-in-the-public-right-of-way-reopening-of-comment",
"https://www.federalregister.gov/articles/2011/12/05/2011-31113/proposed-information-collection-comment-request-current-population-survey-cps-fertility-supplement",
"https://www.federalregister.gov/articles/2011/12/05/2011-31108/agency-forms-undergoing-paperwork-reduction-act-review",
"https://www.federalregister.gov/articles/2011/12/05/2011-31095/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31094/proposed-information-collection-comment-request-west-coast-groundfish-trawl-economic-data-collection",
"https://www.federalregister.gov/articles/2011/12/05/2011-31178/stainless-steel-plate-in-coils-from-belgium-notice-of-extension-of-time-limit-for-preliminary",
"https://www.federalregister.gov/articles/2011/12/05/2011-31148/polyethylene-terephthalate-film-sheet-and-strip-from-korea-notice-of-rescission-of-antidumping-duty",
"https://www.federalregister.gov/articles/2011/12/05/2011-31061/certain-steel-nails-from-the-peoples-republic-of-china-final-rescission-of-antidumping-duty-new",
"https://www.federalregister.gov/articles/2011/12/05/2011-31147/certain-helical-spring-lock-washers-from-taiwan-and-the-peoples-republic-of-china-continuation-of",
"https://www.federalregister.gov/articles/2011/12/05/2011-31140/approval-for-subzone-expansion-and-expansion-of-manufacturing-authority-foreign-trade-subzone-124b",
"https://www.federalregister.gov/articles/2011/12/05/2011-31138/technology-advisory-committee",
"https://www.federalregister.gov/articles/2011/12/05/2011-31030/streamlining-inherited-regulations",
"https://www.federalregister.gov/articles/2011/12/05/2011-31111/defense-federal-acquisition-regulation-supplement-open-source-software-public-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31118/plan-for-conduct-of-2012-electric-transmission-congestion-study",
"https://www.federalregister.gov/articles/2011/12/05/2011-31120/state-energy-advisory-board-steab",
"https://www.federalregister.gov/articles/2011/12/05/2011-31122/state-energy-advisory-board-steab",
"https://www.federalregister.gov/articles/2011/12/05/2011-31124/record-of-decision-for-the-modification-of-the-groton-generation-station-interconnection-agreement",
"https://www.federalregister.gov/articles/2011/12/05/2011-31115/reducing-regulatory-burden",
"https://www.federalregister.gov/articles/2011/12/05/2011-31189/approval-and-promulgation-of-implementation-plans-state-of-tennessee-prevention-of-significant",
"https://www.federalregister.gov/articles/2011/12/05/2011-31191/approval-and-promulgation-of-implementation-plans-georgia-110a1-and-2-infrastructure-requirements",
"https://www.federalregister.gov/articles/2011/12/05/2011-30786/revisions-to-the-california-state-implementation-plan-placer-county-air-pollution-control-district",
"https://www.federalregister.gov/articles/2011/12/05/2011-31137/significant-new-use-rules-on-certain-chemical-substances-withdrawal-of-two-chemical-substances",
"https://www.federalregister.gov/articles/2011/12/05/2011-30787/revisions-to-the-california-state-implementation-plan-placer-county-air-pollution-control-district",
"https://www.federalregister.gov/articles/2011/12/05/2011-31130/transportation-conformity-rule-moves-regional-grace-period-extension",
"https://www.federalregister.gov/articles/2011/12/05/2011-31319/farm-credit-administration-board-sunshine-act-regular-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-30939/airworthiness-directives-eurocopter-france-model-ec-120b-helicopters",
"https://www.federalregister.gov/articles/2011/12/05/2011-31143/information-collection-being-submitted-to-the-office-of-management-and-budget-for-review-and",
"https://www.federalregister.gov/articles/2011/12/05/2011-31144/information-collections-being-submitted-for-review-and-approval-to-the-office-of-management-and",
"https://www.federalregister.gov/articles/2011/12/05/2011-31251/sunshine-act-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31228/sunshine-act-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31156/qualification-of-drivers-exemption-applications-vision",
"https://www.federalregister.gov/articles/2011/12/05/2011-31151/qualification-of-drivers-exemption-applications-vision",
"https://www.federalregister.gov/articles/2011/12/05/2011-31164/qualification-of-drivers-exemption-applications-vision",
"https://www.federalregister.gov/articles/2011/12/05/2011-31058/safety-advisory-2011-03",
"https://www.federalregister.gov/articles/2011/12/05/2011-31051/formations-of-acquisitions-by-and-mergers-of-bank-holding-companies",
"https://www.federalregister.gov/articles/2011/12/05/2011-31126/formations-of-acquisitions-by-and-mergers-of-bank-holding-companies",
"https://www.federalregister.gov/articles/2011/12/05/2011-31052/change-in-bank-control-notices-acquisitions-of-shares-of-a-savings-and-loan-holding-company",
"https://www.federalregister.gov/articles/2011/12/05/2011-31053/change-in-bank-control-notices-acquisitions-of-shares-of-a-bank-or-bank-holding-company",
"https://www.federalregister.gov/articles/2011/12/05/2011-31082/agency-information-collection-activities-request-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31158/facebook-inc-analysis-of-proposed-consent-order-to-aid-public-comment",
"https://www.federalregister.gov/articles/2011/12/05/2011-31107/endangered-and-threatened-species-permit-applications",
"https://www.federalregister.gov/articles/2011/12/05/2011-31104/sport-fishing-and-boating-partnership-council",
"https://www.federalregister.gov/articles/2011/12/05/2011-31198/endangered-and-threatened-wildlife-and-plants-6-month-extension-of-final-determination-for-the",
"https://www.federalregister.gov/articles/2011/12/05/2011-31146/determination-that-demulen-150-28-ethinyl-estradiol-ethynodiol-diacetate-tablet-and-four-other-drug",
"https://www.federalregister.gov/articles/2011/12/05/2011-31105/sedasys-computer-assisted-personalized-sedation-system-ethicon-endo-surgery-incorporateds-petition",
"https://www.federalregister.gov/articles/2011/12/05/2011-31059/current-list-of-laboratories-and-instrumented-initial-testing-facilities-which-meet-minimum",
"https://www.federalregister.gov/articles/2011/12/05/2011-31154/national-institute-of-allergy-and-infectious-diseases-notice-of-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31157/national-institute-of-biomedical-imaging-and-bioengineering-notice-of-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31155/national-institute-of-allergy-and-infectious-diseases-notice-of-meetings",
"https://www.federalregister.gov/articles/2011/12/05/2011-31149/national-cancer-institute-amended-notice-of-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31114/agency-information-collection-activities-form-i-690-revision-of-an-existing-information-collection",
"https://www.federalregister.gov/articles/2011/12/05/2011-31062/agency-information-collection-activities-solicitation-of-proposal-information-for-award-of-public",
"https://www.federalregister.gov/articles/2011/12/05/2011-31194/agency-information-collection-activities-declaration-of-owner-and-declaration-of-consignee-when",
"https://www.federalregister.gov/articles/2011/12/05/2011-31181/agency-information-collection-activities-dominican-republic-central-america-united-states-free-trade",
"https://www.federalregister.gov/articles/2011/12/05/2011-30938/homeless-emergency-assistance-and-rapid-transition-to-housing-emergency-solutions-grants-program-and",
"https://www.federalregister.gov/articles/2011/12/05/2011-30942/homeless-emergency-assistance-and-rapid-transition-to-housing-defining-homeless",
"https://www.federalregister.gov/articles/2011/12/05/2011-31116/announcement-of-vacancy-on-the-osage-tribal-education-committee",
"https://www.federalregister.gov/articles/2011/12/05/2011-31125/alaska-native-claims-selection",
"https://www.federalregister.gov/articles/2011/12/05/2011-31123/alaska-native-claims-selection",
"https://www.federalregister.gov/articles/2011/12/05/2011-31084/information-collection-activities-pipelines-and-pipeline-rights-of-way-submitted-for-office-of",
"https://www.federalregister.gov/articles/2011/12/05/2011-31070/notice-of-intent-to-repatriate-a-cultural-item-kingman-museum-inc-battle-creek-mi",
"https://www.federalregister.gov/articles/2011/12/05/2011-31077/notice-of-inventory-completion-minnesota-indian-affairs-council-bemidji-mn",
"https://www.federalregister.gov/articles/2011/12/05/2011-31075/notice-of-inventory-completion-minnesota-indian-affairs-council-bemidji-mn",
"https://www.federalregister.gov/articles/2011/12/05/2011-31074/notice-of-inventory-completion-minnesota-indian-affairs-council-bemidji-mn",
"https://www.federalregister.gov/articles/2011/12/05/2011-31072/notice-of-inventory-completion-minnesota-indian-affairs-council-bemidji-mn",
"https://www.federalregister.gov/articles/2011/12/05/2011-31068/notice-of-inventory-completion-the-university-of-california-san-diego-san-diego-ca",
"https://www.federalregister.gov/articles/2011/12/05/2011-31071/notice-of-inventory-completion-minnesota-indian-affairs-council-bemidji-mn",
"https://www.federalregister.gov/articles/2011/12/05/2011-31121/notice-of-application-for-withdrawal-extension-and-opportunity-for-public-meeting-wyoming",
"https://www.federalregister.gov/articles/2011/12/05/2011-31119/notice-of-application-for-withdrawal-extension-and-opportunity-for-public-meeting-oregon",
"https://www.federalregister.gov/articles/2011/12/05/2011-31180/taxpayer-advocacy-panel-meeting-cancellation",
"https://www.federalregister.gov/articles/2011/12/05/2011-31176/treasury-inflation-protected-securities-issued-at-a-premium",
"https://www.federalregister.gov/articles/2011/12/05/2011-31169/targeted-populations-under-section-45de2",
"https://www.federalregister.gov/articles/2011/12/05/2011-31179/treasury-inflation-protected-securities-issued-at-a-premium",
"https://www.federalregister.gov/articles/2011/12/05/2011-31320/sunshine-act-meeting-notice",
"https://www.federalregister.gov/articles/2011/12/05/2011-31321/sunshine-act-meeting-notice",
"https://www.federalregister.gov/articles/2011/12/05/2011-31132/certain-inkjet-ink-supplies-and-components-thereof-final-determination-of-violation-termination-of",
"https://www.federalregister.gov/articles/2011/12/05/2011-31134/certain-electronic-imaging-devices-commission-determination-to-affirm-finding-of-no-violation",
"https://www.federalregister.gov/articles/2011/12/05/2011-31135/certain-video-game-systems-and-controllers-investigations-terminations-modifications-and-rulings",
"https://www.federalregister.gov/articles/2011/12/05/2011-31192/meeting-of-the-advisory-committee",
"https://www.federalregister.gov/articles/2011/12/05/2011-31098/notice-of-lodging-of-consent-decree-under-the-clean-water-act",
"https://www.federalregister.gov/articles/2011/12/05/2011-31145/notice-of-lodging-of-modification-of-consent-decree-under-the-clean-water-act",
"https://www.federalregister.gov/articles/2011/12/05/2011-31200/sunshine-act-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31202/sunshine-act-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-30654/revising-standards-referenced-in-the-acetylene-standard",
"https://www.federalregister.gov/articles/2011/12/05/2011-30653/revising-standards-referenced-in-the-acetylene-standard",
"https://www.federalregister.gov/articles/2011/12/05/2011-31092/agency-information-collection-activity-under-omb-review-reports-forms-and-recordkeeping-requirements",
"https://www.federalregister.gov/articles/2011/12/05/2011-31093/requested-administrative-waiver-of-the-coastwise-trade-laws-vessel-chrysalis-invitation-for-public",
"https://www.federalregister.gov/articles/2011/12/05/2011-31076/requested-administrative-waiver-of-the-coastwise-trade-laws-vessel-naga-invitation-for-public",
"https://www.federalregister.gov/articles/2011/12/05/2011-31091/requested-administrative-waiver-of-the-coastwise-trade-laws-vessel-pangaea-invitation-for-public",
"https://www.federalregister.gov/articles/2011/12/05/2011-31185/nasa-advisory-council-science-committee-planetary-science-subcommittee-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31203/sunshine-act-meetings-correction",
"https://www.federalregister.gov/articles/2011/12/05/2011-31086/agency-information-collection-activities-submission-to-omb-for-new-collection-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31087/agency-information-collection-activities-submission-to-omb-for-a-new-collection-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31088/agency-information-collection-activities-submission-to-omb-for-review-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31219/national-science-board-sunshine-act-meetings-notice",
"https://www.federalregister.gov/articles/2011/12/05/2011-31067/proposal-review-notice-of-meetings",
"https://www.federalregister.gov/articles/2011/12/05/2011-31012/emergency-planning-guidance-for-nuclear-power-plants",
"https://www.federalregister.gov/articles/2011/12/05/2011-31054/hazardous-materials-emergency-restrictionprohibition-order",
"https://www.federalregister.gov/articles/2011/12/05/2011-31127/post-office-closing",
"https://www.federalregister.gov/articles/2011/12/05/2011-31129/post-office-closing",
"https://www.federalregister.gov/articles/2011/12/05/2011-31128/post-office-closing",
"https://www.federalregister.gov/articles/2011/12/05/2011-31079/international-product-and-price-changes",
"https://www.federalregister.gov/articles/2011/12/05/2011-31187/presidents-council-of-advisors-on-science-and-technology-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31101/proposed-collection-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31103/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31102/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31100/submission-for-omb-review-comment-request",
"https://www.federalregister.gov/articles/2011/12/05/2011-31264/sunshine-act-meeting",
"https://www.federalregister.gov/articles/2011/12/05/2011-31099/alliancebernstein-cap-fund-inc-et-al-notice-of-application",
"https://www.federalregister.gov/articles/2011/12/05/2011-31043/self-regulatory-organizations-nasdaq-omx-phlx-llc-order-approving-proposed-rule-change-to-amend-the",
"https://www.federalregister.gov/articles/2011/12/05/2011-31110/self-regulatory-organizations-the-nasdaq-stock-market-llc-notice-of-filing-and-immediate",
"https://www.federalregister.gov/articles/2011/12/05/2011-31045/self-regulatory-organizations-nyse-arca-inc-notice-of-filing-of-proposed-rule-change-relating-to-the",
"https://www.federalregister.gov/articles/2011/12/05/2011-31044/self-regulatory-organizations-nyse-arca-inc-notice-of-filing-of-proposed-rule-change-relating-to-the",
"https://www.federalregister.gov/articles/2011/12/05/2011-31261/zipglobal-holdings-inc-symbollon-pharmaceuticals-inc-microholdings-us-inc-comcam-international-inc",
"https://www.federalregister.gov/articles/2011/12/05/2011-31069/revocation-of-license-of-small-business-investment-company",
"https://www.federalregister.gov/articles/2011/12/05/2011-31159/culturally-significant-objects-imported-for-exhibition-determinations-works-of-art-coming-to-the-us",
"https://www.federalregister.gov/articles/2011/12/21/2011-32465/service-rules-and-policies-for-the-broadcasting-satellite-service-bss",
"https://www.federalregister.gov/articles/2011/12/21/2011-32073/risk-based-capital-guidelines-market-risk-alternatives-to-credit-ratings-for-debt-and-securitization",
"https://www.federalregister.gov/articles/2011/12/23/2011-31648/commercial-and-industrial-solid-waste-incineration-units-reconsideration-and-proposed-amendments",
"https://www.federalregister.gov/articles/2011/12/23/2011-33089/instituting-a-national-action-plan-on-women-peace-and-security",
"https://www.federalregister.gov/articles/2011/12/23/2011-33087/adjustments-of-certain-rates-of-pay",
"https://www.federalregister.gov/articles/2011/06/20/2011-14046/folding-metal-tables-and-chairs-from-the-peoples-republic-of-china-preliminary-results-of",
"https://www.federalregister.gov/articles/2011/06/20/2011-15443/establishment-of-the-selectusa-initiative",
"https://www.federalregister.gov/articles/2011/06/20/2011-15439/suspension-of-limitations-under-the-jerusalem-embassy-act",
"https://www.federalregister.gov/articles/2011/06/20/2011-15441/unexpected-urgent-refugee-and-migration-needs-related-to-libya-and-cocircte-divoire",
"https://www.federalregister.gov/articles/2011/06/20/2011-15178/truth-in-lending",
"https://www.federalregister.gov/articles/2011/07/01/2011-14981/review-of-new-sources-and-modifications-in-indian-country",
"https://www.federalregister.gov/articles/2011/07/01/2011-16727/notice-of-order-soliciting-community-proposals",
"https://www.federalregister.gov/articles/2011/03/11/2011-5903/extending-provisions-of-the-international-organizations-immunities-act-to-the-office-of-the-high",
"https://www.federalregister.gov/articles/2011/05/25/2011-13173/authorizing-the-implementation-of-certain-sanctions-set-forth-in-the-iran-sanctions-act-of-1996-as",
"https://www.federalregister.gov/articles/2011/05/31/2011-12853/federal-acquisition-regulation-prohibition-on-contracting-with-inverted-domestic-corporations",
"https://www.federalregister.gov/articles/2011/11/28/2011-30331/financial-crimes-enforcement-network-amendment-to-the-bank-secrecy-act-regulations-imposition-of",
"https://www.federalregister.gov/articles/2011/10/11/2011-26169/request-to-consider-automatic-termination-controls",
"https://www.federalregister.gov/articles/2011/10/11/2011-26331/fiscal-year-2012-refugee-admissions-numbers-and-authorizations-of-in-country-refugee-status-pursuant",
"https://www.federalregister.gov/articles/2011/10/11/2011-26333/presidential-determination-with-respect-to-foreign-governments-efforts-regarding-trafficking-in",
"https://www.federalregister.gov/articles/2011/10/24/2011-27340/proposed-agency-information-collection-activities-comment-request",
"https://www.federalregister.gov/articles/2011/10/25/2011-27718/certification-and-determination-with-respect-to-the-child-soldiers-prevention-act-of-2008",
"https://www.federalregister.gov/articles/2011/09/15/2011-20740/greenhouse-gas-emissions-standards-and-fuel-efficiency-standards-for-medium--and-heavy-duty-engines",
"https://www.federalregister.gov/articles/2011/09/15/2011-23891/developing-an-integrated-strategic-counterterrorism-communications-initiative-and-establishing-a",
"https://www.federalregister.gov/articles/2011/09/15/2011-23938/continuation-of-the-exercise-of-certain-authorities-under-the-trading-with-the-enemy-act",
"https://www.federalregister.gov/articles/2012/04/24/2012-9823/reorganization-and-expansion-of-foreign-trade-zone-109-under-alternative-site-framework-jefferson",
"https://www.federalregister.gov/articles/2012/04/24/2012-10034/blocking-the-property-and-suspending-entry-into-the-united-states-of-certain-persons-with-respect-to",
"https://www.federalregister.gov/articles/2012/04/25/2012-9929/self-regulatory-organizations-edga-exchange-inc-edgx-exchange-inc-international-securities-exchange",
"https://www.federalregister.gov/articles/2012/08/01/2012-18747/james-william-eisenberg-md-decision-and-order",
"https://www.federalregister.gov/articles/2012/08/01/2012-18868/white-house-initiative-on-educational-excellence-for-african-americans",
"https://www.federalregister.gov/articles/2012/08/15/2012-20020/information-collections-being-submitted-for-review-and-approval-to-the-office-of-management-and",
"https://www.federalregister.gov/articles/2012/12/14/2012-29789/enterysys-corporation-with-last-known-addresses-of-1307-muench-court-san-jose-ca-95131-and-plot-no",
"https://www.federalregister.gov/articles/2012/12/14/2012-30310/establishing-the-hurricane-sandy-rebuilding-task-force",
"https://www.federalregister.gov/articles/2012/12/14/2012-30347/suspension-of-limitations-under-the-jerusalem-embassy-act",
"https://www.federalregister.gov/articles/2012/12/21/2012-30724/notice-pursuant-to-the-national-cooperative-research-and-production-act-of-1993-telemanagement-forum",
"https://www.federalregister.gov/articles/2012/12/28/2012-31225/closing-of-executive-departments-and-agencies-of-the-federal-government-on-monday-december-24-2012",
"https://www.federalregister.gov/articles/2012/02/24/2012-3390/commodity-pool-operators-and-commodity-trading-advisors-compliance-obligations",
"https://www.federalregister.gov/articles/2012/01/10/2012-216/decision-and-order-granting-a-waiver-to-samsung-from-the-department-of-energy-residential",
"https://www.federalregister.gov/articles/2012/01/27/2012-1681/energy-conservation-program-test-procedures-for-general-service-fluorescent-lamps-general-service",
"https://www.federalregister.gov/articles/2012/06/27/2012-15954/blocking-property-of-the-government-of-the-russian-federation-relating-to-the-disposition-of-highly",
"https://www.federalregister.gov/articles/2012/03/02/2012-4475/federal-acquisition-regulation-women-owned-small-business-wosb-program",
"https://www.federalregister.gov/articles/2012/03/23/2012-6331/medicare-and-medicaid-programs-approval-of-the-application-by-the-american-association-for",
"https://www.federalregister.gov/articles/2012/03/23/2012-6598/medicare-and-medicaid-programs-approval-of-the-community-health-accreditation-program-for-continued",
"https://www.federalregister.gov/articles/2012/03/28/2012-7208/benzidine-based-chemical-substances-di-n",
"https://www.federalregister.gov/articles/2012/05/15/2012-11775/nationwide-health-information-network-conditions-for-trusted-exchange",
"https://www.federalregister.gov/articles/2012/05/17/2012-12000/updating-state-residential-building-energy-efficiency-codes",
"https://www.federalregister.gov/articles/2012/10/02/2012-24265/newspapers-to-be-used-for-publication-of-legal-notice-of-appealable-decisions-and-publication-of",
"https://www.federalregister.gov/articles/2012/10/02/2012-24374/strengthening-protections-against-trafficking-in-persons-in-federal-contracts",
"https://www.federalregister.gov/articles/2012/10/10/2012-25038/determination-with-respect-to-the-child-soldiers-prevention-act-of-2008",
"https://www.federalregister.gov/articles/2012/10/10/2012-25035/fiscal-year-2013-refugee-admissions-numbers-and-authorizations-of-in-country-refugee-status-pursuant",
"https://www.federalregister.gov/articles/2012/10/12/2012-25236/authorizing-the-implementation-of-certain-sanctions-set-forth-in-the-iran-threat-reduction-and-syria",
"https://www.federalregister.gov/articles/2013/08/15/2013-19557/regulation-of-fuels-and-fuel-additives-2013-renewable-fuel-standards",
"https://www.federalregister.gov/articles/2013/01/22/2013-01272/engaging-in-public-health-research-on-the-causes-and-prevention-of-gun-violence",
"https://www.federalregister.gov/articles/2013/01/22/2013-01274/improving-availability-of-relevant-executive-branch-records-to-the-national-instant-criminal",
"https://www.federalregister.gov/articles/2013/01/22/2013-01278/tracing-of-firearms-in-connection-with-criminal-investigations",
"https://www.federalregister.gov/articles/2013/01/22/2013-01296/continuation-of-the-national-emergency-with-respect-to-terrorists-who-threaten-to-disrupt-the-middle",
"https://www.federalregister.gov/articles/2013/01/22/2013-01267/religious-freedom-day-2013",
"https://www.federalregister.gov/articles/2013/03/26/2013-06943/proposed-modification-of-class-d-and-class-e-airspace-and-establishment-of-class-e-airspace-pasco-wa",
"https://www.federalregister.gov/articles/2013/05/21/2013-08500/control-of-air-pollution-from-motor-vehicles-tier-3-motor-vehicle-emission-and-fuel-standards",
"https://www.federalregister.gov/articles/2014/04/28/2014-06954/control-of-air-pollution-from-motor-vehicles-tier-3-motor-vehicle-emission-and-fuel-standards",
"https://www.federalregister.gov/articles/2014/08/06/2014-18552/takes-of-marine-mammals-incidental-to-specified-activities-taking-marine-mammals-incidental-to-a",
"https://www.federalregister.gov/articles/2014/08/15/2014-12164/national-pollutant-discharge-elimination-system-final-regulations-to-establish-requirements-for",
"https://www.federalregister.gov/articles/2014/08/15/2014-19381/benefits-payable-in-terminated-single-employer-plans-interest-assumptions-for-paying-benefits",
"https://www.federalregister.gov/articles/2014/12/16/2014-29203/endangered-and-threatened-wildlife-and-plants-12-month-finding-for-the-eastern-taiwan-strait",
"https://www.federalregister.gov/articles/2014/12/22/2014-28927/introduction-to-the-unified-agenda-of-federal-regulatory-and-deregulatory-actions",
"https://www.federalregister.gov/articles/2014/02/03/2014-02082/chemical-facility-anti-terrorism-standards-personnel-surety-program",
"https://www.federalregister.gov/articles/2014/07/08/2014-15842/takes-of-marine-mammals-incidental-to-specified-activities-marine-geophysical-survey-in-the",
"https://www.federalregister.gov/articles/2014/07/10/2014-15432/flight-simulation-training-device-qualification-standards-for-extended-envelope-and-adverse-weather",
"https://www.federalregister.gov/articles/2014/07/11/2014-15840/medicare-program-end-stage-renal-disease-prospective-payment-system-quality-incentive-program-and",
"https://www.federalregister.gov/articles/2014/07/28/2014-17750/notice-of-inventory-completion-illinois-state-museum-springfield-il",
"https://www.federalregister.gov/articles/2014/03/31/2014-07123/fisheries-of-the-northeastern-united-states-summer-flounder-scup-and-black-sea-bass-fisheries-2014",
"https://www.federalregister.gov/articles/2014/05/01/2014-09084/lowering-miners-exposure-to-respirable-coal-mine-dust-including-continuous-personal-dust-monitors",
"https://www.federalregister.gov/articles/2014/05/05/2014-10085/energy-conservation-program-certification-of-commercial-heating-ventilation-and-air-conditioning",
"https://www.federalregister.gov/articles/2014/11/06/2014-26182/medicare-program-end-stage-renal-disease-prospective-payment-system-quality-incentive-program-and",
"https://www.federalregister.gov/articles/2014/11/12/2014-26782/office-of-the-chief-of-protocol-gifts-to-federal-employees-from-foreign-government-sources-reported",
"https://www.federalregister.gov/articles/2014/11/20/2014-27109/endangered-and-threatened-wildlife-and-plants-threatened-status-for-gunnison-sage-grouse",
"https://www.federalregister.gov/articles/2014/10/01/2014-23338/takes-of-marine-mammals-incidental-to-specified-activities-taking-marine-mammals-incidental-to-a",
"https://www.federalregister.gov/articles/2014/10/08/2014-23985/takes-of-marine-mammals-incidental-to-specified-activities-low-energy-marine-geophysical-survey-in",
"https://www.federalregister.gov/articles/2014/10/21/2014-24989/protection-of-stratospheric-ozone-determination-29-for-significant-new-alternatives-policy-program"
  ];

  missing.forEach(function(value, index) { 
    var articleName = /(20\d\d-\d+)/.exec(value);
    articleName = "missing/" + articleName[1].toString() + ".html";
    if (!articleName) {
      console.log("Error with: " + url);
    } else {
      doIt(value, articleName);
    }
  });

//doIt("https://www.federalregister.gov/articles/2014/06/13/2014-13128/semiannual-agenda", "runTest.html");


