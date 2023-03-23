/**
 * E-mergo Buttons Property Panel definition
 *
 * @param  {Object} qlik          Qlik's core API
 * @param  {Object} _             Underscore library
 * @param  {Object} util          E-mergo utility functions
 * @param  {Object} emergoActions E-mergo Actions API
 * @param  {Object} docs          E-mergo documentation functions
 * @param  {String} readme        Extension readme
 * @param  {String} qext          Extension QEXT data
 * @return {Object}               Extension Property Panel definition
 */
define([
	"qlik",
	"underscore",
	"./util/util",
	"./util/qs-emergo-actions",
	"./docs/docs",
	"text!./README.md",
	"text!./qs-emergo-buttons.qext"
], function( qlik, _, util, emergoActions, docs, readme, qext ) {

	/**
	 * Holds the QEXT data
	 *
	 * @type {Object}
	 */
	var qext = JSON.parse(qext),

	/**
	 * Holds the reference to the current app's API
	 *
	 * @type {Object}
	 */
	app = qlik.currApp(),

	/**
	 * Holds the limit for the amount of buttons to generate
	 *
	 * @type {Number}
	 */
	BUTTON_LIMIT = 100,

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
	 * Holds the app's current theme data
	 *
	 * @type {Object}
	 */
	currTheme,

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
				defaultValue: function() {
					return {
						index: -1,
						color: currTheme && currTheme.properties.dataColors ? currTheme.properties.dataColors.primaryColor : "#000000"
					};
				},
				show: function( button ) {
					return "color" === button.styleType;
				}
			},
			colorExpression: {
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
				allowMove: true,
				items: emergoActions.actionsDefinition,

				/**
				 * Modify the action's properties when it is added
				 *
				 * @param {Object} item Action properties
				 * @return {Void}
				 */
				add: function( item ) {
					// Is this needed? When not, a JSON parse error is returned.
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
			item.label = "Button ".concat(layout.props.buttons.length + 1);
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
					return "The entered dynamic expression results in ".concat(getButtonCount(context.layout), " buttons. To prevent unintended browser memory overload, a safety limit of 100 buttons is enabled. You can disable this safety limit if you know what your are doing. See the documentation for additional help.");
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
					return layout.props.buttonSet.dynamic;
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
			return "About ".concat(qext.title);
		},
		type: "items",
		items: {
			author: {
				label: "This Qlik Sense extension is developed by E-mergo.",
				component: "text"
			},
			version: {
				label: function() {
					return "Version: ".concat(qext.version);
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
					util.requireMarkdownMimetype().finally( function() {
						docs.showModal(readme, qext);
					});
				}
			}
		}
	};

	// Find the appprops object and subscribe to layout changes
	// This listener remains running in memory without end, but it is only
	// created once for all instances of this extension.
	app.getObject("AppPropsList").then( function( obj ) {
		obj.layoutSubscribe( function() {

			// Set the current theme
			app.theme.getApplied().then( function( theme ) {
				currTheme = theme;
			});
		});
	});

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
