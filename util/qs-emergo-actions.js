/**
 * E-mergo Actions Utility Library
 *
 * @version 20210122
 * @author Laurens Offereins <https://github.com/lmoffereins>
 *
 * @param  {Object} qlik       Qlik's core API
 * @param  {Object} qvangular  Qlik's Angular implementation
 * @param  {Object} $q         Angular's promise library
 * @param  {Object} axios      Axios
 * @param  {Object} _          Underscore
 * @param  {Object} util       Qlik's generic utility library
 * @param  {Object} translator Qlik's translation API
 * @return {Object}            E-mergo Actions API
 */
define([
	"qlik",
	"qvangular",
	"ng!$q",
	"axios",
	"underscore",
	"util",
	"translator"
], function(
	qlik,
	qvangular,
	$q,
	axios,
	_,
	util,
	translator
) {

	/**
	 * Holds the reference to the current app's API
	 *
	 * @type {Object}
	 */
	var app = qlik.currApp(),

	/**
	 * Holds the reference to Qlik's global API
	 *
	 * @type {Object}
	 */
	qGlobal = qlik.getGlobal(),

	/**
	 * Holds the currently authenticated user
	 *
	 * @type {String}
	 */
	authenticatedUser,

	/**
	 * Wrapper for requests made to Qlik's QRS REST API
	 *
	 * @param  {Object|String} args Request data or url
	 * @return {Promise} Request response
	 */
	request = function( args ) {
		var globalProps = qGlobal.session.options;

		// When provided just the url
		if ("string" === typeof args) {
			args = { url: args };
		}

		// Prefix QRS calls with the proxy
		if (0 === args.url.indexOf("/qrs") && globalProps.prefix.length) {
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
	 * Holds the set of available actions
	 *
	 * @type {Array}
	 */
	actionOptions = [{
		label: "Apply Bookmark",
		value: "applyBookmark",
		showBookmark: true
	}, {
		label: "Select Field Value",
		value: "applySelection",
		showField: true,
		showValue: true,
		showState: true,
		eitherOrLabel: "Selection type",
		eitherOrOptions: [{
			label: "Replace",
			value: false
		}, {
			label: "Toggle",
			value: true
		}]
	}, {
		label: "Clear Field Selection",
		value: "clearSelection",
		showField: true,
		showState: true,
		eitherOrLabel: "Which field?",
		eitherOrOptions: [{
			label: "This",
			value: false,
		}, {
			label: "Others",
			value: true
		}]
	}, {
		label: "Back or Forward",
		value: "backOrForward",
		eitherOrOptions: [{
			label: "Back",
			value: false
		}, {
			label: "Forward",
			value: true,
		}]
	}, {
		label: "Lock or Unlock Field",
		value: "lockField",
		showField: true,
		showState: true,
		eitherOrOptions: [{
			label: "Lock",
			value: false
		}, {
			label: "Unlock",
			value: true
		}]
	}, {
		label: "Select Adjacent Value",
		value: "selectAdjacent",
		showField: true,
		showState: true,
		showSortExpression: true,
		eitherOrOptions: [{
			translation: "Tooltip.Next",
			value: false
		}, {
			translation: "Tooltip.Previous",
			value: true
		}]
	}, {
		label: "Select All Values",
		value: "selectAll",
		showField: true,
		showState: true
	}, {
		label: "Select Possible Values",
		value: "selectPossible",
		showField: true,
		showState: true
	}, {
		label: "Select Alternative Values",
		value: "selectAlternative",
		showField: true,
		showState: true
	}, {
		label: "Select Excluded Values",
		value: "selectExcluded",
		showField: true,
		showState: true
	}, {
		label: "Select Pareto Values",
		value: "selectPareto",
		showField: true,
		showValue: true,
		showState: true
	}, {
		label: "Set Variable Value",
		value: "setVariable",
		showVariable: true,
		showValue: true
	}, {
		label: "Start Reload",
		value: "startReload",
		eitherOrLabel: "Reload type",
		eitherOrOptions: [{
			label: "Complete",
			value: false
		}, {
			label: "Partial",
			value: true
		}]
	}, {
		label: "Start Reload Task",
		value: "startReloadTask",
		showTask: true,
		ifDesktop: false
	}, {
		label: "Apply Theme",
		value: "applyTheme",
		showTheme: true
	}, {
		label: "Log to Console",
		value: "logToConsole",
		valueLabel: "Expression",
		showValue: true
	}, {
		label: "Request confirmation",
		value: "requestConfirmation"
	// }, {
	// 	label: "Set Language",
	// 	value: "setLanguage",
	// 	showValue: true
	}],

	/**
	 * Sort handler for items by rank
	 *
	 * @param  {Object} a First item
	 * @param  {Object} b Second item
	 * @return {Number}   Sort order
	 */
	sortByRank = function( a, b ) {
		return parseFloat(a.qData.rank) - parseFloat(b.qData.rank);
	},

	/**
	 * Sort handler for hypercube cells in descending order
	 *
	 * @param  {Object} a First item
	 * @param  {Object} b Second item
	 * @return {Number}   Sort index
	 */
	sortHypercubeByNumDesc = function( a, b ) {
		return (a[1].qNum === b[1].qNum) ? 0 : a[1].qNum < b[1].qNum ? 1 : -1;
	},

	/**
	 * Return the item's relevant alternate state
	 *
	 * @param  {Object} item    Action item
	 * @param  {Object} context Action context
	 * @return {String} Alternate state
	 */
	getAlternateState = function( item, context ) {
		return (! item.state || ! item.state.length) ? (context && context.layout && context.layout.qStateName) : item.state;
	},

	/**
	 * Return the item's field
	 *
	 * @param  {Object} item  Action item
	 * @param  {Object} state Context state
	 * @param  {Function} callback Callback to run when the field was found
	 * @param  {Function} errorCallback Callback to run when the field was not found
	 * @return {Promise} The field when it exists
	 */
	getField = function( item, state, callback, errorCallback ) {
		var dfd = $q.defer(), field = app.field(item.field, state), result;

		// Define the default callback
		if ("undefined" === typeof errorCallback) {
			errorCallback = function() {
				return false;
			};
		}

		// The Promise of field.waitFor does not get resolved nor rejected when
		// the item.field is not a valid field name in the app. To make sure that
		// the field can properly be evaluated, we apply a delay before evaluation
		// to make sure that the API request must have returned any value.
		setTimeout(function() {
			if (! field.field) {
				showActionFeedback({
					title: "Invalid field",
					message: "The field named '" + field.fldname + "' does not exist. Please make sure the relevant expression generates an existing field name."
				}).closed.then(errorCallback).then(dfd.resolve);
			} else {

				// Run callback with field data
				if ("function" === typeof callback) {
					result = callback(field);
				}

				// Resolve when callback is run
				(result && result.then ? result : $q.resolve()).then( function() {
					dfd.resolve(field);
				});
			}
		}, 120);

		return dfd.promise;
	},

	/**
	 * Apply bookmark
	 *
	 * @param  {Object}  item Action
	 * @return {Promise}      Action done
	 */
	applyBookmark = function( item ) {
		app.bookmark.apply(item.bookmark);
	},

	/**
	 * Apply field selection
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	applySelection = function( item, context ) {
		var state = getAlternateState(item, context), values = [];

		if (item.value) {

			// Select number equivalent in case of Dual values
			if (item.value.hasOwnProperty("qText")) {
				values.push(item.value.qNum !== "NaN" ? item.value.qNum : item.value.qText);
			} else {
				values = item.value.split(";").map( function( value ) {
					return isNaN(value) ? value : Number(value);
				});
			}
		}

		// Require a field name
		if (item.field) {
			return getField(item, state, function( field ) {
				return field[item.eitherOr ? "toggleSelect" : "selectValues"](item.eitherOr ? String(values[0]) : values, false);
			});
		}
	},

	/**
	 * Clear field selection
	 *
	 * When no field is selected, defaults to clearing all selections.
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	clearSelection = function( item, context ) {
		var state = getAlternateState(item, context);

		// Require a field name for a single field
		if (item.field) {
			return getField(item, state, function( field ) {
				return field[item.eitherOr ? "clearOther" : "clear"]();
			});

		// Apply to all selected fields
		} else {
			return app.clearAll(false, state);
		}
	},

	/**
	 * Step back or forward in selection history
	 *
	 * @param  {Object}  item Action
	 * @return {Promise}      Action done
	 */
	backOrForward = function( item ) {
		return item.eitherOr ? app.forward() : app.back();
	},

	/**
	 * Lock or unlock a field
	 *
	 * When no field is selected, defaults to locking all selections.
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	lockField = function( item, context ) {
		var state = getAlternateState(item, context);

		// Require a field name for a single field
		if (item.field) {
			return getField(item, state, function( field ) {
				return field[item.eitherOr ? "unlock" : "lock"]();
			});

		// Apply to all selected fields
		} else {
			return app[item.eitherOr ? "unlockAll" : "lockAll"](state);
		}
	},

	/**
	 * Select Adjacent value
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	selectAdjacent = function( item, context ) {
		var dfd = $q.defer(), state = getAlternateState(item, context),

		// Setup the list definition
		def = {
			qStateName: state,
			qDef: {
				qFieldDefs: [item.field],
			},
			qShowAlternatives: true, // See comment for `app.createList()`
			qInitialDataFetch: [{
				qTop: 0,
				qLeft: 0,
				qWidth: 1,
				qHeight: 10000
			}]
		};

		// Require a field name
		if (item.field) {

			// Make sure the field exists
			getField(item, state, function() {

				// Add custom sorting logic
				if (item.sortExpression) {
					desc = 0 === item.sortExpression.indexOf("-");
					def.qDef.qSortCriterias = [{
						qSortByExpression: parseInt(item.sortOrder) || 1,
						qExpression: {
							qv: (0 === item.sortExpression.indexOf("=") ? "" : "=") + item.sortExpression
						}
					}];
				}

				/**
				 * Use `app.createList()` instead of `app.field().getData()` because
				 * the latter does not identify alternative selectable values.
				 */
				app.createList(def, function( list ) {

					// Remove updates for this session object before going forward
					app.destroySessionObject(list.qInfo.qId).then( function() {
						var items, selected, index;

						// Get all available values
						items = list.qListObject.qDataPages[0].qMatrix.filter( function( row ) {
							return "X" !== row[0].qState;
						});

						// Get all selected values
						selected = items.filter( function( row ) {
							return "S" === row[0].qState;
						});

						// Get selected index to start from
						index = items.indexOf(selected[item.eitherOr ? 0 : selected.length - 1]);

						// Apply selection and return its promise
						dfd.resolve(applySelection({
							state: state,
							field: item.field,
							value: items[item.eitherOr
								// Select previous value
								? ((0 === index || -1 === index) ? items.length : index) - 1
								// Select next value
								: (((items.length - 1 === index || -1 === index)) ? -1 : index) + 1
							][0]
						}, context));
					});
				});
			}, function() {

				// Stop the action chain
				dfd.resolve(false);
			});
		} else {

			// Silently continue the action chain
			dfd.resolve(true);
		}

		return dfd.promise;
	},

	/**
	 * Select all field values
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	selectAll = function( item, context ) {
		var state = getAlternateState(item, context);

		// Require a field name
		if (item.field) {
			return getField(item, state, function( field ) {
				return field.selectAll();
			});
		}
	},

	/**
	 * Select excluded field values
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	selectExcluded = function( item, context ) {
		var state = getAlternateState(item, context);

		// Require a field name
		if (item.field) {
			return getField(item, state, function( field ) {
				return field.selectExcluded();
			});
		}
	},

	/**
	 * Select possible field values
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	selectPossible = function( item, context ) {
		var state = getAlternateState(item, context);

		// Require a field name
		if (item.field) {
			return getField(item, state, function( field ) {
				return field.selectPossible();
			});
		}
	},

	/**
	 * Select alternative field values
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	selectAlternative = function( item, context ) {
		var state = getAlternateState(item, context);

		// Require a field name
		if (item.field) {
			return getField(item, state, function( field ) {
				return field.selectAlternative();
			});
		}
	},

	/**
	 * Select field values by a pareto expression
	 *
	 * @param  {Object}  item    Action
	 * @param  {String}  context Action context or visualization scope
	 * @return {Promise}         Action done
	 */
	selectPareto = function( item, context ) {
		var dfd = $q.defer(), added = 0, threshold, selection = [], state = getAlternateState(item, context);

		if (item.field && item.value) {

			// Make sure the field exists
			getField(item, state, function() {
				/**
				 * Create a cube when the action is run instead of instantly on the item's
				 * property data (like normal visualizations do using a hypercube). This way,
				 * there's no constant updating of hypercube data, but only a single fetch.
				 * The cube is immediately destroyed after it is received.
				 */
				app.createCube({
					qStateName: state,
					qDimensions: [{
						qDef: {
							qFieldDefs: [item.field]
						}
					}],
					qMeasures: [{
						qDef: {
							qDef: (0 === item.value.indexOf("=") ? "" : "=") + item.value
						}
					}],
					qInitialDataFetch: [{
						qTop: 0,
						qLeft: 0,
						qWidth: 2,
						qHeight: 5000
					}]
				}, function( cube ) {

					// Remove updates for this session object before going forward
					app.destroySessionObject(cube.qInfo.qId).then( function() {

						// Get threshold value to match. Get the total value for all rows and take the threshold's part.
						threshold = cube.qHyperCube.qDataPages[0].qMatrix.reduce( function( a, b ) {
							return a + b[1].qNum;
						}, 0) * (item.threshold / 100);

						// Add measure values descendingly up to the threshold
						cube.qHyperCube.qDataPages[0].qMatrix.sort(sortHypercubeByNumDesc).some( function( i ) {

							// Skip null values
							if (i[0].qIsNull) {
								return false;
							}

							// Add next measure value
							added += i[1].qNum;

							// Bail when reaching the defined threshold
							if (added >= threshold) {

								// Add the last item when including the threshold
								if (added > threshold && false !== item.includeThreshold) {
									selection.push(i[0].qText);
								}

								return true;
							}

							selection.push(i[0].qText);
						});

						// Apply selection and return its promise
						dfd.resolve(applySelection({
							state: state,
							field: item.field,
							value: selection.join(";")
						}, context));
					});
				});
			}, function() {

				// Stop the action chain
				dfd.resolve(false);
			});
		} else {

			// Silently continue the action chain
			dfd.resolve(true);
		}

		return dfd.promise;
	},

	/**
	 * Set a Variable Value
	 *
	 * @param  {Object}  item Action
	 * @return {Promise}      Action done
	 */
	setVariable = function( item ) {
		// `setContent` is deprecated since 2.1, use `setNumValue` or `setStringValue` instead
		return app.variable["number" === typeof item.value ? "setNumValue" : "setStringValue"](item.variable, item.value);
	},

	/**
	 * Holds the HTML template for the reload modal
	 *
	 * @type {String}
	 */
	reloadTmpl = '<lui-dialog x-variant="{{::variant}}" class="qv-confirm-dialog">\r\n\t<lui-dialog-header ng-if="input.title">\r\n\t\t<lui-dialog-title>{{input.title}}</lui-dialog-title>\r\n\t</lui-dialog-header>\r\n\t<lui-dialog-body class="qv-scripteditor-progressindicator" style="width:auto;margin:0px;">\n\t\t<div class="content">{{input.message}}</div>\r\n\t\t<div ng-if="input.showProgress" class="elapsed">\n\t\t\t<span q-translation="scripteditor.progressindicator.elapsedtime"></span>\n\t\t\t<span class="time">{{elapsedTime}}</span>\n\t\t</div>\r\n\t</lui-dialog-body>\r\n\t<lui-dialog-footer>\r\n\t\t<lui-button x-variant="{{::variant}}" ng-if="!input.hideCancelButton" ng-click="close(false);">{{::cancelLabel}}</lui-button>\r\n\t\t<lui-button x-variant="{{::variant}}" ng-if="!input.hideOkButton" ng-click="close(true);">{{::okLabel}}</lui-button>\r\n\t</lui-dialog-footer>\r\n</lui-dialog>\r\n',

	/**
	 * Return two-digits for a number
	 *
	 * @param  {Integer} num Number to format
	 * @return {String} Formatted number
	 */
	formatNum = function( num ) {
		num = Math.floor(num);
		return (num < 10 ? "0" : "") + num.toString();
	},

	/**
	 * Return the elapsed time
	 *
	 * @param {Date} timeStarted Time started
	 * @param {Date} timeUntill Optional. Time untill. Defaults to now.
	 * @return {String} Elapsed time in six digits
	 */
	getElapsedTime = function( timeStarted, timeUntill ) {
		timeUntill = timeUntill || new Date();

		var timeDiff = (timeUntill - timeStarted) / 1000,
		    elapsedTime = formatNum(timeDiff / 3600) + ":" + formatNum(timeDiff % 3600 / 60) + ":" + formatNum(timeDiff % 60);

		return elapsedTime;
	},

	/**
	 * Offer a downloadable file with `data` as content
	 *
	 * @link  https://stackoverflow.com/a/33542499/3601434
	 *
	 * @param  {String} filename File name
	 * @param  {String} data     Data to download
	 * @return {Void}
	 */
	downloadTextAsFile = function( filename, data ) {
		var blob = new Blob([data], {
			type: 'text/plain'
		});

		if (window.navigator.msSaveOrOpenBlob) {
			window.navigator.msSaveBlob(blob, filename);
		} else {
			var elem = window.document.createElement('a');

			// Create url
			elem.href = window.URL.createObjectURL(blob);
			elem.download = filename;        

			// Simulate navigation
			document.body.appendChild(elem);
			elem.click();        
			document.body.removeChild(elem);

			// Remove url
			window.URL.revokeObjectURL(elem.href);
		}
	},

	/**
	 * Start a Reload
	 *
	 * @param  {Object}  item Action
	 * @return {Promise}      Action done
	 */
	startReload = function( item ) {
		var dfd = $q.defer(),

		/**
		 * Consider the reload started just now
		 *
		 * @type {Date}
		 */
		timeStarted = new Date(),

		/**
		 * Holds the progress timer's interval
		 *
		 * @type {Timeout}
		 */
		progressInterval = null,

		// Custom confirm dialog with counter
		dialog = qvangular.getService("luiDialog").show({
			/**
			 * Controller of the dialog. Keeps track of reload execution progress.
			 *
			 * @return {Void}
			 */
			controller: ["$scope", "$interval", function( $scope, $interval ) {
				/**
				 * Check progress on the execution result
				 *
				 * @return {Void}
				 */
				var progressIndicator = function() {
					$scope.elapsedTime = getElapsedTime(timeStarted);
				};

				// Get label defaults
				$scope.okLabel = $scope.input.okLabel || translator.get( "Common.OK" );
				$scope.cancelLabel = $scope.input.cancelLabel || translator.get( "Common.Cancel" );

				// Set initial elapsed time
				$scope.elapsedTime = getElapsedTime(timeStarted);

				// Update the task's elapsed time each second
				progressInterval = $interval(progressIndicator, 1000);

				// Start the reload, maybe partially
				app.doReload(0, !! item.eitherOr, false).then( function( success ) {
					$scope.input.hideOkButton = false;
					$scope.input.hideCancelButton = true;

					// Stop the interval
					$interval.cancel(progressInterval);

					// The reload succeeded
					if (success) {
						$scope.input.title = "Reload executed";
						$scope.input.message = "The reload for this app was successfully executed.";

						// Save the new data
						app.doSave();

						// Close on success
						if (item.taskAutoResolve) {
							$scope.close(true);
						}

					// The reload failed
					} else {
						$scope.input.title = "Reload failed";
						$scope.input.message = "Execution of the reload for this app failed.";
					}
				});
			}],
			template: reloadTmpl,
			input: {
				message: "The reload for this app was started.",
				title: "Reload started",
				showProgress: true,
				cancelLabel: "Abort",
				hideCancelButton: false,
				hideOkButton: true,
			},
			variant: false,
			closeOnEscape: false
		});

		dialog.closed.then( function( confirmed ) {

			// Make sure the interval is stopped
			progressInterval && qvangular.getService("$interval").cancel(progressInterval);

			// Cancel reload on cancel
			if (! confirmed) {
				app.global.cancelReload();

				// Display abort dialog
				qvangular.getService("luiDialog").show({
					controller: ["$scope", function( $scope ) {
						$scope.okLabel = translator.get("Common.Close");
						$scope.elapsedTime = getElapsedTime(timeStarted);
					}],
					template: reloadTmpl,
					input: {
						message: "The reload for this app was aborted.",
						title: "Reload aborted",
						showProgress: true,
						hideCancelButton: true,
						hideOkButton: false
					}
				}).closed.then( function() {

					// Stop the action chain
					dfd.resolve(false);
				});
			} else {

				// Continue the action chain
				dfd.resolve(true);
			}
		});

		return dfd.promise;
	},

	/**
	 * Start a Reload Task
	 *
	 * @server
	 *
	 * @param  {Object}  item Action
	 * @return {Promise}      Action done
	 */
	startReloadTask = function( item ) {
		var actionDfd = $q.defer(),

		/**
		 * Display a feedback message saying the task is not found
		 *
		 * @param {String} id Optional. Task id
		 * @return {Object} API of the created dialog
		 */
		taskIsNotFoundDialog = function( id ) {
			var dialog = showActionFeedback({
				title: "Reload task error",
				message: id
					? "The reload task with id '" + id + "' was not found."
					: "The settings for this action are not properly defined."
			});

			dialog.closed.then(actionDfd.resolve);

			return dialog;
		},

		/**
		 * Display a feedback message saying the task is already running
		 *
		 * @param {Object} task Task details
		 * @return {Object} API of the created dialog
		 */
		taskIsRunningDialog = function( task ) {
			var dialog = showActionFeedback({
				title: "Reload task",
				message: "The reload task named '" + task.name + "' is currently running."
			});

			dialog.closed.then(actionDfd.resolve);

			return dialog;
		},

		/**
		 * Return the status of the session
		 *
		 * @param  {String} sessionId Session id
		 * @return {Promise} Session status
		 */
		checkExecutionResult = function( sessionId ) {
			var dfd = $q.defer();

			// Check the session execution
			request({
				url: "/qrs/executionresult?filter=executionId eq " + sessionId
			}).then( function( resp ) {

				// No access
				if (! resp.data.length) {
					dfd.reject({ message: "Forbidden" });

				// Task failed
				} else if (8 === resp.data[0].status) {
					dfd.reject(resp.data[0]);

				// Task executed
				} else if (7 === resp.data[0].status) {
					dfd.resolve(resp.data[0]);

				// Busy
				} else {
					dfd.resolve(false);
				}
			}).catch( function( error ) {
				dfd.reject(error);
			});

			return dfd.promise;
		},

		/**
		 * Display a feedback message saying the task is started
		 *
		 * @param {Object} task Task details
		 * @param {String} sessionId Session id
		 * @return {Object} API of the created dialog
		 */
		taskIsStartedDialog = function( task, sessionId ) {
			/**
			 * Consider the task started just now
			 *
			 * @type {Date}
			 */
			var timeStarted = new Date(),

			/**
			 * Holds the progress timer's interval
			 *
			 * @type {Timeout}
			 */
			progressInterval = null,

			// Custom confirm dialog with counter
			dialog = qvangular.getService("luiDialog").show({
				/**
				 * Controller of the dialog. Keeps track of task execution progress.
				 *
				 * @return {Void}
				 */
				controller: ["$scope", "$interval", function( $scope, $interval ) {
					/**
					 * Setup progress checker
					 *
					 * @type {Boolean}
					 */
					var progressCheck = true,

					/**
					 * Check progress on the execution result
					 *
					 * @return {Void}
					 */
					progressIndicator = function() {

						// Update elapsed time
						$scope.elapsedTime = getElapsedTime(timeStarted);

						// Continue when the progress checker is cleared
						if ( progressCheck ) {

							// Lock the progress checker
							progressCheck = false;

							// Check the task's execution status
							checkExecutionResult(sessionId)
								.then(executionResultSuccess)
								.catch(executionResultFailed)
								.finally( function() {

									// Clear the progress checker
									progressCheck = true;
								});
						}
					},

					/**
					 * Act when the execution result was successfully fetched
					 *
					 * @param  {Number} status Status code
					 * @return {Void}
					 */
					executionResultSuccess = function( status ) {

						// Execution is not finished
						if (! status)
							return;

						// Execution is done
						clearInterval(progressInterval);

						$scope.input.hideOkButton = false;
						$scope.input.title = "Reload task executed";
						$scope.input.message = "The reload task named '" + task.name + "' was successfully executed.";

						// Close on success
						if (item.taskAutoResolve) {
							$scope.close(true);
						}
					},

					/**
					 * Act when the execution (result) was failed
					 *
					 * @param  {Object} error Error data
					 * @return {Void}
					 */
					executionResultFailed = function( error ) {
						var message = error.details ? error.details[error.details.length - 1].message : error.message;

						clearInterval(progressInterval);

						$scope.input.title = "Reload task failed";
						$scope.input.message = "Execution of the reload task named '" + task.name + "' failed with the following message: " + message;
						$scope.input.hideOkButton = false;

						// Enable script log download
						if (error.details) {

							// Store error on the dialog object
							dialog.error = error;
							
							$scope.input.hideCancelButton = false;
							$scope.cancelLabel = "Download log";
						}
					};

					// Get label defaults
					$scope.okLabel = $scope.input.okLabel || translator.get( "Common.OK" );
					$scope.cancelLabel = $scope.input.cancelLabel || translator.get( "Common.Cancel" );

					// Set initial elapsed time
					$scope.elapsedTime = getElapsedTime(timeStarted);

					// Keep track of task execution progress
					if ($scope.input.showProgress) {

						// Start progress checker. Update the task's elapsed time each second
						progressInterval = setInterval(progressIndicator, 1000);
					}
				}],
				template: reloadTmpl,
				input: {
					message: "The reload task named '" + task.name + "' was started.",
					title: "Reload task started",
					showProgress: ! item.taskDisplayProgress || "optional" === item.taskDisplayProgress,
					hideCancelButton: true,
					hideOkButton: ! item.taskDisplayProgress,
				},
				variant: false,
				closeOnEscape: false
			});

			// When the dialog is closed...
			dialog.closed.then( function( confirmed ) {

				// Make sure the interval is stopped
				progressInterval && clearInterval(progressInterval);

				// Download script log when requested
				if (! confirmed) {

					// Stop the action chain
					actionDfd.resolve(false);

					// Try to download script log
					if (dialog.error && dialog.error.fileReferenceID) {

						// Identify the script file id
						request({
							url: "/qrs/reloadtask/" + task.id + "/scriptlog?fileReferenceId=" + dialog.error.fileReferenceID
						}).then( function( resp ) {

							/**
							 * Download the contents of the script log
							 *
							 * @link https://community.qlik.com/t5/Qlik-Sense-Integration/Download-LOG-file-using-QRS-API/m-p/1567000
							 */
							request({
								url: "/qrs/download/reloadtask/" + resp.data.value + "/" + task.name + ".log"
							}).then( function( resp ) {

								// Trigger download for the script log as file
								downloadTextAsFile(task.name + ".log", resp.data);
							});
						});
					}
				} else {
					actionDfd.resolve(true);
				}
			});

			return dialog;
		},

		/**
		 * Display a feedback message saying the task is not started
		 *
		 * @param {Object} task Task details
		 * @param {Object} error Error details
		 * @return {Object} API of the created dialog
		 */
		taskIsNotStartedDialog = function( task, error ) {
			var dialog = showActionFeedback({
				title: "Reload task error",
				message: "Something went wrong when trying to start the reload task named '" + task.name + "': " + error.data
			});

			dialog.closed.then(actionDfd.resolve);

			return dialog;
		},

		/**
		 * Display a confirmation dialog before starting the task
		 *
		 * @param {Object} task Task details
		 * @return {Object} API of the created dialog
		 */
		confirmReloadTaskDialog = function( task ) {
			var dialog;

			// When skipping task confirmation, mimic dialog closed promise
			if (item.taskSkipConfirmation) {
				dialog = {
					opened: $q.resolve(),
					closing: $q.resolve(),
					closed: $q.resolve(true)
				};

			// Require task confirmation, show action dialog
			} else {
				dialog = showActionFeedback({
					title: "Reload task",
					message: "You are going to start the reload task named '" + task.name + "'.",
					okLabel: "Start task",
					hideCancelButton: false
				});
			}

			// When the dialog was closed
			dialog.closed.then( function startTaskConfirmed( confirmed ) {
				if (confirmed) {
					startTask(task);
				} else {

					// Stop the action chain
					actionDfd.resolve(false);
				}
			});

			return dialog;
		},

		/**
		 * Start the task
		 *
		 * @param {Object} task Task details
		 * @return {Void}
		 */
		startTask = function( task ) {
			request({
				method: "POST",
				url: "/qrs/task/" + task.id + "/start/synchronous"
			}).then( function openTaskIsStartedDialog( resp ) {
				taskIsStartedDialog(task, resp.data.value);
			}).catch( function openTaskIsNotStartedDialog( error ) {
				taskIsNotStartedDialog(task, error);
			});
		};

		// Find the reload task. It might not be available (for the user or it was deleted)
		if (item.task) {
			request({
				url: "/qrs/reloadtask/" + item.task
			}).then( function findTaskIsRunning( resp ) {
				var task = resp.data;

				// Find whether the task is already running
				request({
					url: "/qrs/executionsession?filter=reloadTask.id eq " + task.id
				}).then( function openConfirmReloadTaskDialog( resp ) {
					var dialog;

					// Task is already running
					if (resp.data.length) {
						taskIsRunningDialog(task);

					// Task is not currently running
					} else {
						confirmReloadTaskDialog(task);
					}
				});
			}).catch( function() {
				taskIsNotFoundDialog(item.task);
			});
		} else {
			taskIsNotFoundDialog();
		}

		return actionDfd.promise;
	},

	/**
	 * Apply a Theme
	 *
	 * @param  {Object}  item Action
	 * @return {Promise}      Action done
	 */
	applyTheme = function( item ) {
		return qlik.theme.apply(item.theme);
	},

	/**
	 * Log a value to the console
	 *
	 * @param  {Object}  item Action
	 * @return {Void}
	 */
	logToConsole = function( item ) {
		console.log(item.value);
	},

	/**
	 * Display a confirmation dialog
	 *
	 * @param  {Object}  item Action
	 * @return {Promise} Action confirmed or cancelled
	 */
	requestConfirmation = function( item ) {
		var dfd = $q.defer(),

		// Contstruct dialog
		dialog = showActionFeedback({
			title: item.modalTitle,
			message: item.modalContent || ( item.modalTitle ? "" : "Are you sure?" ),
			okLabel: item.modalOkLabel || translator.get( "Common.OK" ),
			cancelLabel: item.modalCancelLabel,
			hideCancelButton: ! item.modalCancelLabel
		});

		// Resolve the promise on dialog close. Cancelling the modal will
		// short-circuit the action chain.
		dialog.closed.then(dfd.resolve);

		return dfd.promise;
	},

	/**
	 * Set the language
	 *
	 * @inactive Should be used _before_ opening an app.
	 *
	 * @param  {Object}  item Action
	 * @return {Promise}      Action done
	 */
	setLanguage = function( item ) {
		return qlik.setLanguage(item.language);
	},

	/**
	 * Holds the available action methods
	 *
	 * @type {Object}
	 */
	actions = {

		// Field
		applyBookmark: applyBookmark,
		applySelection: applySelection,
		clearSelection: clearSelection,
		backOrForward: backOrForward,
		lockField: lockField,
		selectAdjacent: selectAdjacent,
		selectAll: selectAll,
		selectExcluded: selectExcluded,
		selectPossible: selectPossible,
		selectAlternative: selectAlternative,
		selectPareto: selectPareto,

		// Variable
		setVariable: setVariable,

		// App
		startReload: startReload,
		startReloadTask: startReloadTask,

		// Theme
		applyTheme: applyTheme,

		// Other
		logToConsole: logToConsole,
		requestConfirmation: requestConfirmation
	},

	/**
	 * Method to return an action item's sanitized title
	 *
	 * @param  {Object} item Action properties
	 * @return {String} Action item title
	 */
	actionItemTitleRef = function( item ) {
		var option = _.findWhere(actionOptions, { value: item.action }), title;

		if (! option) {
			title = item.action;
		} else {
			switch (option.value) {
				case "selectAdjacent" :
					title = item.eitherOr ? "Select Previous Value" : "Select Next Value";
					break;
				case "clearSelection" :
					title = item.field
						? (item.eitherOr ? "Clear Other Fields" : "Clear Field")
						: "Clear All Selections";
					break;
				case "backOrForward" :
					title = item.eitherOr ? "Forward" : "Back";
					break;
				case "lockField" :
					title = item.field
						? (item.eitherOr ? "Unlock Field" : "Lock Field")
						: (item.eitherOr ? "Unlock All Fields" : "Lock All Fields");
					break;
				default :
					title = option.label;
			}
		}

		// Signal disabled actions
		if (! item.enabled) {
			title = "// " + title;
		}

		return title;
	},

	/** Navigation options **/

	/**
	 * Holds the set of available navigations
	 *
	 * @type {Array}
	 */
	navigationOptions = [{
		label: "Navigate to a Sheet",
		value: "goToSheet",
		showSheet: true
	}, {
		label: "Navigate to First Sheet",
		value: "goToFirstSheet"
	}, {
		label: "Navigate to Previous Sheet",
		value: "goToPrevSheet"
	}, {
		label: "Navigate to Next Sheet",
		value: "goToNextSheet"
	}, {
		label: "Navigate to Last Sheet",
		value: "goToLastSheet"
	}, {
		label: "Navigate to Dashboard",
		value: "goToAppSheet",
		showApp: true,
		showSheet: true
	}, {
		label: "Start Story",
		value: "startStory",
		showStory: true
	}, {
		label: "Navigate to URI",
		value: "goToURI",
		showValue: true
	}, {
		label: "Switch to Edit Mode",
		value: "switchToEdit"
	}],

	/**
	 * Return the app's first sheet
	 *
	 * @return {Promise} First sheet
	 */
	getSheetByIndex = function( index ) {
		var dfd = $q.defer(), sheet;

		// Default index to 0
		index = "undefined" === typeof index ? 0 : Number(index);

		// Get app sheets
		app.getList("sheet", function( list ) {
			var items = list.qAppObjectList.qItems.sort(sortByRank);

			// Count from array's end
			if (index < 0) {
				index = items.length + index;
			}

			// Get sheet id
			sheet = items[items.length > index ? index : 0].qInfo.qId;

			dfd.resolve(sheet);
		});

		return dfd.promise;
	},

	/**
	 * Navigate to Sheet
	 *
	 * @param  {Object}  item Action
	 * @return {Void}
	 */
	goToSheet = function( item ) {
		qlik.navigation.gotoSheet(item.sheet);
	},

	/**
	 * Navigate to First Sheet
	 *
	 * @return {Void}
	 */
	goToFirstSheet = function() {
		getSheetByIndex().then( function( sheet ) {
			qlik.navigation.gotoSheet(sheet);
		});
	},

	/**
	 * Navigate to Next Sheet
	 *
	 * @return {Void}
	 */
	goToNextSheet = function() {
		qlik.navigation.nextSheet();
	},

	/**
	 * Navigate to Previous Sheet
	 *
	 * @return {Void}
	 */
	goToPrevSheet = function() {
		qlik.navigation.prevSheet();
	},

	/**
	 * Navigate to Last Sheet
	 *
	 * @return {Void}
	 */
	goToLastSheet = function() {
		getSheetByIndex(-1).then( function( sheet ) {
			qlik.navigation.gotoSheet(sheet);
		});
	},

	/**
	 * Navigate to Dashboard
	 *
	 * TODO: option to send selection parameters along?
	 *
	 * @param  {Object}  item Action
	 * @return {Void}
	 */
	goToAppSheet = function( item ) {
		var config = app.global.session.options,
		    url;

		if (item.app) {
		    url = (config.isSecure ? "https://" : "http://") + config.host
		    	+ (config.port ? ":" + config.port : "")
		    	+ (config.prefix ? "/" + config.prefix : "")
		    	+ "/sense/app/" + encodeURIComponent(item.app)
		    	+ (item.sheet ? "/sheet/" + item.sheet + "/state/analysis" : "");

			window.open(url, item.newTab ? "_blank" : "_self");
		}
	},

	/**
	 * Start Story
	 *
	 * @param  {Object}  item Action
	 * @return {Void}
	 */
	startStory = function( item ) {
		item.story && qlik.navigation.gotoStory(item.story);
	},

	/**
	 * Navigate to Website
	 *
	 * @param  {Object}  item Action
	 * @return {Void}
	 */
	goToURI = function( item ) {
		item.value && window.open(item.value, item.newTab ? "_blank" : "_self");
	},

	/**
	 * Switch to Edit mode when allowed
	 *
	 * @param  {Object}  item Action
	 * @return {Void}
	 */
	switchToEdit = function( item ) {
		if (qlik.navigation.isModeAllowed(qlik.navigation.EDIT)) {
			qlik.navigation.setMode(qlik.navigation.EDIT);
		} else {
			showActionFeedback({
				title: "Edit Mode",
				message: "You are not allowed to edit this sheet."
			});
		}
	},

	/**
	 * Holds the available navigation methods
	 *
	 * @type {Object}
	 */
	navigation = {
		goToSheet: goToSheet,
		goToFirstSheet: goToFirstSheet,
		goToNextSheet: goToNextSheet,
		goToPrevSheet: goToPrevSheet,
		goToLastSheet: goToLastSheet,
		goToAppSheet: goToAppSheet,
		startStory: startStory,
		goToURI: goToURI,
		switchToEdit: switchToEdit
	},

	/** Helpers **/

	/**
	 * Run a single action
	 *
	 * @param  {Object} item    Single registered action
	 * @param  {Object} context Action context
	 * @return {Promise}        Action done
	 */
	doOne = function( item, context ) {
		return item.enabled !== false
			? "function" === typeof actions[item.action]
				? actions[item.action](item, context)
				: $q.reject("E-mergo actions: '" + item.action + "' action handler not found", item)
			: $q.resolve();
	},

	/**
	 * Run multiple actions sequentially
	 *
	 * @param  {Array}  items   Multiple registered actions
	 * @param  {Object} context Action context
	 * @return {Promise}        Actions done. False indicates the action chain was broken.
	 */
	doMany = function( items, context ) {
		return (items.actions || items).map( function( item ) {
			return doOne.bind(this, item, context);
		}).reduce( function( promise, fn ) {
			return promise.then( function( retval ) {

				// Only continue when the previous action did not return false
				if (false !== retval) {
					return fn();
				} else {
					return false;
				}
			});
		}, $q.resolve());
	},

	/**
	 * Run the navigation action
	 *
	 * @param  {Object} nav     Navigation settings
	 * @param  {Object} context Navigation context
	 * @return {Void}
	 */
	doNavigation = function( nav, context ) {
		nav.navigation && (nav = nav.navigation);
		nav.enabled && "function" === typeof navigation[nav.action] && navigation[nav.action](nav);
	},

	/**
	 * Show a feedback confirmation modal
	 *
	 * Available options on the `qvConfirmDialog` are:
	 *  - title
	 *  - message
	 *  - icon
	 *  - okLabel
	 *  - cancelLabel
	 *  - hideCancelButton
	 *  - variant
	 *  - closeOnEscape
	 *
	 * The returned dialog object provides the `close()` method as well as the
	 * following promises:
	 *  - opened
	 *  - closed
	 *  - closing
	 *
	 * @param {Object} options Dialog options
	 * @return {Object} The dialog
	 */
	showActionFeedback = function( options ) {
		options.hasOwnProperty("hideCancelButton") || (options.hideCancelButton = true);
		return qvangular.getService("qvConfirmDialog").show(options);
	},

	/**
	 * Return the item by id from a list of items
	 *
	 * @param  {Array} items List of items
	 * @param  {String} id Item's cId
	 * @return {Object|Boolean} Item or False if not found.
	 */
	getItem = function( items, id ) {
		return items.find( function( item ) {
			return item.cId === id;
		});
	},

	/**
	 * Return the action item's property
	 *
	 * @param  {Object}  item Action
	 * @param  {Boolean} prop Property to signify for showing
	 * @return {Boolean}      Show panel's property
	 */
	getProperty = function( item, prop ) {
		var i = _.findWhere(actionOptions.concat(navigationOptions), { value: item.action || (item.navigation && item.navigation.action) });
		return i && i[prop];
	},

	/**
	 * Return whether to show the panel's property
	 *
	 * @param  {Object}  item Action
	 * @param  {Boolean} prop Property to signify for showing
	 * @return {Boolean}      Show panel's property
	 */
	showProperty = function( item, prop ) {
		return !! getProperty(item, prop);
	},

	/**
	 * Return the object in the item's tree for which the property equals
	 * the provided value.
	 *
	 * @param  {Object} item Object tree
	 * @param  {String} prop Property name
	 * @param  {Mixed}  value Value to match
	 * @param  {Array} skip Property names to skip searching
	 * @return {Object|Boolean} Searched object or False when not found
	 */
	findObjByPropValue = function( item, prop, value, skip ) {
		var obj = false, i;

		// Default to skipping the hypercube definition
		skip = skip || ["qHyperCubeDef"];

		// Object is found!
		if (item.hasOwnProperty(prop) && item[prop] === value) {
			obj = item;

		// Walk item's properties
		} else {
			for (i in item) {
				if (item.hasOwnProperty(i) && -1 === skip.indexOf(i)) {
					if (Array.isArray(item[i])) {
						obj = item[i].reduce( function( a, b ) {
							return a || findObjByPropValue(b, prop, value, skip);
						}, false);
					} else if (_.isObject(item[i])) {
						obj = findObjByPropValue(item[i], prop, value, skip);
					}

					if (obj) {
						break;
					}
				}
			}
		}

		return obj;
	},

	/**
	 * Return whether this is the current app
	 *
	 * @param  {String}  id App Id
	 * @return {Boolean} Is this the current app?
	 */
	isCurrentApp = function( id ) {
		return id === app.model.id;
	},

	/**
	 * Holds the cache key for inline dimensions
	 *
	 * @type {Number}
	 */
	e = 0,

	/**
	 * Holds the loaded tasks
	 *
	 * This is loaded once when calling the QRS REST API to
	 * prevent max listener errors on the related event emitter.
	 *
	 * @type {Array}
	 */
	taskList,

	/**
	 * Holds the definition of an `action` panel property
	 *
	 * @type {Object}
	 */
	actionsDefinition = {
		action: {
			label: "Action",
			type: "string",
			component: "dropdown",
			ref: "action",
			options: function() {
				return optionsDfd.actions;
			}
		},
		field: {
			translation: "Common.Field",
			type: "string",
			expression: "optional", // How is this parsed?
			ref: "field",
			show: function( item ) {
				return showProperty(item, "showField");
			}
		},
		bookmark: {
			translation: "Embed.Dialog.ApplyBookmark",
			type: "string",
			component: "dropdown",
			ref: "bookmark",
			options: function() {
				var dfd = $q.defer();

				app.getList("BookmarkList", function( list ) {
					dfd.resolve( list.qBookmarkList.qItems.sort(sortByRank).map( function( a ) {
						return {
							label: a.qMeta.title,
							value: a.qInfo.qId
						};
					}));
				});

				return dfd.promise;
			},
			show: function( item ) {
				return showProperty(item, "showBookmark");
			}
		},
		variable: {
			translation: "Common.Variable",
			type: "string",
			ref: "variable",
			component: "dropdown",
			options: function() {
				var dfd = $q.defer(),
				    def = {
						qVariableListDef:{
							qType:"variable"
						}
					};

				app.createGenericObject(def).then( function( object ) {
					dfd.resolve(object.layout.qVariableList.qItems.map( function( b ) {
						return {
							value: b.qName,
							label: 50 < b.qName.length ? b.qName.slice(0, 50) + "&hellip;" : b.qName
						};
					}));
				});

				return dfd.promise;
			},
			show: function( item ) {
				return showProperty(item, "showVariable");
			}
		},
		task: {
			label: "Task",
			type: "string",
			component: "dropdown",
			ref: "task",
			options: function() {
				var dfd = $q.defer();

				if ("undefined" === typeof taskList) {
					request({
						url: "/qrs/reloadtask/full"
					}).then( function( resp ) {
						taskList = resp.data.map( function( a ) {
							return {
								label: a.name,
								value: a.id
							};
						});

						dfd.resolve(taskList);
					});
				} else {
					dfd.resolve(taskList);
				}

				return dfd.promise;
			},
			show: function( item ) {
				return showProperty(item, "showTask");
			}
		},
		taskDisplayProgress: {
			label: "Display progress",
			type: "string",
			component: "dropdown",
			ref: "taskDisplayProgress",
			options: [{
				label: "Enforced",
				value: ""
			}, {
				label: "Optional",
				value: "optional"
			}, {
				label: "Hidden",
				value: "hidden"
			}],
			defaultValue: "",
			show: function( item ) {
				return showProperty(item, "showTask");
			}
		},
		taskSkipConfirmation: {
			label: "Skip task confirmation",
			type: "boolean",
			ref: "taskSkipConfirmation",
			defaultValue: false,
			show: function( item ) {
				return showProperty(item, "showTask");
			}
		},
		taskAutoResolve: {
			label: "Close on success",
			type: "boolean",
			ref: "taskAutoResolve",
			defaultValue: false,
			show: function( item ) {
				return showProperty(item, "showTask") || "startReload" === item.action;
			}
		},
		theme: {
			translation: "Embed.Dialog.SetTheme",
			type: "string",
			component: "dropdown",
			ref: "theme",
			options: function() {
				var dfd = $q.defer();

				qlik.getThemeList().then( function( items ) {
					dfd.resolve( items.map( function( a ) {
						return {
							label: a.name,
							value: a.id
						};
					}));
				});

				return dfd.promise;
			},
			show: function( item ) {
				return showProperty(item, "showTheme");
			}
		},
		value: {
			label: function( item ) {
				return getProperty(item, "valueLabel") || translator.get("ExpressionEditor.Value");
			},
			type: "string",
			expression: "optional",
			ref: "value",
			show: function( item ) {
				return showProperty(item, "showValue");
			}
		},
		state: { // Refer to propertyPanel.defaults.appearance.items.selections.items.alternateState
			translation: "AlternateState.SelectState",
			type: "string",
			component: "dropdown",
			ref: "state",
			options: function( item, context ) {
				var states = context.app.layout.qStateNames || [];

				return [{
					value: "",
					translation: "AlternateState.InheritedState"
				}, {
					value: "$",
					translation: "AlternateState.DefaultState"
				}].concat(states.map( function( a ) {
					return {
						value: a,
						label: a
					};
				}));
			},
			defaultValue: "",
			show: function( item ) {
				return showProperty(item, "showState");
			}
		},
		sortExpression: {
			translation: "properties.sorting",
			type: "string",
			expression: "optional",
			ref: "sortExpression",
			show: function( item ) {
				return showProperty(item, "showSortExpression");
			}
		},
		sortOrder: {
			// label: "Sorting order",
			type: "boolean",
			component: "dropdown",
			ref: "sortOrder",
			defaultValue: 1,
			options: [{
				translation: "properties.sorting.ascending",
				value: 1,
			}, {
				translation: "properties.sorting.descending",
				value: -1
			}],
			show: function( item ) {
				return showProperty(item, "showSortExpression");
			}
		},
		eitherOr: {
			label: function( item ) {
				return getProperty(item, "eitherOrLabel") || "";
			},
			ref: "eitherOr",
			type: "boolean",
			component: "buttongroup",
			defaultValue: false,
			/**
			 * Generate options for the buttongroup
			 *
			 * @param  {Object} item The item's layout
			 * @return {Array}
			 */
			options: (function() {
				/**
				 * In the `options` method the initial call has the correct
				 * `item` parameter as the item's layout. However in subsequent
				 * calls the first parameter is replaced by the global extension
				 * layout. It contains all registered items, so there is no
				 * telling which item to get the options from. This is a bug in QS.
				 *
				 * To fix this, the parameter's id is stored in a separate variable
				 * within a closure. The first and subsequent calls will then use
				 * this stored id to use the correct version of the item.
				 */
				var _cId;
				return function( item ) {
					var _item;

					// The actual item is provided. Store its id.
					if (item.hasOwnProperty("cId")) {
						_cId = item.cId;
						_item = item;

					// Find the relevant item by using the stored id
					} else {
						_item = findObjByPropValue(item, "cId", _cId);
					}

					return getProperty(_item, "eitherOrOptions") || [false, true];
				};
			})(),
			show: function( item ) {
				var show = showProperty(item, "eitherOrOptions");

				// Hide when no fields are selected for the `clearSelection` action
				if ("clearSelection" === item.action && ! item.field) {
					show = false;
				}

				return show;
			}
		},
		threshold: {
			label: function( item ) {
				return "Threshold" + (item.threshold && ": " + item.threshold);
			},
			ref: "threshold",
			type: "number",
			component: "slider",
			defaultValue: 80,
			step: 5,
			min: 5,
			max: 95,
			show: function( item ) {
				return item.action === "selectPareto";
			}
		},
		includeThreshold: {
			label: "Include threshold",
			ref: "includeThreshold",
			type: "boolean",
			component: "switch",
			options: [{
				label: "Include",
				value: true
			}, {
				label: "Exclude",
				value: false
			}],
			defaultValue: true,
			show: function( item ) {
				return item.action === "selectPareto";
			}
		},
		modalTitle: {
			label: "Modal title",
			type: "string",
			expression: "optional",
			ref: "modalTitle",
			defaultValue: "Are you sure?",
			show: function( item ) {
				return item.action === "requestConfirmation";
			}
		},
		modalContent: {
			label: "Modal content",
			type: "string",
			expression: "optional",
			ref: "modalContent",
			defaultValue: "",
			show: function( item ) {
				return item.action === "requestConfirmation";
			}
		},
		modalCancelLabel: {
			label: "Cancel label",
			type: "string",
			expression: "optional",
			ref: "modalCancelLabel",
			defaultValue: translator.get( "Common.Cancel" ),
			show: function( item ) {
				return item.action === "requestConfirmation";
			}
		},
		modalOkLabel: {
			label: "Confirm label",
			type: "string",
			expression: "optional",
			ref: "modalOkLabel",
			defaultValue: translator.get( "Common.OK" ),
			show: function( item ) {
				return item.action === "requestConfirmation";
			}
		},
		enabled: {
			translation: "Common.Enabled",
			ref: "enabled",
			type: "boolean",
			component: "switch",
			options: [{
				translation: "properties.on",
				value: true,
			}, {
				translation: "properties.off",
				value: false
			}],
			defaultValue: true
		}
	},

	/**
	 * Holds the loaded apps
	 *
	 * This is loaded once when calling `qGlobal.getAppList()` to
	 * prevent max listener errors on the related event emitter.
	 *
	 * @type {Array}
	 */
	appList,

	/**
	 * Holds the definition of a `navigation` panel property
	 *
	 * @type {Object}
	 */
	navigationDefinition = {
		enabled: {
			label: "Navigation",
			ref: "navigation.enabled",
			type: "boolean",
			component: "switch",
			defaultValue: false,
			options: [{
				translation: "properties.on",
				value: true,
			}, {
				translation: "properties.off",
				value: false
			}]
		},
		navigation: {
			type: "string",
			component: "dropdown",
			ref: "navigation.action",
			options: function() {
				return optionsDfd.navigation;
			},
			show: function( item ) {
				return item.navigation.enabled;
			}
		},
		app: {
			label: "App",
			type: "string",
			component: "dropdown",
			ref: "navigation.app",
			options: function() {
				var dfd = $q.defer();

				if ("undefined" === typeof appList) {
					qGlobal.getAppList( function( items ) {
						appList = items.map( function( a ) {
							return {
								label: a.qTitle,
								value: a.qDocId
							};
						});

						dfd.resolve(appList);
					});
				} else {
					dfd.resolve(appList);
				}

				return dfd.promise;
			},
			show: function( item ) {
				return item.navigation.enabled && showProperty(item, "showApp");
			}
		},
		sheet: {
			label: "Sheet",
			type: "string",
			component: "dropdown",
			ref: "navigation.sheet",
			/**
			 * Generate options for the dropdown
			 *
			 * @param  {Object} item The item's layout
			 * @return {Promise} Array of sheets
			 */
			options: function( item ) {
				var dfd = $q.defer(),
				    contextApp,
				    listId;

				// When navigating app sheets, determine the app context
				if (item.navigation && "goToAppSheet" === item.navigation.action && !! item.navigation.app) {

					// Only if this is not the current app
					if (! isCurrentApp(item.navigation.app)) {
						contextApp = qlik.openApp(item.navigation.app, { openWithoutData: true });
					}
				}

				// Default to the current app
				if (! contextApp) {
					contextApp = app;
				}

				// Call app's object list, get the sheets
				contextApp.getList("sheet", function( list ) {

					// Remove updates for this session object before going forward
					contextApp.destroySessionObject(list.qInfo.qId).then( function() {

						// Close external app
						if (contextApp !== app) {
							contextApp.close();
						}

						// Return the ordered list of sheets
						dfd.resolve(list.qAppObjectList.qItems.sort(sortByRank).map( function( a ) {
							return {
								label: a.qMeta.title,
								value: a.qInfo.qId
							};
						}));
					});
				});

				return dfd.promise;
			},
			show: function( item ) {
				var a = showProperty(item, "showSheet");

				if ("goToAppSheet" === item.navigation.action) {
					a = a && !! item.navigation.app;
				}

				return item.navigation.enabled && a;
			}
		},
		value: {
			translation: "ExpressionEditor.Value",
			type: "string",
			expression: "optional",
			ref: "navigation.value",
			show: function( item ) {
				return item.navigation.enabled && showProperty(item, "showValue");
			}
		},
		newTab: {
			translation: "properties.kpi.openUrlInNewTab",
			ref: "navigation.newTab",
			type: "boolean",
			defaultValue: true,
			show: function( item ) {
				return item.navigation.enabled && -1 !== ["goToAppSheet", "goToURI"].indexOf(item.navigation.action);
			}
		},
		story: {
			label: "Story",
			ref: "navigation.story",
			type: "string",
			component: "dropdown",
			options: function() {
				var dfd = $q.defer();

				app.getList("story", function( items ) {
					dfd.resolve(items.qAppObjectList.qItems.sort(sortByRank).map( function( a ) {
						return {
							label: a.qData.title,
							value: a.qInfo.qId
						};
					}));
				});

				return dfd.promise;
			},
			show: function( item ) {
				return showProperty(item, "showStory");
			}
		}
	},

	/**
	 * Holds the options filter initiator
	 *
	 * @type {Object}
	 */
	optionsFilter = function() {

		/**
		 * Holds the options filter context parameters
		 *
		 * @type {Object}
		 */
		var context = {},

		/**
		 * Filter whether the option should be available
		 *
		 * @param {Object} option Option details
		 * @return {Boolean} Keep the option?
		 */
		filter = function( option ) {
			var keep = true;

			// Remove items based on environment
			if (option.hasOwnProperty("ifDesktop")) {
				keep = context.isPersonalMode === option.ifDesktop;

			// Remove item based on environment
			} else if (option.hasOwnProperty("ifServer")) {
				keep = context.isPersonalMode === (! option.ifServer);
			}

			return keep;
		},

		/**
		 * Holds the Deferred for filtered `actionsOptions`
		 *
		 * @type {Deferred}
		 */
		actionsDfd = $q.defer(),

		/**
		 * Holds the Deferred for filtered `navigationOptions`
		 *
		 * @type {Deferred}
		 */
		navigationDfd = $q.defer();

		// Load context parameters
		app.global.isPersonalMode().then( function( resp ) {
			context.isPersonalMode = resp.qReturn;

		// Resolve modified option lists
		}).then( function() {

			// Filter action options
			actionsDfd.resolve(actionOptions.filter(filter));

			// Filter navigation options
			navigationDfd.resolve(navigationOptions.filter(filter));
		});

		return {
			actions: actionsDfd.promise,
			navigation: navigationDfd.promise
		};
	},

	// Start filtering options on load
	optionsDfd = optionsFilter(),

	/**
	 * Run logic for mounting actions
	 *
	 * @return {Void}
	 */
	mount = function() {
		// console.log("mounting actions");
	},

	/**
	 * Run logic for destroying actions
	 *
	 * @return {Void}
	 */
	destroy = function() {
		// console.log("destroying actions");
	};

	return {
		actionsDefinition: actionsDefinition,
		actionItemTitleRef: actionItemTitleRef,
		navigationDefinition: navigationDefinition,
		doOne: doOne,
		doMany: doMany,
		doNavigation: doNavigation,
		mount: mount,
		destroy: destroy
	};
});
