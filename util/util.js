/**
 * E-mergo Utility library
 *
 * @version 20230306
 *
 * @package E-mergo
 *
 * @param  {Object} qlik                Qlik's core API
 * @param  {Object} qvangular           Qlik's Angular implementation
 * @param  {Object} $q                  Angular's promise library
 * @param  {Object} axios               Axios
 * @param  {Object} _                   Underscore
 * @param  {Object} util                Qlik's generic utility library
 * @param  {Object} arrayUtil           Qlik's array utility library
 * @param  {Object} StringNormalization Qlik's string normalization library
 */
define([
	"qlik",
	"qvangular",
	"ng!$q",
	"axios",
	"underscore",
	"util",
	"general.utils/array-util",
	"general.utils/string-normalization"
], function( qlik, qvangular, $q, axios, _, util, arrayUtil, StringNormalization ) {
	/**
	 * Holds the cached data
	 *
	 * @type {Object}
	 */
	var cachedData = {},

	/**
	 * Holds the reference to the current app's API
	 *
	 * @type {Object}
	 */
	app = qlik.currApp(),

	/**
	 * Translate Qlik's ARGB into rgb data
	 *
	 * NOTE: Qlik's ARGB function does not actually create alpha channel data,
	 * but instead applies a lighter color spectrum.
	 *
	 * @param  {String} argb ARGB syntax
	 * @return {Object} RGB data
	 */
	argbToRgb = function( argb ) {
		var result = /^(A?RGB)\((\d+),(\d+),(\d+),?(\d+)?\)$/i.exec(argb),
		    alpha = result && "ARGB" === result[1] && parseInt(result[2], 10),
		    withAlpha = false !== alpha;

		/**
		 * Return the factored color value
		 *
		 * @param  {Number} color Color value
		 * @return {Number}       Color value
		 */
	    factor = function( color ) {
	    	return withAlpha ? Math.round((255 - alpha) + (alpha * (color / 255))) : color;
	    };

		return result ? {
			r: factor(parseInt(result[withAlpha ? 3 : 2], 10)),
			g: factor(parseInt(result[withAlpha ? 4 : 3], 10)),
			b: factor(parseInt(result[withAlpha ? 5 : 4], 10))
		} : null;
	},

	/**
	 * Return a boolean from an expression's result
	 *
	 * @param  {String}  a Expression's result
	 * @return {Boolean}   Does the expression evaluate to true?
	 */
	booleanFromExpression = function( a ) {
		return "undefined" === typeof a || "" === a || isNaN(parseInt(a)) || !! parseInt(a);
	},

	/**
	 * Return camelcased version of a text
	 *
	 * @param  {String} s Text to camelcase
	 * @return {String} Camelcased text
	 */
	camelCase = function( s ) {
		var i, camelCased, parts = s.split(/[_-]/);

		// Bail when string is empty
		if (0 === s.length) {
			return s;
		}

		// Bail when string is already camelCased
		if (1 === parts.length && parts[0][0].toLowerCase() === parts[0][0]) {
			return s;
		}

		// Start camelCasing
		camelCased = parts[0].toLowerCase();

		// Append remaining Casing parts
		for (i = 1; i < parts.length; i++) {
			camelCased = camelCased + parts[i].charAt(0).toUpperCase() + parts[i].substr(1).toLowerCase();
		}

		return camelCased;
	},

	/**
	 * Return a deep copy of enumerable data
	 *
	 * @param  {Mixed} a Data to copy
	 * @return {Mixed} Copied data
	 */
	copy = function( a ) {
		return JSON.parse(JSON.stringify(a));
	},

	/**
	 * Holds the element that assists in the copyToClipboard function
	 *
	 * @type {Element}
	 */
	_copyToClipboard = null,

	/**
	 * Copy a value to the system's clipboard
	 *
	 * Inspired by copyToClipboard functionality in extensions/qliktech/straight-table.
	 *
	 * @param  {String} value The value to copy
	 * @return {Void}
	 */
	copyToClipboard = function( value ) {
		var a = _copyToClipboard;

		if (null === a) {
			a = document.createElement( "textarea" );
			a.style.position = "absolute";
			a.style.left = "-9999px";
			a.setAttribute( "readonly", "" );
		}

		a.value = value;
		document.body.appendChild( a );
		a.select();
		a.setSelectionRange( 0, a.value.length );
		document.execCommand( "copy" );
		document.body.removeChild( a );
	},

	/**
	 * Create cache functions for the domain's data
	 *
	 * @param  {String} domain Cache domain
	 * @return {Object} Cache functions
	 */
	createCache = function( domain ) {

		// Define list of domain cache data
		if (! cachedData[domain]) {
			cachedData[domain] = {};
		}

		/**
		 * Return a cache key based on the input
		 *
		 * @param  {Mixed} input Input data
		 * @return {String} Cache key
		 */
		function createCacheKey( input ) {
			return JSON.stringify(input);
		}

		/**
		 * Return whether a cached value exists
		 *
		 * @param  {Mixed} key Key input
		 * @return {Boolean} Cache exists
		 */
		function exists( key ) {
			return cachedData[domain].hasOwnProperty(createCacheKey(key));
		}

		/**
		 * Return the cached value
		 *
		 * @param  {Mixed} key Key input
		 * @return {Mixed} Cached data
		 */
		function get( key ) {
			return cachedData[domain][createCacheKey(key)];
		}

		/**
		 * Set the cache value
		 *
		 * @param {Mixed} key Key input
		 * @param {Mixed} value Data to cache
		 * @return {Void}
		 */
		function set( key, value ) {
			"undefined" === typeof value && (value = true);
			cachedData[domain][createCacheKey(key)] = value;
		}

		/**
		 * Clear the domain's cache
		 *
		 * @return {Void}
		 */
		function clear() {
			cachedData[domain] = {};
		}

		return {
			clear: clear,
			exists: exists,
			get: get,
			set: set
		};
	},

	/**
	 * Return the RGB equivalent of a HEX coded color
	 *
	 * @param  {String} hex Color code in hex format
	 * @return {Object} RGB data
	 */
	hexToRgb = function( hex ) {

		// An rgb value was provided
		if (hex && hex.hasOwnProperty("r") && hex.hasOwnProperty("g") && hex.hasOwnProperty("b")) {
			return hex;
		}

		// Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
		var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;

		hex = "string" === typeof hex && hex.replace(shorthandRegex, function(m, r, g, b) {
			return r + r + g + g + b + b;
		});

		var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	},

	/**
	 * Return whether the color is considered dark
	 *
	 * @param  {String}  color Color code in hex format
	 * @return {Boolean} Is the color dark?
	 */
	isDarkColor = function( color ) {
		color = argbToRgb(color) || hexToRgb(color);

		return color ? ((0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255) < 0.75 : false;
	},

	/**
	 * Return a number from an expression's result
	 *
	 * @param  {String}  a Expression's result
	 * @return {Number}    Does the expression evaluate to a number
	 */
	numberFromExpression = function( a ) {
		return "undefined" !== typeof a && ! isNaN(parseInt(a)) ? parseInt(a) : 0;
	},

	/**
	 * Parser for replacing dynamic button properties
	 *
	 * The `parsable` set needs to contain '$1' through '$n' for receiving the
	 * replacements that exist in their respective positions in `params`.
	 *
	 * @param  {Object} parsable  Data to parse
	 * @param  {Array} params Parameters to use
	 * @return {Object} Parsed data
	 */
	parseDynamicParams = function( parsable, params ) {
		var i, j, paramsMap = {}, re = [], replace;

		// Create params map
		for (i in params) {
			paramsMap["$" + (1 + parseInt(i))] = params[i];
			re.push("\\$" + (1 + parseInt(i)));
		}

		// Define regex elements
		re = new RegExp(re.join("|"), "gi");
		replace = function( matched ) {
			return paramsMap[matched];
		};

		// Walk all parsable properties
		for (i in parsable) {
			if (parsable.hasOwnProperty(i)) {

				// Array
				if (Array.isArray(parsable[i])) {
					for (j in parsable[i]) {
						parseDynamicParams(parsable[i][j], params);
					}

				// Object
				} else if (_.isObject(parsable[i])) {
					parseDynamicParams(parsable[i], params);

				// String
				} else if ("string" === typeof parsable[i] && parsable[i].length) {

					// Do the actual replacement
					parsable[i] = parsable[i].replace(re, replace);
				}
			}
		}

		return parsable;
	},

	/*
	 * Wrapper for requests made to Qlik's QRS REST API
	 *
	 * @param  {Object|String} args Request data or url
	 * @return {Promise} Request response
	 */
	qlikRequest = function( args ) {
		var globalProps = app.global.session.options;

		// When provided just the url
		if ("string" === typeof args) {
			args = { url: args };
		}

		// Prefix QRS calls with the proxy
		if ((args.applyPrefix || 0 === args.url.indexOf("/qrs")) && globalProps.prefix.length) {
			args.url = globalProps.prefix.replace(/\/+$/, "") + args.url;
		}

		// Default params
		args.params = args.params || {};
		args.headers = args.headers || {};

		/**
		 * Axios is setup by QS to handle xsrf tokens.
		 */
		return axios(args);
	},

	/**
	 * Add global styles to the page, replacing when it already exists
	 *
	 * @param  {String} name Style name/identifier
	 * @param  {String} css  Style content
	 * @return {Function} Deregister method
	 */
	registerStyle = function( name, css ) {
		var id = name + "-style",
		    $style = $("#" + id);

		// Replace style when it already exists
		if ($style.length) {
			$style.html(css);

		// Add style
		} else {
			$("<style>").attr("id", id).html(css).appendTo("head");
		}

		return function() {
			$("#" + id).remove();
		};
	},

	/**
	 * Return the scoped css definition of an extension object
	 *
	 * @param {String} tid Extension object identifier
	 * @param {Object} config Configuration object
	 * @return {Function} Deregister method
	 */
	registerObjStyle = function( tid, config ) {
		var css = [],
		    name = "object-" + tid,
		    deregisterer = function() {};

		config = config || {};

		// Hide object navigation
		if (config.hideNav) {
			css.push('.cell[tid="' + tid + '"] .qv-object-nav { display: none; }');
		}

		// Additional css (as string)
		if (config.css) {
			css.push(config.css);
		}

		// Register object style
		if (css.length) {
			deregisterer = registerStyle(name, css.join("\n"));
		}

		return deregisterer;
	},

	/**
	 * Return whether the Markdown mime type is registered
	 *
	 * Registers the Markdown mime type when it is not already present in
	 * a Server environment. Always returns true for Desktop environments.
	 *
	 * @return {Promise} Is the Markdown mimetype registered?
	 */
	requireMarkdownMimetype = function() {
		var dfd = $q.defer();

		// Check desktop vs other environments
		app.global.isPersonalMode().then( function( resp ) {

			// Bail when in a Desktop environment
			if (resp.qReturn) {
				dfd.resolve(true);
				return;
			}

			// Check whether the Markdown mimetype is registered
			qlikRequest({
				url: "/qrs/mimetype?filter=mime so 'markdown'"
			}).then( function( resp ) {

				// Create Markdown mimetype when it's not registered
				if (! resp.data.length) {
					qlikRequest({
						method: "POST",
						url: "/qrs/mimetype",
						data: {
							additionalHeaders: null,
							binary: false,
							extensions: "md,markdown",
							mime: "text/markdown"
						}
					}).then( function( resp ) {
						dfd.resolve(true);
					}).catch(dfd.reject);
				} else {
					dfd.resolve(true);
				}
			}).catch(dfd.reject);
		});

		return dfd.promise;
	},

	/**
	 * Small final state machine creator
	 *
	 * @param {Object} options FSM options
	 */
	StateMachine = function( options ) {
		options = options || {};
		options.init = options.init || "IDLE";
		options.transitions = options.transitions || [{
			from: "IDLE", to: "IDLE", name: "DO" // Default self-looping transition
		}];
		options.on = options.on || {};

		/**
		 * Holds the current state
		 *
		 * @type {String} State name
		 */
		var state = options.init,

		/**
		 * Holds the lock whether a transition is running
		 *
		 * @type {Boolean}
		 */
		transitioning = false,

		/**
		 * Holds the set of state listeners
		 *
		 * @type {Object}
		 */
		listeners = {},

		/**
		 * Return whether the transition is available in the current state
		 *
		 * @param  {String} transition Optional. Transition name or none to return all available transitions
		 * @return {Object|Array} Lifecycle data when the transition is available or all available transitions
		 */
		seek = function( transition ) {
			if (transition) {
				return options.transitions.find( function( a ) {
					return state === a.from && transition === a.name;
				});
			} else {
				return options.transitions.filter( function( a ) {
					return state === a.from;
				}).map( function( a ) {
					return a.name;
				});
			}
		},

		/**
		 * Return whether the transition can be run in the current state
		 *
		 * @param  {String} transition Transition name
		 * @return {Object} Lifecycle data when the transition is runnable
		 */
		can = function( transition ) {
			return (! transitioning) && seek(transition);
		},

		/**
		 * Runs a transition
		 *
		 * @param  {Object} lifecycle Lifecycle details or transition name
		 * @return {Promise} Is transition done?
		 */
		transit = function( transition ) {
			return function() {
				var lifecycle = can(transition);

				// Bail when transition is not available
				if (! lifecycle) {
					return false;
				}

				// Start transition
				transitioning = true;

				// Collect listener parameters
				var args = [lifecycle].concat(Array.prototype.slice.call(arguments));

				// Run listeners, change state, run listeners
				return [
					trigger.bind(this, camelCase.prepended("before", lifecycle.name), args),
					trigger.bind(this, camelCase.prepended("leave", lifecycle.from), args),
					function() {
		    			state = lifecycle.to;
					},
					trigger.bind(this, camelCase.prepended("enter", lifecycle.to), args),
					trigger.bind(this, camelCase.prepended("after", lifecycle.name), args)
				].reduce( function( promise, fn ) {
					return promise.then(fn);
				}, $q.resolve()).finally( function() {

					// Clear transition lock
					transitioning = false;
				});
			};
		},

		/**
		 * Run listeners for the given hook
		 *
		 * @param  {String} hook Hook name
		 * @param  {Array} args Subscriber callback arguments
		 * @return {Promise} Are the listeners done?
		 */
		trigger = function( hook, args ) {

			// Log transitions
			if (options.enableLogging) {
				console.log("StateMachine" + (options.name ? "/" + options.name : "") + "/" + hook, args);
			}

			// Bail when no listeners are subscribed
			if (! listeners[hook]) {
				return;
			}

			var actions = [],
			    i;

			// Run listeners, collect results, maybe promises
			for (i in listeners[hook]) {
				actions.push(listeners[hook][i].bind.apply(listeners[hook][i], [this].concat(args)));
			}

			return actions.reduce( function( promise, fn ) {
				return promise.then(fn);
			}, $q.resolve());
		},
		i, j;

		// Register transition methods
		for (i in options.transitions) {
			j = options.transitions[i].name;

			// Skip when the transition is already registered
			if (this.hasOwnProperty(camelCase(j))) {
				continue;
			}

			Object.defineProperty(this, camelCase(j), {
				value: transit(j),
				writable: false
			});
		}

		// Define discoverable state
		Object.defineProperty(this, "$state", {
			get: function() {
				return state;
			}
		});

		// Define discoverable state checker
		Object.defineProperty(this, "$is", {
			value: function( _state ) {
				return state === _state;
			},
			writable: false
		});

		// Define discoverable transitioning
		Object.defineProperty(this, "$busy", {
			get: function() {
				return transitioning;
			}
		});

		// Define available transition checker
		Object.defineProperty(this, "$seek", {
			value: seek,
			writable: false
		});

		// Define runnable transition checker
		Object.defineProperty(this, "$can", {
			value: can,
			writable: false
		});

		// Define transition triggerer
		Object.defineProperty(this, "$do", {
			value: function( transition ) {
				return transit(transition)(Array.prototype.slice.call(arguments, 1));
			},
			writable: false
		});

		// Define callable listener subscriber
		Object.defineProperty(this, "$on", {
			value: function( hook, cb ) {
				if (! listeners[hook]) {
					listeners[hook] = [];
				}

				listeners[hook].push(cb);

				// Return unsubscriber
				return function() {
					var i = listeners[hook].indexOf(cb);

					if (-1 !== i) {
						listeners[hook].splice(i, 1);
					}
				};
			},
			writable: false
		});

		// Subscribe defined default listeners
		for (i in options.on) {
			this.$on(i, options.on[i]);
		}

		// Define discoverable transitioning
		Object.defineProperty(this, "$allTransitions", {
			get: function() {
				return options.transitions.map( function( a ) {
					return a.name;
				}).filter( function( a, i, self ) {
					// Return unique values only
					return i === self.indexOf(a);
				});
			}
		});

		// Define discoverable transitioning
		Object.defineProperty(this, "$allStates", {
			get: function() {
				return options.transitions.reduce( function( a, b ) {
					return a.concat([b.from, b.to]);
				}, []).filter( function( a, i, self ) {
					// Return unique values only
					return i === self.indexOf(a);
				});
			}
		});
	};

	/**
	 * Return a prefixed camelcased text
	 *
	 * @param  {String} prefix Custom prefix
	 * @param  {String} s Text to camelcase
	 * @return {String} Camelcased text
	 */
	camelCase.prepended = function( prefix, s ) {
		s = camelCase(s);
		return prefix + s[0].toUpperCase() + s.substr(1);
	};

	return {
		argbToRgb: argbToRgb,
		booleanFromExpression: booleanFromExpression,
		camelCase: camelCase,
		copy: copy,
		copyToClipboard: copyToClipboard,
		createCache: createCache,
		hexToRgb: hexToRgb,
		isDarkColor: isDarkColor,
		numberFromExpression: numberFromExpression,
		parseDynamicParams: parseDynamicParams,
		qlikRequest: qlikRequest,
		registerStyle: registerStyle,
		registerObjStyle: registerObjStyle,
		requireMarkdownMimetype: requireMarkdownMimetype,
		StateMachine: StateMachine
	};
});