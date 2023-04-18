/**
 * E-mergo QS Extension documentation script
 *
 * @version 20230418
 * @author Laurens Offereins <https://www.github.com/lmoffereins>
 */
(function( window, $, _, factory ) {

	// When dependencies are not globally defined
	if ("function" !== typeof $ || "function" !== typeof window.markdownit) {

		// When using modules
		if ("function" === typeof define && define.amd) {
			define(["./lib/markdown-it", "jquery", "underscore", "qvangular", "translator", "../util/util", "text!./docs.css", "text!./modal.html"], factory);
		} else {
			alert("Sorry! Could not locate Qlik Sense libraries necessary for generating this documentation page.");
		}

	// When used directly and libraries are found
	} else {
		var docs = factory(window.markdownit, $, _),
		    $doc = $("#qs-emergo-extension-documentation");

		// Use content from the `README.md` root file
		$.get("../README.md").then( function( readme ) {
			docs.setupDoc($doc, readme);
		}).catch( function() {

			// Tag body with error class
			$doc.addClass("error-file-not-found");

			// Setup content with error mention
			docs.setupDocContent($doc, "## Oops, something went wrong\nThe file containing the extension's documentation named `README.md` could not be loaded.\n\nPlease try to open the extension's documentation once with a RootAdmin account or else either visit the [README file](./../README.md) directly or refer to the documentation in the original extension repository or go to [www.e-mergo.nl](https://www.e-mergo.nl/e-mergo-tools-bundle/?utm_medium=download&utm_source=tools_bundle&utm_campaign=E-mergo_Extension&utm_term=toolsbundle&utm_content=sitelink) for more information.");
		});
	}
}(this, jQuery, _, (function( markdownit, $, _, qvangular, translator, util, css, modalTmpl ) {

	/**
	 * Holds configured Markdown-it instance
	 *
	 * @type {Object}
	 */
	var MD = markdownit({
		html: true,
		linkify: true,
		typographer: true
	}),

	/**
	 * Add global link element to the page
	 *
	 * @param  {String} name  Link name
	 * @param  {Object} attrs Element attributes {@link https://api.jquery.com/attr/#attr-attributes}
	 * @return {Function} Deregister method
	 */
	registerLink = function( name, attrs ) {
		var id = name.concat("-link"),
		    $link = $("#".concat(id));

		attrs = attrs || {};

		// Replace style when it already exists
		if ($link.length) {
			$link.attr(attrs);

		// Add style
		} else {
			$("<style>").attr("id", id).attr(attrs).appendTo("head");
		}

		return function() {
			$("#".concat(id)).remove();
		};
	},

	/**
	 * Add global styles to the page, replacing when it already exists
	 *
	 * @param  {String} name Style name/identifier
	 * @param  {String} css  Style content
	 * @return {Function} Deregister method
	 */
	registerStyle = function( name, css ) {
		var id = name.concat("-style"),
		    $style = $("#".concat(id));

		// Replace style when it already exists
		if ($style.length) {
			$style.html(css);

		// Add style
		} else {
			$("<style>").attr("id", id).html(css).appendTo("head");
		}

		return function() {
			$("#".concat(id)).remove();
		};
	},

	/**
	 * Dissect the metadata from the markdown content
	 *
	 * @param  {String}  md             Markdown content
	 * @param  {Boolean} returnMetadata Optional. Whether to return the metadata instead of the stripped content. Defaults to false.
	 * @return {String}                 Stripped content
	 */
	stripMarkdownMetadata = function( md, returnMetadata ) {
		var metadata = "", strippedContent = md;

		// Metadata starts at the first line with `---\r\n`
		if (0 === md.indexOf("---\r\n")) {
			var stripPosition = md.substring(3).indexOf("---") + 5;

			// Define stripped parts
			metadata = md.substring(5, stripPosition - 1);
			strippedContent = md.substring(stripPosition + 4);
		}

		return returnMetadata ? metadata : strippedContent;
	},

	/**
	 * Parse the metadata from the markdown content
	 *
	 * @param  {String} md Markdown content
	 * @return {Object}    Metadata
	 */
	parseMarkdownMetadata = function( md ) {
		var obj = {}, i, metadata = stripMarkdownMetadata(md, true);

		// Iterate metadata lines
		(metadata ? metadata.split("\r\n") : []).forEach( function( value, index ) {
			i = value.indexOf(":");
			if (-1 !== i) {
				obj[value.substring(0, i).toLowerCase()] = value.substring(i + 2);
			}
		});

		return obj;
	},

	/**
	 * Return the extension's home url
	 *
	 * @param  {String} md Markdown content
	 * @return {String}    Extension home url
	 */
	getExtensionHomeUrl = function( md ) {
		var url = "", proxy, metadata = parseMarkdownMetadata(md);

		if (metadata.qext) {
			proxy = 0 === window.location.pathname.indexOf("/extensions/")
				? window.location.pathname.split("/extensions/")[0]
				: window.location.pathname.split("/sense/")[0];

			url = "".concat(window.location.protocol, "//", window.location.host, proxy, "/extensions/", metadata.qext.split(".")[0]);
		}

		return url;
	},

	/**
	 * Get the headings from the markdown content
	 *
	 * @param  {String} md Markdown content
	 * @return {Array}     Headings
	 */
	getMarkdownHeadings = function( md ) {
		var headings = [],
		    headingRegex = /\n(#+\s*)(.*)/g,
		    headingLevelRegex = /\n(#+\s*)/g,
		    matches = md.match(headingRegex);

		// Headings were found
		if (matches && matches.length) {
			headings = matches.map( function( heading ) {
				return {
					heading: heading,
					level: heading.match(headingLevelRegex)[0].length - 2,
					text: heading.replace(headingLevelRegex, "")
				};

			// Remove h1 headings
			}).filter( function( heading ) {
				return 1 !== heading.level;
			});
		}

		return headings;
	},

	/**
	 * Insert heading anchors in the markdown content
	 *
	 * @param  {String} md Markdown content
	 * @return {String}    Parsed content
	 */
	insertMarkdownHeadingAnchors = function( md ) {
		var headingLevelRegex = /\n(#+)\s*/g,
		    replacer = function( index ) {
		    	return function( match ) {
					return match.replace(headingLevelRegex, function( heading ) {
						return "".concat(heading, " <a name=\"heading-", index + 1, "\"></a>");
					});
		    	};
		    };

		// Headings were found
		getMarkdownHeadings(md).forEach( function( heading, index ) {
			md = md.replace(heading.heading, replacer(index));
		});

		return md;
	},

	/**
	 * Return the details of the document
	 *
	 * @param  {Object} props Details
	 * @param  {String} md    Optional. Markdown content
	 * @return {Array}        Document details
	 */
	getDocDetails = function( props, md ) {
		var details = [];

		props = props || {};

		// Page subtitle
		if (props.description) {
			details.push({
				className: "subtitle",
				html: props.description
			});
		}

		// Page version
		if (props.version) {
			details.push({
				className: "version",
				html: "Version: ".concat(props.version)
			});
		}

		// Page license
		if (props.license) {
			var url = md ? getExtensionHomeUrl(md) : "..";

			details.push({
				className: "license",
				html: "License: <a target=\"_blank\" href=\"".concat(url, "/LICENSE.txt\">", props.license, "</a>")
			});
		}

		// Bundle context
		if (props.bundle) {
			details.push({
				className: "context",
				title: props.bundle.description,
				html: "Part of the ".concat(props.bundle.url ? "<a target=\"_blank\" href=\"".concat(props.bundle.url, "\">", props.bundle.name, "</a>") : props.bundle.name)
			});
		}

		return details;
	},

	/**
	 * Define the details on the document
	 *
	 * @param  {Object} $doc  Document element
	 * @param  {Object} props Details
	 * @param  {String} md    Optional. Markdown content
	 * @return {Void}
	 */
	setupDocDetails = function( $doc, props, md ) {
		var $header = $doc.find("#header");

		props = props || {};
		props.title = props.title || props.name;

		// Extension title
		if (props.title) {
			$header.find("#extension-title").text(props.title);

			// Specify document title
			$("title").prepend(props.title.concat(" - "));
		}

		// Insert details
		getDocDetails(props, md).forEach( function( detail ) {
			$header.find("hgroup").append(
				$("<span></span>").addClass(detail.className).attr("title", detail.title).html(detail.html)
			);
		});
	},

	/**
	 * Return the rendered documentation content
	 *
	 * @param  {String} md Markdown content
	 * @return {String}    HTML content
	 */
	prepareContent = function( md ) {

		// Strip h1 headings
		md = md.replace(/(\n# \s*.*)/g, "");

		// Add heading anchors
		md = insertMarkdownHeadingAnchors(md);

		return MD.render(md);
	},

	/**
	 * Define the main content of the document
	 *
	 * @param  {Object} $doc Document element
	 * @param  {String} md   Markdown content
	 * @return {Void}
	 */
	setupDocContent = function( $doc, md ) {

		// Render and add the content
		$doc.find("#content").append(prepareContent(md));
	},

	/**
	 * Define the table of contents based on the markdown content
	 *
	 * @param  {Object} $doc Document element
	 * @param  {String} md   Markdown content
	 * @return {Void}
	 */
	setupDocToc = function( $doc, md ) {
		var toc = getMarkdownHeadings(md);

		// Headings were found
		if (toc.length) {

			// Add toc elements in the list, with anchors
			$doc.find("#navigation ul").append(toc.map( function( heading, index ) {
				return $("<li></li>").addClass("level-".concat(heading.level)).append(
					$("<a></a>").attr({
						href: "#heading-".concat(index + 1),
						title: "Navigate to `".concat(heading.text, "`")
					}).text(heading.text)
				);
			}));
		}
	},

	/**
	 * Setup the document based on the readme text
	 *
	 * @param  {Object} $doc Document element
	 * @param  {String} md   Markdown content
	 * @param  {Object} qext Optional. Extension QEXT data
	 * @return {Void}
	 */
	setupDoc = function( $doc, md, qext ) {
		var content = stripMarkdownMetadata(md), metadata;

		// QEXT-based metadata
		if (qext) {
			setupDocDetails($doc, qext, md);

		// Find metadata in readme
		} else {
			metadata = parseMarkdownMetadata(md);

			// Readme contains metadata
			if (metadata.qext) {
				$.get("../".concat(metadata.qext)).then( function( qext ) {
					setupDocDetails($doc, qext, md);
				}).catch( function() {
					setupDocDetails($doc, metadata, md);
				});
			} else {
				setupDocDetails($doc, metadata, md);
			}
		}

		// Setup content
		setupDocContent($doc, content);

		// Setup navigation
		setupDocToc($doc, content);

		// Tag body with success class
		$doc.addClass("readme-loaded");
	},

	/**
	 * Holds the modal for the extension documentation
	 *
	 * @type {Object}
	 */
	modal,

	/**
	 * Setup the documentation modal based on the readme text
	 *
	 * @param  {String} md   Documentation content
	 * @param  {Object} qext Extension QEXT data
	 * @return {Void}
	 */
	showModal = function( md, qext ) {
		var modalId = "qs-emergo-extension-documentation";

		// Bail when the modal is already in use
		if (modal) {
			return;
		}

		// Add global styles to the page
		registerLink(modalId, {
			rel: "stylesheet",
			href: "https://fonts.googleapis.com/css2?family=Dosis:wght@300;400;500;700&display=swap"
		});
		registerStyle(modalId, css);

		// Parse readme
		var content = stripMarkdownMetadata(md);

		// Open the modal
		modal = qvangular.getService("luiDialog").show({
			template: modalTmpl,
			controller: ["$scope", function( $scope ) {

				/**
				 * Scroll to heading
				 *
				 * Ignore ìnserted `<a></a>` heading anchors because their
				 * `name` attributes are stripped by Angular on inserting
				 * raw HTML. Rather than applying unsafe HTML practices like
				 * using `$sce.trustAsHtml()`, a different method for finding
				 * headings is used.
				 *
				 * @param  {Number} num Heading number
				 * @return {Void}
				 */
				$scope.scrollTo = function( num ) {
					var $el = $("#".concat(modalId)).find("h2,h3,h4,h5,h6").eq(num - 1);
					$el.length && $el[0].scrollIntoView();
				};

				/**
				 * Provide modal close method to the template
				 *
				 * @return {Void}
				 */
				$scope.close = function() {
					modal.close();
				};
			}],
			input: {
				title: "Extension documentation for ".concat(qext.name),
				extensionTitle: qext.title || qext.name,
				content: prepareContent(content),
				docDetails: getDocDetails(qext, md),
				toc: getMarkdownHeadings(content),
				homeUrl: getExtensionHomeUrl(md)
			},
			closeOnEscape: true
		});

		// Register events when opening the modal
		modal.opened.then( function() {

			// Insert copy-code button for each <pre> block
			// By default Qlik's interface is blocked from selecting and copying text.
			$("#".concat(modalId, " pre")).each( function( ix, pre ) {
				var $pre = $(pre).prepend( $("<button type='button'>".concat(translator.get("Common.Copy"), "</button>")).on("click", function() {
					util.copyToClipboard($pre.find("code")[0].innerHTML);
				}) );
			});
		});

		// Reset modal when closing the modal
		modal.closed.then( function() {
			modal = null;
		});
	},

	// Remember default `code_block` renderer, if overridden, or proxy to default renderer
	defaultCodeBlockRenderer = MD.renderer.rules.code_block || function( tokens, idx, options, env, self ) {
		return self.renderToken(tokens, idx, options);
	},

	// Remember default `link_open` renderer, if overridden, or proxy to default renderer
	defaultLinkOpenRenderer = MD.renderer.rules.link_open || function( tokens, idx, options, env, self ) {
		return self.renderToken(tokens, idx, options);
	};

	// Overwrite `code_block` renderer to wrap code in a div
	MD.renderer.rules.code_block = function( tokens, idx, options, env, self ) {

		// Pass token to default renderer, then insert div wrapper
		return defaultCodeBlockRenderer(tokens, idx, options, env, self).replace("<code>", "<div><code>").replace("</code>", "</code></div>");
	};

	// Overwrite `link_open` renderer to have links always open in a new tab
	MD.renderer.rules.link_open = function( tokens, idx, options, env, self ) {

		// Set target '_blank' attribute
		tokens[idx].attrPush(['target', '_blank']);

		// Pass token to default renderer
		return defaultLinkOpenRenderer(tokens, idx, options, env, self);
	};

	return {
		stripMarkdownMetadata: stripMarkdownMetadata,
		parseMarkdownMetadata: parseMarkdownMetadata,
		getExtensionHomeUrl: getExtensionHomeUrl,
		getMarkdownHeadings: getMarkdownHeadings,
		insertMarkdownHeadingAnchors: insertMarkdownHeadingAnchors,
		getDocDetails: getDocDetails,
		setupDocDetails: setupDocDetails,
		setupDocContent: setupDocContent,
		setupDocToc: setupDocToc,
		setupDoc: setupDoc,
		showModal: showModal
	};
})));
