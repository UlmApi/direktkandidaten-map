var fs = require('fs');

/* res = {key: value, wahlbezirk: 100, ...} */
var wahlkreis_age = {};
var data = fs.readFileSync('../data/bewerber-btw13.csv', 'utf8');
data = data.split('\n');
var partei_liste = ["BP"];

/* omit header row */
data = data.splice(1); 


/* prepare */
for (var i in data) {
	var line = data[i].split(';');
	if (line.length <= 1) continue;

	var age = (new Date().getFullYear()) - line[1];
	var partei = line[5];

	if (line[8] == undefined)
		console.log(line.length)
	var wahlkreis = line[8].replace("\r","");

	for (var p in partei_liste) {
		if (partei === partei_liste[p]) {
			if (wahlkreis_age[wahlkreis] == undefined)
				wahlkreis_age[wahlkreis] = [];

			wahlkreis_age[wahlkreis].push(age);
		}
	}

	//console.log(age + " " + line[8]);
	//console.log(line[5]);
}

/* get durchnittswert */
var res = [];
for (var i in wahlkreis_age) {
	//console.log(i)
	var sum = wahlkreis_age[i].reduce(function(pv, cv) { return pv + cv; }, 0);
	res.push( {"key": i, "value": sum / wahlkreis_age[i].length} );
}

console.log( JSON.stringify(res, null, "\t") );
