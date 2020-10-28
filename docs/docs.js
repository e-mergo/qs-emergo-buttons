/**
 * E-mergo QS Extension Documentation script
 *
 * @since 20190802
 * @author Laurens Offereins <https://www.github.com/lmoffereins>
 *
 * @version 20200623
 */
(function( window, $, _ ) {

	// Bail when no libraries were found
	if (! $ || ! window.markdownit) {
		alert("Sorry! Could not locate Qlik Sense libraries necessary for gerenating this documentation page.");
	}

	// Configure Markdown-it
	var MD = window.markdownit({
		html: true,
		linkify: true,
		typographer: true
	});

	// Use content from the `README.md` root file
	$.get("../README.md").then( function( readme ) {
		var content = stripMarkdownMetadata(readme),
		    metadata = parseMarkdownMetadata(readme);

		// Readme contains metadata
		if (_.keys(metadata).length) {

			// File-based metadata reference
			if (metadata.qext) {
				$.get("../" + metadata.qext).then( function( qext ) {
					setupDocDetails(qext);
				}).catch( function() {
					setupDocDetails(metadata);
				});
			} else {
				setupDocDetails(metadata);
			}
		} else {
			setupDocDetails();
		}

		// Setup content
		setupDocContent(content);

		// Setup navigation
		setupDocToc(content);

		// Tag body with success class
		$("body").addClass("readme-loaded");

	}).catch( function() {

		// Tag body with error class
		$("body").addClass("error-file-not-found");

		// Setup content
		setupDocContent("## Oops, something went wrong\nThe file containing the extension's documentation named `README.md` could not be loaded.\n\nPlease try to open the extension's documentation once with a RootAdmin account or choose one of the following:\n\n- Open the [README.md](../README.md) file directly\n - Refer to the original extension repository on GitHub\n- Visit [https://www.e-mergo.nl/e-mergo-tools-bundle](https://www.e-mergo.nl/e-mergo-tools-bundle/?utm_medium=download&utm_source=tools_bundle&utm_campaign=E-mergo_Extension&utm_term=toolsbundle&utm_content=sitelink) for more information");
	});

	/**
	 * Dissect the metadata from the markdown content
	 *
	 * @param  {String}  content        Markdown content
	 * @param  {Boolean} returnMetadata Optional. Whether to return the metadata instead of the stripped content. Defaults to false.
	 * @return {String}                 Stripped content
	 */
	function stripMarkdownMetadata( content, returnMetadata ) {
		var metadata = "", strippedContent = content;

		// Metadata starts at line 1 with `---`
		if (0 === content.indexOf("---")) {
			var stripPosition = content.substring(3).indexOf("---") + 4;

			// Define stripped parts
			metadata = content.substring(4, stripPosition - 1);
			strippedContent = content.substring(stripPosition + 3);
		}

		return returnMetadata ? metadata : strippedContent;
	}

	/**
	 * Parse the metadata from the markdown content
	 *
	 * @param  {String} content Markdown content
	 * @return {Object}         Metadata
	 */
	function parseMarkdownMetadata( content ) {
		var obj = {}, i, metadata = stripMarkdownMetadata(content, true);

		(metadata ? metadata.split("\n") : []).forEach( function( value, index ) {
			i = value.indexOf(":");
			if (-1 !== i) {
				obj[value.substring(0, i).toLowerCase()] = value.substring(i + 2);
			}
		});

		return obj;
	}

	/**
	 * Get the headings from the markdown content
	 *
	 * @param  {String} content Markdown content
	 * @return {Array}          Headings
	 */
	function getMarkdownHeadings( content ) {
		var headings = [],
		    headingRegex = /\n(#+\s*)(.*)/g,
		    headingLevelRegex = /\n(#+\s*)/g,
		    matches = content.match(headingRegex);

		// Headings were found
		if (matches && matches.length) {
			headings = matches.map( function( heading ) {
				return {
					heading: heading,
					level: heading.match(headingLevelRegex)[0].length - 2,
					text: heading.replace(headingLevelRegex, "")
				};
			});
		}

		return headings;
	}

	/**
	 * Insert heading anchors in the markdown content
	 *
	 * @param  {String} content Markdown content
	 * @return {String}         Parsed content
	 */
	function insertMarkdownHeadingAnchors( content ) {
		var headingLevelRegex = /\n(#+)\s*/g,
		    replacer = function( index ) {
		    	return function( match ) {
					return match.replace(headingLevelRegex, function( heading ) {
						return heading + " <a name=\"heading-" + (index+1) + "\"></a>";
					});
		    	};
		    };

		// Headings were found
		getMarkdownHeadings(content).forEach( function( heading, index ) {
			content = content.replace(heading.heading, replacer(index));
		});

		return content;
	}

	/**
	 * Define the details on the document
	 *
	 * @param  {Object} props Details
	 * @return {Void}
	 */
	function setupDocDetails( props ) {
		var $header = $("#header");

		props = props || {};
		props.title = props.title || props.name;

		// Extension title
		if (props.title) {
			$header.find("#extension-title").text(props.title);

			// Specify document title
			$("title").prepend(props.title + " - ");
		}

		// Page subtitle
		if (props.description) {
			$header.find("hgroup").append(
				$("<span></span>").addClass("subtitle").text(props.description)
			);
		}

		// Page version
		if (props.version) {
			$header.find("hgroup").append(
				$("<span></span>").addClass("version").text("Version: " + props.version)
			);
		}

		// Page license
		if (props.license) {
			$header.find("hgroup").append(
				$("<span></span>").addClass("license").text("License: ").append(
					$('<a target="_blank"></a>').text(props.license).attr("href", "../LICENSE.txt")
				)
			);
		}

		// Bundle context
		if (props.bundle) {
			var bundleUrl = props.bundle.url;
			$header.find("hgroup").append(
				$("<span></span>").addClass("context").attr("title", props.bundle.description).text("Part of the ").append(
					bundleUrl ? $('<a target="_blank"></a>').text(props.bundle.name).attr("href", bundleUrl) : props.bundle.name
				)
			);
		}
	}

	/**
	 * Define the main content of the document
	 *
	 * @param  {String} content Markdown content
	 * @return {Void}
	 */
	function setupDocContent( content ) {

		// Strip h1 headings
		content = content.replace(/(\n# \s*.*)/g, "");

		// Add heading anchors
		content = insertMarkdownHeadingAnchors(content);

		$("#content").append(MD.render(content));
	}

	/**
	 * Define the table of contents based on the markdown content
	 *
	 * @param  {String} content Markdown content
	 * @return {Void}
	 */
	function setupDocToc( content ) {
		var toc = getMarkdownHeadings(content);

		// Headings were found
		if (toc.length) {

			// Remove h1 headings
			toc = _.reject(toc, function( heading ) {
				return heading.level === 1;
			});

			// Add toc elements in the list, with anchors
			$("#navigation ul").append(toc.map( function( heading, index ) {
				return $("<li></li>").addClass("level-" + heading.level).append(
					$("<a></a>").attr({
						href: "#heading-" + (index+1),
						title: "Navigate to `" + heading.text + "`"
					}).text(heading.text)
				);
			}));
		}
	}

})( window, jQuery, _ );
