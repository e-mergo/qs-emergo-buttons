/**
 * E-mergo Buttons Extension
 *
 * @since 20180609
 * @author Laurens Offereins <https://github.com/lmoffereins>
 *
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
	"./properties",
	"./initial-properties",
	"./util/qs-emergo-actions",
	"./util/button",
	"./util/util",
	"text!./style.css",
	"text!./template.ng.html"
], function( props, initProps, emergoActions, buttonLayout, util, css, tmpl ) {

	// Add global styles to the page
	util.registerStyle("qs-emergo-buttons", css);

	/**
	 * Extension controller function
	 *
	 * @param  {Object} $scope Extension scope
	 * @return {Void}
	 */
	var controller = ["$scope", function( $scope ) {
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

			// Apply button actions when not editing the sheet
			if (! $scope.object.inEditState()) {
				emergoActions.doMany(button, $scope).then( function( done ) {

					// Evaluate navigation settings
					return done && emergoActions.doNavigation(button, $scope);
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
			dynamic.rule.split("|").slice(0, size).forEach( function( a ) {
				var b = util.parseDynamicParams(util.copy(def), a.split("~"));

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
		 * Return the set of button classes
		 *
		 * @param  {Object} button Button data
		 * @return {Array}         Button classes
		 */
		$scope.btnClass = function( button ) {
			var classes = [];

			// Style class
			if (-1 !== ["color", "colorExpression"].indexOf(button.styleType)) {
				var color = "color" === button.styleType ? button.color && button.color.color : button[button.styleType];
				classes.push(util.isDarkColor(color) ? "lui-button--custom-inverse" : "lui-button--custom");
			} else {
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
				style["background-color"] = button.color ? button.color.color : "rgba(0,0,0,0)";
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
