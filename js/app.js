'use strict';

var parteien = ['CDU', 'SPD', 'GRÜNE', 'DIE LINKE', 'FDP', 'AfD', 'PIRATEN', 'CSU', 'keine Angabe (Landtag)', 'Anderer KWV', 'BGD', 'BIG', 'BP',
	'Bündnis 21/RRP', 'BüSo', 'DIE FRAUEN', 'Die PARTEI', 'DIE RECHTE', 'DIE VIOLETTEN', 'DKP', 'FAMILIE', 'FREIE WÄHLER', 'MLPD', 'NEIN!', 'NPD', 'ÖDP',
	'Partei der Nichtwähler', 'PARTEI DER VERNUNFT', 'PBC', 'pro Deutschland', 'PSG', 'RENTNER', 'REP', 'Tierschutzpartei', 'Volksabstimmung'];

var dk = {};
(function(dk, L, _, $) {
	var safeLog10 = function(number) {
		return number === 0 ? 0 : Math.log(Math.abs(number)) / Math.LN10;
	};

	var formatNumber = function(number) {
		var thousand = ',';
		var negative = number < 0 ? "-" : "";
		var absNumber = Math.abs(+number || 0) + "";
		var thousands = (absNumber.length > 3) ? absNumber.length % 3 : 0;
		return negative + (thousands ? absNumber.substr(0, thousands) + thousand : "") + absNumber.substr(thousands).replace(/(\d{3})(?=\d)/g, "$1" + thousand);
	};

	var toLiteral = function(array) {
		var literal = {};
		_.each(array, function(element) {
			if (element.name == 'parteien') {
				if (!literal[element.name]) {
					literal[element.name] = [];
				}
				literal[element.name].push(element.value);
			} else {
				literal[element.name] = element.value;
			}
		});
		return literal;
	};

	var colors = {
		red: ["#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"],
		green: ["#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"],
		blue: ["#DEEBF7", "#C6DBEF", "#9ECAE1", "#6BAED6", "#4292C6", "#2171B5", "#08519C", "#08306B"],
		orange: ["#fff5eb", "#fee6ce", "#fdd0a2", "#fdae6b", "#fd8d3c", "#f16913", "#d94801", "#8c2d04"]
	};

	var map = {
		areaLayers: [],
		data: [],
		loopUsageData: [],
		loopBoundary: [],
		settings: {},
		filter: data,
		init: function() {
			this.leafletMap = L.map('map', {
				center: [51.165691, 10.451526],
				zoom: 7,
				minZoom: 5,
				maxZoom: 12
			});

			var attribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://www.mapbox.com/about/maps/" target="_blank">Mapbox</a>, Created by: <a href="http://micha.elmueller.net/">Michael Müller</a>, <a href="http://blog.opendatalab.de">Felix Ebert</a>';
			L.tileLayer('https://{s}.tiles.mapbox.com/v3/codeforheilbronn.i4fmboco/{z}/{x}/{y}.png', {
				'attribution': attribution,
				'maxZoom': 18
			}).addTo(this.leafletMap);

			$(dk).on('map.loaded.areaLayers map.loaded.bewerber', _.bind(this.fireMapIsReady, this));
			$(dk).on('map.ready', _.bind(this.renderComparison, this));

			this.fillPartySelect(parteien);

			$('.settings').on('change', _.bind(this.onSettingsChange, this));
			this.settings = toLiteral($('.settings').serializeArray());

			this.loadAreaLayers();
			this.loadBewerber();
		},
		fillPartySelect: function(parteien) {
			var html = '';
			_.each(parteien, function(partei) {
				html += '<option value="' + partei + '" selected="selected">' + partei + '</option>';
			});
			$('.parties').html(html);
		},
		onSettingsChange: function() {
			this.settings = toLiteral($('.settings').serializeArray());
			this.renderComparison();
		},
		renderComparison: function() {
			var districtData = this.filter[this.settings.compare](this.settings.parteien);
			var log10Boundary = this.getLog10Boundary(districtData);
			this.colorLayers(districtData, log10Boundary);
		},
		getLog10Boundary: function(districts) {
			var max = 0;
			var min = 100000;
			_.each(districts, _.bind(function(district) {
				if (district.value > max) {
					max = district.value;
				}
				if (district.value < min && district.value > 0) {
					min = district.value;
				}
			}, this));
			var log10Boundary = [safeLog10(max), safeLog10(min)];
			return log10Boundary;
		},
		colorLayers: function(districts, log10Boundary) {
			_.each(this.areaLayers, _.bind(function(layer) {
				var district = _.find(districts, function(currentDistrict) {
					return currentDistrict.key == layer.key;
				});
				if (district) {
					var bewerber = _.filter(dk.bewerber, function(einBewerber) {
						return einBewerber.wahlkreis == district.key;
					});

					var style = this.getLayerStyle(district.value, log10Boundary);
					var html = "Wahlkreis: <strong>" + layer.label + "</strong><br /><br />";
					html += "<table class='table table-condensed table-bordered'>";
					html += '<tr><td>Partei</td><td>Alter</td><td>m/w</td><td>Name</td></tr>';
					_.each(bewerber, function(einBewerber) {
						var alter = (new Date().getFullYear()) - einBewerber.geburtsjahr;
						var geschlecht = einBewerber.geschlecht === 1 ? 'm' : 'w';
						html += '<tr><td>' + einBewerber.partei + '</td><td>' + alter + '</td><td>' + geschlecht + '</td><td>' + einBewerber.name
								+ '</td></tr>';
					});
					html += "</table>";
					if (this.settings.compare === 'gender') {
						var percent = Math.round(((district.value + 1) / 2) * 100);
						var gender = percent <= 50 ? 'weiblich' : 'männlich';
						var genderPercent = percent <= 50 ? (100 - percent) : percent;
						html += "<em>maßgeblicher Wert für die Einfärbung: " + genderPercent + "% " + gender + "</em>";
					} else {
						html += "<em>maßgeblicher Wert für die Einfärbung: " + formatNumber(Math.round(district.value)) + " Jahre</em>";
					}

					layer.value.setStyle(style);
					layer.value.bindPopup(html);
				} else {
					console.log('no district for layer ' + layer.key);
					layer.value.setStyle({
						'fillOpacity': 0.65,
						'fillColor': '#F0F0F0'
					});
				}
			}, this));
		},
		getLayerStyle: function(value, log10Boundary) {
			return {
				'fillOpacity': 0.65,
				'fillColor': this.getFillColor(value, log10Boundary)
			};
		},
		getFillColor: function(value, log10Boundary) {
			if (value == 0) {
				return '#EEE';
			}

			var colorScheme = (value <= 0) ? colors.orange : colors.blue;
			var factor = this.getComparisonFactor(value, log10Boundary);
			var colorIndex = Math.max(0, Math.round((colorScheme.length - 1) * factor));
			if (this.settings.parteien.length === 1) {
				colorIndex -= 2;
			}
			return colorScheme[colorIndex];
		},
		getOpacity: function(value, log10Boundary) {
			if (value === 0) {
				return 0.25;
			}
			var opacity = Math.round(0.75 * this.getComparisonFactor(value, log10Boundary) * 100) / 100;
			return Math.max(0.2, opacity);
		},
		getComparisonFactor: function(value, log10Boundary) {
			if (log10Boundary[0] === log10Boundary[1]) {
				return 1;
			}
			return Math.round((safeLog10(value) - log10Boundary[1]) / (log10Boundary[0] - log10Boundary[1]) * 100) / 100;
		},
		fireMapIsReady: function() {
			if (!_.isEmpty(this.areaLayers) && !_.isEmpty(this.bewerber)) {
				$('#loading').remove();
				$(dk).triggerHandler('map.ready');
			}
		},
		loadAreaLayers: function() {
			$.getJSON('data/wahlkreise.geojson', _.bind(function(data) {
				this.addAreaLayers(data);
				$(dk).triggerHandler('map.loaded.areaLayers');
			}, this));
		},
		addAreaLayers: function(geojson) {
			L.geoJson(geojson.features, {
				style: {
					'opacity': 0.5,
					'weight': 1
				},
				onEachFeature: _.bind(this.addAreaLayer, this)
			}).addTo(this.leafletMap);
		},
		addAreaLayer: function(feature, layer) {
			this.areaLayers.push({
				'key': feature.properties['WKR_NR'],
				'label': feature.properties['WKR_NAME'],
				'value': layer
			});
		},
		getAreaLayer: function(key) {
			return _.find(this.areaLayers, function(area) {
				return area.key == key;
			});
		},
		loadBewerber: function() {
			$.getJSON('data/bewerber-btw13.json', _.bind(function(data) {
				this.bewerber = data;
				dk.bewerber = data;
				$(dk).triggerHandler('map.loaded.bewerber');
			}, this));
		}
	};

	dk.map = map;
})(dk, L, _, jQuery);
