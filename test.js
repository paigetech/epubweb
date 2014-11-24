var selection = "<h1>this is a test</h1><h2>\n<a href=\"/topics/administrative-practice-procedure\">Administrative practice and procedure</a> </li> <li> <a href=\"/topics/health-facilities\">Health facilities</a> </li> <li> <a href=\"/topics/health-professions\">Health professions</a> </li>";

//do the replacements
var replacements = {
  "<h(\\d)>" : "<p><b>$1"
}

var result;


for (var key in replacements) {
  if (replacements.hasOwnProperty(key)) {
    var result = selection.replace((new RegExp(key, "g")), replacements[key]);
  }
}

var re = /\/topics\/([\w\-\d]+)\"/g;
var matches = re.exec(result);

while( (res = re.exec(result)) !== null ){
  matches.push(res[1]);
}


result = matches.toString() + result;

console.log("Test: " + result);
