/**
 * E-mergo Button
 *
 * @package E-mergo Tools Bundle
 */
define([
	"jquery"
], function( $ ) {
	/**
	 * Holds the initial properties definition for button settings
	 *
	 * @type {Object}
	 */
	var initProps = {
		props: {
			buttonLayout: {
				label: "My Button",
				color: "",
				width: "auto",
				position: 7
			}
		}
	},

	/**
	 * Holds the property panel definition for button settings
	 *
	 * @type {Object}
	 */
	definition = {
		type: "items",
		component: "accordion",
		items: {
			appearance: {
				uses: "settings",
				items: {
					buttonLayout: {
						label: "Button layout",
						type: "items",
						items: {
							label: {
								label: "Label",
								ref: "props.buttonLayout.label",
								type: "string"
							},
							color: {
								label: "Color",
								ref: "props.buttonLayout.color",
								type: "string",
								component: "dropdown",
								options: [{
									label: "Default",
									value: "default"
								}, {
									label: "Gradient",
									value: "gradient"
								}, {
									label: "Blue",
									value: "info"
								}, {
									label: "Red",
									value: "danger"
								}, {
									label: "Orange",
									value: "warning"
								}, {
									label: "Green",
									value: "success"
								}]
							},
							width: {
								label: "Width",
								ref: "props.buttonLayout.width",
								type: "string",
								component: "buttongroup",
								options: [{
									label: "Auto-width",
									value: "auto"
								}, {
									label: "Full-width",
									value: "100%"
								}]
							},
							// columns: {
							// 	label: "Columns",
							// 	ref: "props.buttonLayout.columns",
							// 	type: "string",
							// 	component: "buttongroup",
							// 	options: [{
							// 		label: "Auto",
							// 		value: 0
							// 	}, {
							// 		label: "1",
							// 		value: 1
							// 	}, {
							// 		label: "2",
							// 		value: 2
							// 	}, {
							// 		label: "3",
							// 		value: 3
							// 	}]
							// },
							buttonPadding: {
								label: "Button padding",
								ref: "props.buttonLayout.padding",
								type: "boolean",
								component: "switch",
								defaultValue: false,
								options: [{
									translation: "properties.off",
									value: false
								}, {
									translation: "properties.on",
									value: true
								}]
							},
							horizontalButtonPadding: {
								label: "Horizontal padding",
								ref: "props.buttonLayout.horizontalPadding",
								type: "number",
								component: "slider",
								min: 0,
								max: 50,
								defaultValue: 17,
								show: function( layout ) {
									return layout.props.buttonLayout.padding;
								}
							},
							verticalButtonPadding: {
								label: "Vertical padding",
								ref: "props.buttonLayout.verticalPadding",
								type: "number",
								component: "slider",
								min: 0,
								max: 50,
								defaultValue: 0,
								show: function( layout ) {
									return layout.props.buttonLayout.padding;
								}
							},
							buttonSpacing: {
								label: "Button spacing",
								ref: "props.buttonLayout.noSpacing",
								type: "boolean",
								component: "switch",
								defaultValue: false,
								options: [{
									translation: "properties.off",
									value: false
								}, {
									translation: "properties.on",
									value: true
								}]
							},
							spacingSize: {
								ref: "props.buttonLayout.spacingSize",
								type: "number",
								component: "slider",
								min: 1,
								max: 50,
								step: 1,
								defaultValue: 10,
								show: function( layout ) {
									return !! layout.props.buttonLayout.noSpacing;
								}
							},
							position: {
								label: "Position",
								ref: "props.buttonLayout.position",
								type: "number",
								component: "dropdown",
								defaultValue: 7, // Values follow numeric keypad structure
								options: [{
									label: "Top Left",
									value: 7
								}, {
									label: "Top Center",
									value: 8
								}, {
									label: "Top Right",
									value: 9
								}, {
									label: "Center Left",
									value: 4
								}, {
									label: "Center Center",
									value: 5
								}, {
									label: "Center Right",
									value: 6
								}, {
									label: "Bottom Left",
									value: 1
								}, {
									label: "Bottom Center",
									value: 2
								}, {
									label: "Bottom Right",
									value: 3
								}]
							// },
							// description: {
							// 	label: "Description",
							// 	ref: "props.buttonLayout.description",
							// 	type: "string",
							// 	component: "textarea"
							}
						}
					}
				}
			}
		}
	},

	/**
	 * Return the main button's parsed label
	 *
	 * @return {String} Label
	 */
	buttonLabel = function() {
		var label = this.layout.props.buttonLayout.label;

		// Parse '%%NUM%%' - The number of values currently found in the selected dimension
		if (this.layout.qHyperCube && this.layout.qHyperCube.qDataPages[0]) {
			label.replace("%%NUM%%", this.layout.qHyperCube.qDataPages[0].qMatrix.length);
		}

		return parseLabel(label);
	},

	/**
	 * Return the parsed label
	 *
	 * @param  {String} label Button label
	 * @return {String}       Parsed button label
	 */
	parseLabel = function( label ) {
		var i;

		// Parse label for icons defined as '#icon-name#'
		for (i in iconRegex) {
			if (iconRegex.hasOwnProperty(i)) {
				label = label.replace(iconRegex[i], iconRegexReplacer(i));
			}
		}

		return label;
	},

	/**
	 * Return the button class names
	 *
	 * @return {String} Classes
	 */
	buttonClass = function() {
		var color = this.layout.props.buttonLayout.color;

		if (color && 'default' !== color) {
			return 'lui-button--' + color;
		}
	},

	/**
	 * Return the button padding styles
	 *
	 * @return {Object} Padding styles
	 */
	buttonPadding = function() {
		var styles = {},
		    padding = this.layout.props.buttonLayout.padding,
		    h = this.layout.props.buttonLayout.horizontalPadding,
		    v = this.layout.props.buttonLayout.verticalPadding;

		if (padding) {
			styles["--button-height"]             = "".concat(v ? v * 2 + 26 : 30, "px");
			styles["--button-min-width"]          = "auto";
			styles["--button-horizontal-padding"] = "".concat(h || 0, "px");
		}

		return styles;
	},

	/**
	 * Return the button style definition on a block basis
	 *
	 * @return {Object} Inline styles
	 */
	buttonPositioningBlock = function() {
		var styles = {},
		    width = this.layout.props.buttonLayout.width || "auto",
		    pos = this.layout.props.buttonLayout.position || 7;

		if (width && "auto" !== width) {
			styles.width = width;
		}

		// Parse position
		if (pos && 7 !== pos) {
			styles.position = "absolute";
			switch (parseInt(pos)) {
				case 1:
					styles.bottom = "0px";
					break;
				case 2:
					styles.bottom = "0px";
					styles.left = "50%";
					styles.transform = "translateX(-50%)";
					break;
				case 3:
					styles.bottom = "0px";
					styles.right = "0px";
					break;
				case 4:
					styles.top = "50%";
					styles.transform = "translateY(-50%)";
					break;
				case 5:
					styles.top = "50%";
					styles.left = "50%";
					styles.transform = "translateX(-50%) translateY(-50%)";
					styles["text-align"] = "center";
					break;
				case 6:
					styles.top = "50%";
					styles.right = "0px";
					styles.transform = "translateY(-50%)";
					break;
				case 8:
					styles.left = "50%";
					styles.transform = "translateX(-50%)";
					break;
				case 9:
					styles.right = "0px";
					break;
			}
		}

		return styles;
	},

	/**
	 * Return the button style definition on a flex basis
	 *
	 * @return {Object} Inline styles
	 */
	buttonPositioningFlex = function() {
		var styles = {},
		    width = this.layout.props.buttonLayout.width || "auto",
		    pos = this.layout.props.buttonLayout.position || 7;

		// Parse position
		switch (parseInt(pos)) {
			case 1:
				styles["align-items"] = "flex-end";
				break;
			case 2:
				styles["align-items"] = "flex-end";
				styles["justify-content"] = "center";
				styles["text-align"] = "center";
				break;
			case 3:
				styles["align-items"] = "flex-end";
				styles["justify-content"] = "flex-end";
				styles["text-align"] = "right";
				break;
			case 4:
				styles["align-items"] = "center";
				break;
			case 5:
				styles["align-items"] = "center";
				styles["justify-content"] = "center";
				styles["text-align"] = "center";
				break;
			case 6:
				styles["align-items"] = "center";
				styles["justify-content"] = "flex-end";
				styles["text-align"] = "right";
				break;
			case 7:
				styles["align-items"] = "flex-start";
				break;
			case 8:
				styles["align-items"] = "flex-start";
				styles["justify-content"] = "center";
				styles["text-align"] = "center";
				break;
			case 9:
				styles["align-items"] = "flex-start";
				styles["justify-content"] = "flex-end";
				styles["text-align"] = "right";
				break;
		}

		if (width && "auto" !== width) {
			styles["justify-content"] = "space-between";
		}

		return styles;
	},

	/**
	 * Standalone implementation of lodash's `defaultsDeep()` method
	 *
	 * @return {Object} Modified target
	 */
	defaultsDeep = function( target, objects ) {
		target = target || {};

		var copy = function( a, b ) {
			var i;

			for (i in b) {
				if (b.hasOwnProperty(i)) {
					if (null === a[i] || "undefined" === typeof a[i]) {
						a[i] = b[i];
					} else if ($.isPlainObject(a[i]) && $.isPlainObject(b[i])) {
						defaultsDeep(a[i], b[i]);
					}
				}
			}
		},

		i = 0, obj;

		while (i < arguments.length) {
			obj = arguments[i++];
			if (obj) {
				copy(target, obj);
			}
		}

		return target;
	},

	/**
	 * Set of regular expressions for different types of icons
	 *
	 * @type {Object}
	 */
	iconRegex = {
		start:   /^(#[\w-]+#)/gi,
		end:     /(#[\w-]+#)$/gi,
		between: /(#[\w-]+#)/gi
	},

	/**
	 * Holds the regular expression for trimming '#'
	 *
	 * @type {RegExp}
	 */
	trimHashRegex = /^#|#$/gi,

	/**
	 * Get the replace function for the given icon type
	 *
	 * @param  {String}   type Icon type
	 * @return {Function}      Replace function
	 */
	iconRegexReplacer = function( type ) {
		return function( r ) {
			return '<i class="lui-icon lui-icon--'.concat(r.replace(trimHashRegex, ""), ' lui-icon-', type, '"></i>');
		};
	};

	return {
		/**
		 * Apply the button's initial properties to the target
		 *
		 * @param  {Object} a The extension's initial properties
		 * @return {Object}   Modified target
		 */
		applyInitialProperties: function( target ) {
			return defaultsDeep(target, initProps);
		},
		/**
		 * Apply the button's property panel definition to the target
		 *
		 * @param  {Object} a The extension's property panel definition
		 * @return {Object}   Modified target
		 */
		applyDefinition: function( target ) {
			return defaultsDeep(target, definition);
		},
		label: buttonLabel,
		parseLabel: parseLabel,
		class: buttonClass,
		style: function( flex ) {
			return function() {
				return {
					...(flex ? buttonPositioningFlex.apply(this) : buttonPositioningBlock.apply(this)),
					...buttonPadding.apply(this)
				};
			};
		}
	};
});
