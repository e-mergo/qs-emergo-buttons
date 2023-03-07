/**
 * E-mergo Buttons Extension
 *
 * @since 20180609
 * @author Laurens Offereins <https://github.com/lmoffereins>
 *
 * @param  {Object} qlik          Qlik's core API
 * @param  {Object} qUtil         Qlik utility library
 * @param  {Object} _             Underscore
 * @param  {Object} props         Property panel definition
 * @param  {Object} initProps     Initial properties
 * @param  {Object} emergoActions E-mergo Actions API
 * @param  {Object} buttonLayout  Button layout API
 * @param  {Object} util          E-mergo utility functions
 * @param  {String} css           Extension stylesheet
 * @param  {String} tmpl          Extension template file
 * @return {Object}               Extension structure
 */
define([
	"qlik",
	"util",
	"underscore",
	"./properties",
	"./initial-properties",
	"./util/qs-emergo-actions",
	"./util/button",
	"./util/util",
	"text!./style.css",
	"text!./template.ng.html"
], function( qlik, qUtil, _, props, initProps, emergoActions, buttonLayout, util, css, tmpl ) {

	// Add global styles to the page
	util.registerStyle("qs-emergo-buttons", css);

	/**
	 * Holds the reference to the current app's API
	 *
	 * @type {Object}
	 */
	var app = qlik.currApp(),

	/**
	 * Holds the app's current theme data
	 *
	 * @type {Object}
	 */
	currTheme,

	/**
	 * Return the color picker's corresponding palette color
	 *
	 * @param  {Object} picker Color picker value
	 * @return {String}        Color value
	 */
	getPaletteColor = function( picker ) {
		if (picker && picker.color) {
			if (-1 !== picker.index) {
				var paletteColor = _.get(currTheme || {}, "properties.palettes.ui.0.colors".split("."), []);
				return picker.index < paletteColor.length ? paletteColor[picker.index] : picker.color;
			} else {
				return picker.color;
			}
		} else {
			return "#000000";
		}
	},

	/**
	 * Extension controller function
	 *
	 * @param  {Object} $scope Extension scope
	 * @return {Void}
	 */
	controller = ["$scope", function( $scope ) {
		/**
		 * Cache functions for this controller
		 *
		 * @type {Object} Cache functions
		 */
		var cache = util.createCache("qs-emergo-buttons/" + $scope.$id);

		/**
		 * Button select handler
		 *
		 * @param {Object} button Button data
		 * @return {Void}
		 */
		$scope.do = function( button ) {
			var cb = getBtn.bind(this, button.cId);

			// Execute button actions when not editing the sheet and interaction is allowed
			if (! $scope.object.inEditState() && ! $scope.options.noInteraction) {
				emergoActions.doMany(cb, $scope).then( function( done ) {

					// Evaluate navigation settings
					return (false !== done) && emergoActions.doNavigation(cb, $scope);
				}).catch(console.error);
			}
		};

		/**
		 * Return the set of list styles
		 *
		 * @return {Array} List styles
		 */
		$scope.listStyle = buttonLayout.style(true);

		/**
		 * Return the set of list classes
		 *
		 * @return {Array} List classes
		 */
		$scope.listClass = function() {
			var classes = [], aligns = {
				1: "align-left",
				2: "align-center",
				0: "align-right"
			};

			// Indicate when interaction is not allowed
			if ($scope.options.noInteraction) {
				classes.push('no-interaction');
			}

			classes.push(this.layout.props.buttonLayout.orientation ? "vertical" : "horizontal");
			classes.push("100%" === this.layout.props.buttonLayout.width ? "full-width" : "auto-width");
			classes.push(this.layout.props.buttonLayout.noSpacing ? "spacing" : "nospacing");
			classes.push(aligns[this.layout.props.buttonLayout.position % 3]);

			return classes;
		};

		/**
		 * Return the list of buttons to paint
		 *
		 * @return {Array} Buttons
		 */
		$scope.btns = function() {
			return this.layout.props.buttonSet.dynamic ? btnsDynamic() : this.layout.props.buttons;
		};

		/**
		 * Return the list of dynamic buttons
		 *
		 * @return {Array} Buttons
		 */
		function btnsDynamic() {
			var buttons = [],
			    dynamic = $scope.layout.props.buttonSet,
			    def = dynamic.definition[0],
			    size = dynamic.limit ? props.BUTTON_LIMIT : undefined;

			// Add rule to the set definition for inclusion in the cache key
			def.rule = dynamic.rule;
			def.size = size;

			// Bail early when buttons are cached
			if (cache.exists(def)) {
				return cache.get(def);
			}

			// Generate buttons
			dynamic.rule.split("|").slice(0, size).filter(Boolean).forEach( function( a ) {
				var b = util.parseDynamicParams(util.copy(def), a.split("~"));

				// Assign unique cId for each button
				b.cId = qUtil.generateId();

				// Default to the outline style
				if (! b.colorExpression.length) {
					b.styleType = "style";
				}

				buttons.push(b);
			});

			// Cache button data
			cache.set(def, buttons);

			return buttons;
		}

		/**
		 * Return the specified active button
		 *
		 * @param  {String} cId Button identifier
		 * @return {Object}     Button
		 */
		function getBtn( cId ) {
			return _.find($scope.btns(), { "cId": cId });
		}

		/**
		 * Return the set of button classes
		 *
		 * @param  {Object} button Button data
		 * @return {Array}         Button classes
		 */
		$scope.btnClass = function( button ) {
			var classes = [];

			// Style class
			if (-1 !== ["color", "colorExpression"].indexOf(button.styleType)) {
				var color = "color" === button.styleType ? getPaletteColor(button.color) : button[button.styleType];
				classes.push(util.isDarkColor(color) ? "lui-button--custom-inverse" : "lui-button--custom");
			} else if (button.style) {
				classes.push(button.style);
			}

			return classes;
		};

		/**
		 * Return the set of button styles
		 *
		 * @param  {Object} button Button data
		 * @return {Array}         Button styles
		 */
		$scope.btnStyle = function( button ) {
			var style = {};

			// Color
			if ("color" === button.styleType) {
				style["background-color"] = getPaletteColor(button.color);
			} else if ("colorExpression" === button.styleType) {
				style["background-color"] = button.colorExpression;
			}

			return style;
		};

		/**
		 * Return whether the button is visible
		 *
		 * @param  {Object}  button Button data
		 * @return {Boolean}        Is the button visible?
		 */
		$scope.btnVisible = function( button ) {
			return "" === button.visible || isNaN(parseInt(button.visible)) || !! parseInt(button.visible);
		};

		/**
		 * Return whether the button is disabled
		 *
		 * @param  {Object}  button Button data
		 * @return {Boolean}        Is the button disabled?
		 */
		$scope.btnDisabled = function( button ) {
			return ! ("" === button.enabled || isNaN(parseInt(button.enabled)) || !! parseInt(button.enabled));
		};

		/**
		 * Return button label
		 *
		 * Parses the label for icons.
		 *
		 * @param  {Object} button Button data
		 * @return {String}        Button label
		 */
		$scope.btnLabel = function( button ) {
			return buttonLayout.parseLabel(button.label);
		};

		/**
		 * Clean up when the controller is destroyed
		 *
		 * @return {Void}
		 */
		$scope.$on("$destroy", function() {

			// Clear the controller's cache
			cache.clear();
		});
	}];

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

	// Apply property panel patches for button layout
	buttonLayout.applyDefinition(props);

	// Apply initial properties patches for button layout
	buttonLayout.applyInitialProperties(initProps);

	return {
		definition: props,
		initialProperties: initProps,
		template: tmpl,
		controller: controller,
		mounted: emergoActions.mount,
		beforeDestroy: emergoActions.destroy,
		support: {
			snapshot: false,
			export: false,
			exportData: false
		}
	};
});
