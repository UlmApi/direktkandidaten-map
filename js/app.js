'use strict';

var dk = {};
(function(dk, L, _, $) {
	var safeLog10 = function(number) {
		return number === 0 ? 0 : Math.log(Math.abs(number)) / Math.LN10;
	};

	var formatNumber = function(number) {
		var thousand = '.';
		var negative = number < 0 ? "-" : "";
		var absNumber = Math.abs(+number || 0) + "";
		var thousands = (absNumber.length > 3) ? absNumber.length % 3 : 0;
		return negative + (thousands ? absNumber.substr(0, thousands) + thousand : "") + absNumber.substr(thousands).replace(/(\d{3})(?=\d)/g, "$1" + thousand);
	};

	var fillTime = function(timeValue) {
		return (timeValue < 10) ? '0' + timeValue : timeValue;
	};

	var toLiteral = function(array) {
		var literal = {};
		_.each(array, function(element) {
			literal[element.name] = element.value;
		});
		return literal;
	};

	var colors = {
		red: ["#fee0d2", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"],
		green: ["#e5f5e0", "#c7e9c0", "#a1d99b", "#74c476", "#41ab5d", "#238b45", "#006d2c", "#00441b"]
	};

	var map = {
		areaLayers: [],
		data: [],
		loopUsageData: [],
		loopBoundary: [],
		settings: {},
		init: function() {
			this.leafletMap = L.map('map', {
				center: [51.165691, 10.451526],
				zoom: 7,
				minZoom: 5,
				maxZoom: 12
			});

			var attribution = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>, Ortsteil-Geometrien: <a href="https://www.statistik-berlin-brandenburg.de/produkte/opendata/geometrienOD.asp?Kat=6301">Amt für Statistik Berlin-Brandenburg</a> &amp; <a href="https://github.com/m-hoerz/berlin-shapes">m-hoerz/berlin-shapes</a> - Energiedaten: <a href="http://netzdaten-berlin.de/web/guest/suchen/-/details/web-service-last-und-erzeugung-berlin">Stromnetz Berlin</a> - API: <a href="https://github.com/stefanw/smeterengine-json">stefanw/smeterengine-json</a> - Created by: <a href="http://www.michael-hoerz.de/">Michael Hörz</a>, Felix Ebert at <a href="http://energyhack.de">Energy Hackday Berlin</a> - GitHub: <a href="https://github.com/felixebert/energyhack">felixebert/energyhack</a>';
			L.tileLayer('http://{s}.tile.cloudmade.com/036a729cf53d4388a8ec345e1543ef53/44094/256/{z}/{x}/{y}.png', {
				'attribution': attribution,
				'maxZoom': 18
			}).addTo(this.leafletMap);

			$(dk).on('map.loaded.areaLayers map.loaded.data', _.bind(this.fireMapIsReady, this));
			$(dk).on('map.ready', _.bind(this.renderLast, this));

			$('.settings').on('change', _.bind(this.onSettingsChange, this));
			this.settings = toLiteral($('.settings').serializeArray());

			this.loadAreaLayers();
		},
		onSettingsChange: function() {
			this.settings = toLiteral($('.settings').serializeArray());
			if (this.loopUsageData.length <= 1) {
				this.renderLast();
			} else {
				this.setLoopBoundary();
			}
		},
		renderLast: function() {
			var districtData = this.getDistrictData(this.lastUsageDataFilter);
			var log10Boundary = this.getLog10Boundary(districtData);
			this.colorLayers(districtData, log10Boundary);
		},
		getLog10Boundary: function(districts) {
			var max = 0;
			var min = 100000;
			_.each(districts, _.bind(function(district) {
				if (district.comparisonValue > max) {
					max = district.comparisonValue;
				}
				if (district.comparisonValue < min && district.comparisonValue > 0) {
					min = district.comparisonValue;
				}
			}, this));
			var log10Boundary = [safeLog10(max), safeLog10(min)];
			return log10Boundary;
		},
		colorLayers: function(districts, log10Boundary) {
			_.each(districts, _.bind(function(district) {
				var layer = this.getAreaLayer(district.name);
				if (layer) {
					var style = this.getLayerStyle(district.comparisonValue, log10Boundary);
					var date = new Date(district.usageData.timestamp);
					var html = "Bezirk: <strong>" + district.name + "</strong><br /><br />";
					html += "<table class='table table-condensed table-bordered'>";
					html += "<tr><th style='width:160px'>Zeitpunkt</th><td style='width:70px'>" + fillTime(date.getDate()) + '.'
							+ fillTime(date.getMonth() + 1) + '.2013 ' + fillTime(date.getHours()) + ":" + fillTime(date.getMinutes()) + "</td></tr>";
					html += "<tr><th>Erzeugte Energie</th><td>" + (Math.round(district.usageData.generation * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Verbrauch absolut</th><td>" + (Math.round(district.usageData.usage * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>High Voltage Customers</th><td>" + (Math.round(district.usageData['key-acount-usage'] * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Verbrauch abzgl. HVC</th><td>"
							+ (Math.round((district.usageData.usage - district.usageData['key-acount-usage']) * 100) / 100) + " MW</td></tr>";
					html += "<tr><th>Einwohnerzahl</th><td>" + formatNumber(district.ewz) + "</td></tr>";
					html += "<tr><th>Verbrauch / Einwohner</th><td>" + district.usageByPopulation + " Watt</td></tr>";
					html += "</table><em>maßgebender Wert für die Einfärbung: " + Math.round(district.comparisonValue * 100) / 100 + " "
							+ district.comparisonValueUnit + "</em>";

					_.each(this.areaLayers, _.bind(function(area) {
						if (area.key === district.name) {
							area.value.setStyle(style);
							area.value.bindPopup(html);
						}
					}, this));
				} else {
					console.error('no layer for district ' + district.name);
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

			var colorScheme = (value <= 0 || this.settings.compare === 'generation') ? colors.green : colors.red;
			var factor = this.getComparisonFactor(value, log10Boundary);
			var colorIndex = Math.max(0, Math.round((colorScheme.length - 1) * factor));
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
			if (!_.isEmpty(this.data) && !_.isEmpty(this.areaLayers)) {
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
				'key': feature.properties.Name,
				'label': feature.properties.Name,
				'value': layer
			});
		},
		getAreaLayer: function(key) {
			return _.find(this.areaLayers, function(area) {
				return area.key == key;
			});
		}
	};

	dk.map = map;
})(dk, L, _, jQuery);