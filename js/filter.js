var data = {
	age: function(parteien) {
		/* res = {key: value, wahlbezirk: 100, ...} */
		var wahlkreis_age = {};

		/* prepare wahlkreis_age */
		for (var i in dk.bewerber) {
			var age = (new Date().getFullYear()) - dk.bewerber.geburtsjahr;

			for (var p in parteien) {
				if (dk.bewerber.partei === parteien[p]) {
					if (wahlkreis_age[dk.bewerber.wahlkreis] == undefined)
						wahlkreis_age[dk.bewerber.wahlkreis] = [];

					wahlkreis_age[wahlkreis].push(age);
				}
			}
		}

		/* get average age value */
		var res = [];
		for (var i in wahlkreis_age) {
			//console.log(i)
			var sum = wahlkreis_age[i].reduce(function(pv, cv) { return pv + cv; }, 0);
			res.push( {"key": i, "value": sum / wahlkreis_age[i].length} );
		}

		//console.log( JSON.stringify(res, null, "\t") );
		return res;
	}
}


