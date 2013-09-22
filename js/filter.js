var data = {
	age: function(parteien) {
		/* res = {key: value, wahlbezirk: 100, ...} */
		var wahlkreis_age = {};

		/* prepare wahlkreis_age */
		for ( var i in dk.bewerber) {
			var bewerber = dk.bewerber[i];
			var age = (new Date().getFullYear()) - bewerber.geburtsjahr;

			for ( var p in parteien) {
				if (bewerber.partei === parteien[p]) {
					if (wahlkreis_age[bewerber.wahlkreis] == undefined)
						wahlkreis_age[bewerber.wahlkreis] = [];

					wahlkreis_age[bewerber.wahlkreis].push(age);
				}
			}
		}

		/* get average age value */
		var res = [];
		for ( var i in wahlkreis_age) {
			// console.log(i)
			var sum = wahlkreis_age[i].reduce(function(pv, cv) {
				return pv + cv;
			}, 0);
			res.push({
				"key": i,
				"value": sum / wahlkreis_age[i].length
			});
		}

		return res;
	},

	gender: function(parteien) {
		/* res = {key: value, wahlbezirk: 100, ...} */
		var wahlkreis_gender_m = {};
		var wahlkreis_gender_w = {};

		// -1 + 2 * maennlich

		/* prepare wahlkreis_gender */
		for ( var i in dk.bewerber) {
			var bewerber = dk.bewerber[i];

			for ( var p in parteien) {
				if (bewerber.partei === parteien[p]) {
					if (wahlkreis_gender[bewerber.wahlkreis] == undefined)
						wahlkreis_gender[bewerber.wahlkreis] = [];

					if (bewerber.geschlecht === 1)
						wahlkreis_gender_m[bewerber.wahlkreis].push(bewerber.geschlecht);

					if (bewerber.geschlecht === -1)
						wahlkreis_gender_w[bewerber.wahlkreis].push(bewerber.geschlecht);
				}
			}
		}

		/* get average gender value */
		var res = [];
		for ( var i in wahlkreis_age) {
			// console.log(i)
			var sum_m = wahlkreis_gender_m[i].reduce(function(pv, cv) {
				return pv + cv;
			}, 0);

			var perc_m = sum_m / (wahlkreis_gender_m.length + wahlkreis_gender_w);

			res.push({
				"key": i,
				"value": -1 + 2 * perc_m
			});
		}

		return res;
	}
}
