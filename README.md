---
Qlik Sense Visualization Extension
Name: E-mergo Buttons
Version: 1.3.20200918
QEXT: qs-emergo-buttons.qext
---

# E-mergo Buttons

**E-mergo Buttons** is a Qlik Sense visualization extension developed by [E-mergo](https://www.e-mergo.nl). This extension enables the dashboard designer to insert customizable buttons with a variety of actions to trigger. Unlike Qlik's own visualizations, with this extension you can create multiple buttons in a single visualization object, using various layout options. Other added features are custom button colors, conditional show, multiple actions, and some new actions as well.

This extension is part of the [E-mergo Tools bundle](https://www.e-mergo.nl/e-mergo-tools-bundle/?utm_medium=download&utm_source=tools_bundle&utm_campaign=E-mergo_Extension&utm_term=toolsbundle&utm_content=sitelink).

This extension is [hosted on GitHub](https://github.com/e-mergo/qs-emergo-buttons). You can report bugs and discuss features on the [issues page](https://github.com/e-mergo/qs-emergo-buttons/issues).

## Why is this extension needed?
As per version November 2018, Qlik Sense ships with the *Qlik Dashboard bundle* for 'advanced authoring'. The bundle contains the *Button for navigation* and *Variable input* extensions, both forks of their respective open-source community productions. These extensions however have their limits:
- Display a single button per visualization (does not apply for *Variable input*)
- Use a limited set of actions per button
- No option of conditional enabling/disabling

Untill the integration of the *Button* visualisation in the core set of Qlik's visualisations, the following issues were present as well:
- Limited coloring options
- Limited conditional showing/hiding

This extension provides an alternative to these limited visualizations by offering the following features:
- Displaying unlimited buttons per visualization, both static and dynamically created
- Using unlimited actions per button
- Custom coloring options, using the color picker or an expression
- Conditional showing/hiding per button
- Conditional enabling/disabling per button

On top of that, this extension comes with an additional set of actions which enhance the possibilities of user interaction within Qlik Sense.

## Disclaimer
This extension is created free of charge for Qlik Sense app developers, personal or professional. E-mergo developers aim to maintain the functionality of this extension with each new release of Qlik Sense. However, this product does not ship with any warranty of support. If you require any updates to the extension or would like to request additional features, please inquire for E-mergo's commercial plans for supporting your extension needs at support@e-mergo.nl.

On server installations that do not already have it registered, the Markdown file mime type will be registered when opening the documentation page. This is required for Qlik Sense to be able to successfully return `.md` files when those are requested from the Qlik Sense web server. Note that registering the file mime type is only required once and is usually only allowed for accounts with RootAdmin level permissions.

## Features
Below is a detailed description of the available features of this extension.

### Buttons
There are two ways of adding buttons to a visualization of this extension.
1. Create a fixed set of buttons. Do this by adding buttons one by one through the *Add Button* button.
2. Create a dynamic set of buttons. Do this by switching to *Dynamic* mode and entering an expression that returns a text, seperating buttons with the `|`-character.

#### Dynamic buttons
Dynamic mode offers also a way of working with dynamic per-button characteristics. By default, the result of the dynamic expression is interpreted as button labels by separating buttons on the `|`-character. In addition, additional parameters can be provided with the `~`-seperator. These parameters can then be used in the dynamic button definition by using as `$1` through `$n`, for as many parameters as are defined. With dynamic parameters you can dynamically determine details like the button's color values, action parameters (for example the *Select Field Value*'s field and value parts) or navigation values (for example the *Navigate to URI* value part). Note that these values are only parsed after Qlik's engine has processed all expressions.

The dynamic nature of the buttons is **only** based in the main expression. Besides using the `$`-parameter references, expressions for details in other fields *cannot* be interpreted for each particular button. Instead, the expressions will result in values equal for the entire button set.

##### Example 1
    Button 1|Button 2|Button 3

The above expression generates three buttons. As no `~` was found separating button parameters, only the `$1` parameter is available. Use this parameter for the *Label* setting.

##### Example 2
    =Concat({1} Distinct

        // First parameter $1: button label
        Alpha &

        // Parameter separator
        '~' &

        // Second parameter $2: color expression
        If ( SubStringCount(GetFieldSelections(Alpha, ',', 26), Alpha),
            '#1abe32', // Color for selected values
            If ( NOT SubStringCount('$(=Concat({<Alpha>} distinct Alpha, ','))', Alpha),
                '#a9a9a9' // Color for excluded values
            )
        )
    , '|')

The above expression generates as many buttons as there are distinct values in the field `Alpha`. The resulting text for example could look like the following, generating five buttons:

    A~#ddd|B~#1abe32|C~|D~|E~#a9a9a9

As the `~` separates button parameters, two parameters are found: `$1` containing the content of `Alpha`, while `$2` contains the conditionally calculated color code. Following the example, this would be A, B, C, D, E for the first parameter, and the second parameter contains a color code for the first, second and fifth button (A, B, E). The color code is based on whether the concatenated value is either selected, by checking whether it exists in the field's active selections, is excluded, by checking whether it does not exist in the field's possible values, is an alternative value, by checking whether there are any selections in the field, or it is a possible value. For all possible values the no-value is chosen for color, leaving the button white with a visible border.

Use the first parameter in the *Label* and the *Select Field Value* action's settings to enable field selection per button. Use the second parameter in the *Color expression* setting:

- Label: $1
- Action field selection: $1
- Color expression: $2

To furthur dissect the expression:
- `Concat([...] Distinct Alpha [...], '|')` creates the base set of distinct values in the `Alpha` field, concatenated by the `|`-character.
- `{1}` is the aggregation's set definition to make sure all values are present in the aggregation, regardless of active selections on any field.
- `If ( [...], '#1abe32', [...], '#a9a9a9', [...], '#ddd', '' )` is the conditional statements which defines the second button parameter based on the outcome of the condition: either a color or an empty value. The selected color values match Qlik Sense's native color scheme for field selections.
- `SubStringCount(GetFieldSelections(Alpha, ',', 26), Alpha)` checks whether the iterated value of `Alpha` is selected. More specifically, it checks whether the iterated value of `Alpha` is a substring of the set of  active selections on the field `Alpha`, which can at most contain 26 distinct selected values.
- `NOT SubStringCount('$(=Concat({<Alpha>} distinct Alpha, ','))', Alpha)` checks whether the iterated value of `Alpha` is present in the current available set of values in `Alpha`. This is executed in a dollar-expanded expression because nested aggregations are not accepted. The `NOT` prefix inverses the result of the expression, which means it checks if the value is *not* an available value and therefor excluded.

##### Safety limit
When the returned set of buttons from the expression is too large, the extension's logic may overload the browser's memory. To prevent this, a built-in safety limit of 100 buttons is enabled. If you know what you are doing, you can disable this limit. A way to prevent too many buttons is to make sure to return only unique field values in the expression by using `Distinct`.

### Label (Icons)
Button labels are parsed for icons that match existing ones in Qlik's own icon set. An icon is matched on the following definition: `#icon-name#`. The icon name is the part of an icon's class name without the `lui-icon--` prefix. The available icons are listed in the provided <a href="../lib/icons-lui.json" target="_blank">JSON file</a> or view the (older) icon set at <a href="https://qlik-oss.github.io/leonardo-ui/icons.html" target="_blank">qlik-oss.github.io</a>.

### Description
Button descriptions are applied as the button's `title` HTML atribute. It is shown when hovering the button.

### Show button if
Works like conditional show in the Table and Pivot Table visualizations. Using the expression field for conditional show, the button can be shown depending on a measure's value, a variable's value or any other comparison. Return a non-empty falsey value (usually zero) to hide the button, otherwise the button is shown.

### Enable button if
Like `Show button if`, this setting provides a way to dynamically enable/disable the button. Using the expression field for conditional enabling, the button can be disabled depending on a measure's value, a variable's value or any other comparison. Return a non-empty falsey value (usually zero) to disable the button, otherwise the button is enabled.

### Color
Setting the button's color can be done in three ways:
1. Pick from a list of preset values, based on the Leonardo UI preset classes.
2. Picking a color from the color palette or the color wheel.
3. Returning a color definition from an expression.

### Actions
Interacting with a button may trigger one or multiple sequenced actions. The list of actions contains all the current ones present in the extensions provided with the *Qlik Dashboard bundle* shipped with Qlik Sense, and some new ones as well. Note that reordering of actions is not possible due to nested ordering issues of the property panel.

**IMPORTANT**: When providing values in an expression, be aware that the setting will first be evaluated before it is used by the extension. So when providing plain values, either make sure to define them *without* the leading `=` or otherwise as explicit text by surrounding the value with single quotes. This does apply to settings for **field names** as well.

The following actions are available:
- **Apply Bookmark** You can pick from a list of available bookmarks in the current app.
- **Select Field Value** You can define both the field and the value as a result from an expression. Also, either decide to replace current selections, or add/subtract the selected value in *Toggle* mode. Separate multiple values with a `;`.
- **Clear Field Selection** When not defining the field, all fields will be cleared.
- **Back or Forward**
- **Lock or Unlock Field** When not defining the field, all fields will be (un)locked.
- **Select All Values**
- **Select Possible Values**
- **Select Alternative Values**
- **Select Excluded Values**
- **Set Variable Value** You can pick from a list of available variables in the current app.

Additional actions are:

#### Select Adjacent Values
This action selects the given field's value that is adjacent to the current selection on that field. Without current selections, the first (next) or last (previous) value is selected. When no sorting expression is provided, the default sorting is applied, which usually is ascending alphabetical or numeric. This functionality allows for skipping through a field's values, without explicitly looking up those values in a filter box or otherwise.

#### Select Pareto Values
This action selects the given field's values that make up the defined pareto set for the given measure expression. You can decide whether or not to include the threshold value of the pareto set. This functionality is native to QlikView, but is not yet implemented in Qlik Sense.
- **Field** The dimension field on which to apply the pareto selection.
- **Value** The measure definition for which to determine the pareto set. Like all action expressions, the setting will first be evaluated before use in the extension. So when providing plain values, make sure to define them *without* a leading `=` or as explicit text surrounded by single quotes.
- **Threshold** The size of the pareto set in percentages. The size represents the set of dimension field values that make up the given percentage of the total value of the measure expression. These are the values that will be selected.
- **Include threshold** Whether the last field that is associated with the pareto set should be selected or not, as it may add to a larger percentage set than the defined threshold value.

#### Start Reload
This action starts a reload of the current app. The reload is started instantly. The reload can be cancelled by clicking the 'Abort' button. Once the reload is executed successfully, the app will be saved with the newly loaded data.
- **Complete/Partial** When selecting *Partial*, a partial reload will be performed.
- **Close on success** When selected, the reload feedback will be closed instantly on reload success. This enables chaining multiple actions after reloading the app.

#### Start Reload Task
This action starts the specified reload task from the QMC. When the task is already running, a message will show telling the user. You can pick from a list of available tasks in the current server environment. This functionality allows for starting reload tasks outside of the QMC.
- **Display progress** When selecting *Enforced*, the user cannot close the modal untill the task execution is done. When selecting *Optional*, the user can close the modal before the task execution is done.
- **Skip task confirmation** When selected, the task will be started instantly.
- **Close on success** When selected, the task feedback will be closed instantly on task success. In combination with *Enforced* progress display and *Skip task confirmation* this enables chaining multiple task executions with actions.

Note that the following requirements apply:
- **Environment** This action is only available in a Qlik Sense server environment, where reload tasks can be created and started.
- **Security Rules** In order for a user to be able to use this action, the user *must have a Professional license* and the proper security rules need to be in place. A message 'Forbidden' will appear if insufficient access is enabled. When the user does not have the RootAdmin role, the user will need to have:
  - *Update access* in the QMC to the app that will be reloaded with the specified reload task: `App_{guid}` or `App_*` for all apps.
  - *Read access* in the QMC to the specified reload task: `ReloadTask_{guid}` or `ReloadTask_*` for all reload tasks.
  - *Read access* in the QMC to `ExecutionResult_*,ExecutionSession_*` in order to keep track of a task's progress (when progress display is *Enforced* or *Optional*).
  - *Read access* in the QMC to `FileReference_*` in order to be able to download the script log file when the task failed.

#### Apply Theme
This action sets the current Qlik Sense visual theme to the specified theme. You can pick from a list of available themes in the current app. This functionality allows for theme-switching for use cases like font-scaling, different color tones, etcetera.

#### Call REST API
This action sends a request to a REST API. As this is a simple implementation of sending an HTTP request, interpretation of the response content is up to the developer. The response content will be parsed into a JSON string and stored in the selected variable. The following parameters of the request are configurable:
- **Location** The URI to send the request to.
- **Method** The HTTP method of the request.
- **Headers** Additional HTTP headers to send with the requst.
- **Body** The optional request body. The provided string will be interpreted as a JSON object.
- **Variable** The variable to store the response content into.

Note that when using this action in Qlik Cloud the requested resource locations need to be allowlisted in the Content Security Policy (CSP) administration section (as `connect-src`). Refer to your tenant's administrator when you have no permission to create new CSP entries.

#### Log to Console
This action logs the result of the provided expression to the browser's console. This functionality is provided for debugging purposes.

#### Request confirmation
This action displays a dialog modal requesting the user for confirmation. When the user selects 'OK' the next action will be started. When the user selects 'Cancel' the action chain will be stopped. Use this action to confirm user intent when buttons are clicked. Alternatively, the action can be used to display an information modal with limited layout options.

### Navigation
After all triggered actions are successfully handled, a navigation action may kick in to move the user to a different location. The following navigation options are available:
- **Navigate to a specified sheet** You can pick from a list of available sheets in the current app.
- **Navigate to the first sheet**
- **Navigate to the previous sheet**
- **Navigate to the next sheet**
- **Navigate to the last sheet**
- **Navigate to a different app** Additionally, you can select a specific sheet from the selected app.
- **Start a Story** You can pick from a list of available stories in the current app.
- **Navigate to a URI**
- **Switch to Edit mode**

### Layout

#### Orientation
When displaying multiple buttons, the orientation determines in which direction the buttons are aligned. You can orient the layout of the buttons in horizontal or vertical fashion.

#### Width
Select how the buttons should be sized. Either apply automatic sizing or have them cover the full width of the provided space within the extension object.

#### Apply Spacing
Select whether the buttons should have spacing around them or not.

#### Position
Select in which corner position the buttons should be positioned. Or center the buttons in the middle of the visualization object.

## FAQ

### Can I get support for this extension?
E-mergo provides paid support through standard support contracts. For other scenarios, you can post your bugs or questions in the extension's GitHub repository.

### Can you add feature X?
Requests for additional features can be posted in the extension's GitHub repository. Depending on your own code samples and the availability of E-mergo developers your request may be considered and included.

## Changelog

#### 1.3.20200918 - QS Sept 2020
- Added the _Request confirmation_ action.
- Removed global disabled state of the button set.

#### 1.2.20200731
- Added the button's _Description_ setting.
- Added the button's _Enable button if_ setting.
- Added detection of invalid field names in actions.
- Fixed selection of stories for _Start Story_ navigation action.
- Fixed enabling/disabling of individual actions.
- Fixed use of translated labels for settings where possible.
- Fixed button layout to better match the appearance of other common Qlik Sense elements.

#### 1.1.20200713
- Added the _Log to Console_ action
- Fixed selection of Dual values for the _Select Adjacent Value_ action.

#### 1.0.20200623
- Updated docs files.

#### 1.0.20200622 - QS June 2020
- Fixed use of deprecated contentApi service.

#### 0.5.20191015
- Added a safety limit setting of 100 buttons when generating the dynamic button set, to prevent unintended browser memory overload.
- Added documentation examples for the Dynamic button mode.
- Added support for Alternate States in selection actions.

#### 0.4.20190910
- Fixed issue where the documentation page would not be available on server installations, due to incorrect mime type registration.

#### 0.3.20190909
- Fixed error when loading the extension in Desktop application, due to a RegExp parsing issue in the application's browser.
- Fixed issue where dynamic parameters in navigation options were not parsed.
- Fixed issue with Toggle option in Select Field Value, due to the API accepting string values only.
- Semi-fixed issue where property panel options are dynamically defined. A fix is expected in QS November 2019.

#### 0.2.20190905
- Added icon parsing in button labels.
- Added action 'Start Reload Task'.
- Fixed the position setting to use a dropdown input.

#### 0.1.20190724
Initial release.
