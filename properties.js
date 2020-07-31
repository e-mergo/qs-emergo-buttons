/**
 * E-mergo Buttons Property Panel definition
 *
 * @param  {Object} qvangular     Qlik's angular implementation
 * @param  {Object} $q            Angular's promise library
 * @param  {Object} _             Underscore library
 * @param  {Object} util          E-mergo utility functions
 * @param  {Object} emergoActions E-mergo Actions API
 * @param  {String} qext          Extension QEXT data
 * @return {Object}               Extension Property Panel definition
 */
define([
	"qvangular",
	"ng!$q",
	"underscore",
	"./util/util",
	"./util/qs-emergo-actions",
	"text!./qs-emergo-buttons.qext"
], function( qvangular, $q, _, util, emergoActions, qext ) {

	/**
	 * Holds the limit for the amount of buttons to generate
	 *
	 * @type {Number}
	 */
	var BUTTON_LIMIT = 100,

	/**
	 * Return the count of buttons
	 *
	 * @param  {Object} layout Extension layout
	 * @return {Number} Button count
	 */
	getButtonCount = function( layout ) {
		return layout.props.buttonSet.dynamic ? layout.props.buttonSet.rule.split("|").length : layout.props.buttons.length;
	},

	/**
	 * Holds the settings definition of the buttons sub-panel
	 * 
	 * @type {Object}
	 */
	buttons = {
		label: "Buttons",
		addTranslation: "Add Button",
		type: "array",
		ref: "props.buttons",
		itemTitleRef: function( button, none, context ) {
			var a = _.findWhere(context.layout.props.buttons, { cId: button.cId });

			return a && a.label || button.label;
		},
		allowAdd: true,
		allowRemove: true,
		allowMove: true,
		items: {
			label: {
				translation: "Common.Label",
				type: "string",
				expression: "optional",
				ref: "label"
			},
			description: {
				translation: "Common.Description",
				type: "string",
				expression: "optional",
				ref: "description"
			},
			calcCond: {
				label: "Show button if",
				type: "string",
				expression: "optional",
				ref: "visible"
			},
			enabled: {
				label: "Enable button if",
				type: "string",
				expression: "optional",
				ref: "enabled"
			},
			styleType: {
				label: "Color",
				type: "string",
				component: "buttongroup",
				ref: "styleType",
				options: [{
					label: "Preset",
					value: "style"
				}, {
					label: "Picker",
					value: "color"
				}, {
					label: "Expression",
					value: "colorExpression"
				}],
				defaultValue: "style"
			},
			style: {
				// label: "Style",
				type: "string",
				component: "dropdown",
				ref: "style",
				options: [{
					label: "Default",
					value: ""
				}, {
					label: "Gradient",
					value: "lui-button--gradient"
				}, {
					label: "Blue",
					value: "lui-button--info"
				}, {
					label: "Red",
					value: "lui-button--danger"
				}, {
					label: "Orange",
					value: "lui-button--warning"
				}, {
					label: "Green",
					value: "lui-button--success"
				}],
				show: function( button ) {
					return "style" === button.styleType || ! button.styleType;
				}
			},
			color: {
				translation: "Picker",
				type: "object",
				component: "color-picker",
				ref: "color",
				dualOutput: true,
				show: function( button ) {
					return "color" === button.styleType;
				}
			},
			colorExpression: {
				// label: "Color expression",
				type: "string",
				expression: "optional",
				ref: "colorExpression",
				defaultValue: "",
				show: function( button ) {
					return "colorExpression" === button.styleType;
				}
			},
			actions: {
				label: "Actions",
				addTranslation: "Add Action",
				type: "array",
				ref: "actions",
				itemTitleRef: emergoActions.actionItemTitleRef,
				allowAdd: true,
				allowRemove: true,
				allowMove: false, // QS's interface collapses on dragging nested array elements
				items: emergoActions.actionsDefinition,

				/**
				 * Modify the action's properties when it is added
				 *
				 * @param {Object} item Action properties
				 * @return {Void}
				 */
				add: function( item ) {
					// Needed? JSON parse error when omitted.
					item.qHyperCubeDef = {
						qDimensions: [{
							qDef: {}
						}],
						qMeasures: [{
							qDef: {}
						}]
					};
				}
			},
			navigation: {
				type: "items",
				ref: "navigation",
				items: emergoActions.navigationDefinition
			}
		},

		/**
		 * Modify the button's properties when it is added
		 *
		 * @param {Object} item   Button properties
		 * @param {Object} layout Extension settings layout
		 */
		add: function( item, layout ) {
			item.label = "Button " + (layout.props.buttons.length + 1);
		}
	},

	buttonSet = {
		label: "Buttons",
		type: "items",
		items: {
			buttonSet: {
				ref: "props.buttonSet.dynamic",
				type: "boolean",
				component: "buttongroup",
				defaultValue: false,
				options: [{
					label: "Fixed",
					value: false
				}, {
					label: "Dynamic",
					value: true
				}]
			},
			description: {
				label: function( layout ) {
					var label;

					if (layout.props.buttonSet.dynamic) {
						label = "Generate a dynamic set of buttons through an expression. Use `|` as a button separator, use `~` as a parameter seperator. Parameters from the expression result are available in the below input fields as `$1` through `$n` for as many parameters as you define.";
					} else {
						label = "Define a static list of buttons by adding as many as you select.";
					}

					return label;
				},
				component: "text",
				style: "hint"
			},
			fixed: Object.assign({}, buttons, {
				show: function( layout ) {
					return ! layout.props.buttonSet.dynamic;
				}
			}),
			dynamic: {
				type: "string",
				expression: "optional",
				ref: "props.buttonSet.rule",
				show: function( layout ) {
					return layout.props.buttonSet.dynamic;
				}
			},
			dynamicLimitNotice: {
				component: "text",
				style: "hint",
				label: function( layout, context ) {
					return "The entered dynamic expression results in " + getButtonCount(context.layout) + " buttons. To prevent unintended browser memory overload, a safety limit of 100 buttons is enabled. You can disable this safety limit if you know what your are doing. See the documentation for additional help.";
				},
				show: function( layout, context ) {
					return layout.props.buttonSet.dynamic && getButtonCount(context.layout) > BUTTON_LIMIT;
				}
			},
			dynamicLimit: {
				label: "Safety limit",
				type: "boolean",
				component: "switch",
				ref: "props.buttonSet.limit",
				options: [{
					value: false,
					label: "Disabled"
				}, {
					value: true,
					label: "Enabled"
				}],
				defaultValue: true,
				show: function( layout, context ) {
					return layout.props.buttonSet.dynamic && getButtonCount(context.layout) > BUTTON_LIMIT;
				}
			},
			dynamicOptions: {
				label: "Definition",
				type: "array",
				ref: "props.buttonSet.definition",
				itemTitleRef: function( button, none, context ) {
					return "Definition";
				},
				allowAdd: false,
				allowRemove: false,
				allowMove: false,
				items: {
					label: {
						translation: "Common.Label",
						type: "string",
						expression: "optional",
						ref: "label"
					},
					description: {
						translation: "Common.Description",
						type: "string",
						expression: "optional",
						ref: "description"
					},
					calcCond: {
						label: "Show button if",
						type: "string",
						expression: "optional",
						ref: "visible"
					},
					enabled: {
						label: "Enable button if",
						type: "string",
						expression: "optional",
						ref: "enabled"
					},
					colorExpression: {
						label: "Color expression",
						type: "string",
						expression: "optional",
						ref: "colorExpression",
						defaultValue: "",
						show: function( button ) {
							return "colorExpression" === button.styleType;
						}
					},
					actions: {
						label: "Actions",
						addTranslation: "Add Action",
						type: "array",
						ref: "actions",
						itemTitleRef: emergoActions.actionItemTitleRef,
						allowAdd: true,
						allowRemove: true,
						allowMove: false, // QS's interface collapses on dragging nested array elements
						items: emergoActions.actionsDefinition,

						/**
						 * Modify the action's properties when it is added
						 *
						 * @param {Object} item Action properties
						 * @return {Void}
						 */
						add: function( item ) {
							// Needed? JSON parse error when omitted.
							item.qHyperCubeDef = {
								qDimensions: [{
									qDef: {}
								}],
								qMeasures: [{
									qDef: {}
								}]
							};
						}
					},
					navigation: {
						type: "items",
						ref: "navigation",
						items: emergoActions.navigationDefinition
					}
				},
				show: function( layout, context ) {
					return layout.props.buttonSet.dynamic && !! context.layout.props.buttonSet.rule;
				}
			}
		}
	},

	/**
	 * Holds the settings definition of the appearance sub-panel
	 *
	 * @type {Object}
	 */
	appearance = {
		uses: "settings",
		items: {
			general: {
				grouped: false,
				items: {
					showTitles: {
						defaultValue: false
					},
					details: {
						show: false
					}
				}
			},
			buttonLayout: {
				label: "Layout",
				items: {
					orientation: {
						label: "Orientation",
						ref: "props.buttonLayout.orientation",
						type: "number",
						component: "buttongroup",
						options: [{
							label: "Horizontal", // translation Common.Horizontal found
							value: 0
						}, {
							label: "Vertical", // translation is not found
							value: 1
						}],
						show: function( layout, context ) {
							return getButtonCount(context.layout) > 1;
						}
					},
					label: false, // Disable setting
					color: false  // Disable setting
				}
			}
		}
	},

	/**
	 * Holds the settings definition of the about sub-panel
	 *
	 * @type {Object}
	 */
	about = {
		label: function() {
			return "About " + JSON.parse(qext).name;
		},
		type: "items",
		items: {
			author: {
				label: "This Qlik Sense extension is developed by E-mergo.",
				component: "text"
			},
			version: {
				label: function() {
					return "Version: " + JSON.parse(qext).version;
				},
				component: "text"
			},
			description: {
				label: "Please refer to the accompanying documentation page for a detailed description of this extension and its features.",
				component: "text"
			},
			help: {
				label: "Open documentation",
				component: "button",
				action: function() {
					util.requireMarkdownMimetype()
						// Regardless of registration success, send to the docs
						.finally( function() {
							window.open(window.requirejs.toUrl("extensions/qs-emergo-buttons/docs/docs.html"), "_blank");
						});
				}
			}
		}
	};

	return {
		type: "items",
		component: "accordion",
		items: {
			buttons: buttonSet,
			addons: {
				uses: "addons",
				items: {
					dataHandling: {
						uses: "dataHandling",
						items: {
							suppressZero: {
								show: false
							}
						}
					}
				}
			},
			appearance: appearance,
			about: about
		},
		BUTTON_LIMIT: BUTTON_LIMIT
	};
});
