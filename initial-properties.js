/**
 * E-mergo Buttons Initial Properties
 *
 * @package E-mergo Tools Bundle
 *
 * @param  {String} qext          Extension QEXT data
 * @return {Object}               Initial properties
 */
define([
	"text!./qs-emergo-buttons.qext"
], function( qext ) {
	return {
		props: {
			buttonSet: {
				rule: "Button 1",
				dynamic: false,
				limit: true,
				definition: [{
					label: "$1",
					actions: [],
					navigation: {
						enabled: false,
						action: "",
						sheet: "",
						value: "",
						newTab: false
					},
					styleType: "colorExpression",
					colorExpression: ""
				}]
			},
			buttons: [{
				label: "Button 1",
				actions: [],
				navigation: {
					enabled: false,
					action: "",
					sheet: "",
					value: "",
					newTab: false
				},
				styleType: "style",
				style: "",
				color: {
					index: -1,
					color: ""
				}
			}]
		},
		qHyperCubeDef: {
			qDimensions: [],
			qMeasures: [],
			qInitialDataFetch: [{
				qWidth: 2,
				qHeight: 5000
			}],
			qAttributeExpressions: [],
		},
		showTitles: false,
		title: JSON.parse(qext).name
	};
});
