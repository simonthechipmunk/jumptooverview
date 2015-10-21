/*
 * Preferences for the extension which will be available in the 
 * "gnome-shell-extension-prefs" tool.
 *
 *
 * see: https://live.gnome.org/GnomeShell/Extensions#Extension_Preferences
 *
 */

//***// imports:

// main
const Gio  = imports.gi.Gio;
const Gtk  = imports.gi.Gtk;
const Lang = imports.lang;

// translations
const Gettext = imports.gettext.domain('jumptooverview');
const _ = Gettext.gettext;

// own imports
const Me   = imports.misc.extensionUtils.getCurrentExtension();
const Utils = Me.imports.utils; 




// define global variables
let settings = {};





//***// basic preferences functions

function init() {

	// init translations
	Utils._initTranslations();

	// load the settings schema
    	settings = Utils._getSettingsSchema();

	// create custom command bindings for gsettings "bool" and "string"
    	let set_boolean = Lang.bind(settings, settings.set_boolean);
    	let set_string = Lang.bind(settings, settings.set_string);

    	settings.set_boolean = function(key, value) {
        	set_boolean(key, value);
        	Gio.Settings.sync();
    	};

    	settings.set_string = function(key, value) {
        	set_string(key, value);
        	Gio.Settings.sync();
    	};

}



function buildPrefsWidget() {
// build the Gtk preferences widget
	let frame = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL, border_width: 10, margin: 10});

	// add items to the widget frame
	frame.add( _createSwitchbox( _("Show Overview when the current Workspace turns empty"), 
		_("Opens the Overview when the last Window on the current Workspace is closed"), _getOnCurrent, _setOnCurrent ));
	frame.add( _createComboBox( _("		→  Landing Page"), _("Select the Landing Page for closing the last Window on the current Workspace"),
			{'overview': _("Overview"), 'applications' : _("All Applications"), 'frequent' : _("Frequent Apps")}, _getLandingStandard, _setLandingStandard ));
	frame.add( _createSeparator() );

	if (_getDynamicWorkspaceSetting() ) {
		// only available if Workspaces are managed dynamically
		frame.add( _createSwitchbox( _("Show Overview when the last Workspace turns empty"), 
			_("Opens the Overview even if the current Workspace is the last active one"), _getOnLastWS, _setOnLastWS ));
		frame.add( _createComboBox( _("		→  Landing Page"), _("Select the Landing Page for closing the last Window on the last remaining Workspace"),
				{'overview': _("Overview"), 'applications' : _("All Applications"), 'frequent' : _("Frequent Apps")}, _getLandingOnLastWS, _setLandingOnLastWS ));
		frame.add( _createSeparator() );

	}


	frame.add( _createSwitchbox( _("Show Overview after Shell startup"), 
		_("Opens the Overview whenever Gnome-Shell is started on an empty desktop"), _getOnStartup, _setOnStartup ));
	frame.add( _createComboBox( _("		→  Landing Page"), _("Select the Landing Page for Shell Startup"),
			{'overview': _("Overview"), 'applications' : _("All Applications"), 'frequent' : _("Frequent Apps")}, _getLandingStartup, _setLandingStartup ));
	frame.add( _createSeparator() );





	frame.add(new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin: 20}) )


	frame.add( _createSwitchbox( _("Ignore minimized Windows"), 
		_("Opens the Overview even if there are minimized windows on the current Workspace"), _getIgnoreMinimized, _setIgnoreMinimized ));



	frame.show_all();
	return frame;
}






//***// preferences functions

function _createSwitchbox(text, tooltip, getFunction, setFunction) {
// create box with toggle switch
	let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin: 5});
	let label = new Gtk.Label({ label: text, xalign: 0, tooltip_text: tooltip });
	let toggleswitch = new Gtk.Switch({ active: getFunction() });

	// connect to "toggled" emit signal
	toggleswitch.connect('notify::active', setFunction);

	//fill the box with content
	box.pack_start(label, true, true, 0);
	box.add(toggleswitch);

	return box;
}



function _createComboBox(text, tooltip, values, getFunction, setFunction) {
// create box with combo selection field
	let box = new Gtk.Box({ orientation: Gtk.Orientation.HORIZONTAL, margin: 5});
	let label = new Gtk.Label({ label: text, xalign: 0, tooltip_text: tooltip });
	let widget = new Gtk.ComboBoxText();
	for (id in values) {
		widget.append(id, values[id]);
	}
	widget.set_active_id(getFunction());

	// connect to "changed" emit signal
	widget.connect('changed', function(combo_widget) {
		setFunction(combo_widget.get_active_id());
	});
	//fill the box with content
	box.pack_start(label, true, true, 0);
	box.add(widget);
	return box;
}



function _createSeparator() {
// create box with separator line
	let box = new Gtk.Separator ({ visible: true, can_focus: false, margin_top: 10, margin_bottom: 10 });
	return box;

}







function _getDynamicWorkspaceSetting() {
// get settings key for dynamic workspace management
	let workspaceSettingsSchema = new Gio.Settings({ schema: 'org.gnome.shell.overrides' });
	return workspaceSettingsSchema.get_boolean('dynamic-workspaces');

}







// functions to get/set gsettings entries
function _getOnLastWS() {
	return settings.get_boolean('onlastworkspace');
}

function _setOnLastWS() {
    settings.set_boolean('onlastworkspace', !_getOnLastWS());
}


function _getIgnoreMinimized() {
	return settings.get_boolean('ignoreminimized');
}

function _setIgnoreMinimized() {
    settings.set_boolean('ignoreminimized', !_getIgnoreMinimized());
}


function _getOnStartup() {
	return settings.get_boolean('onstartup');
}

function _setOnStartup() {
    settings.set_boolean('onstartup', !_getOnStartup());
}

function _getOnCurrent() {
	return settings.get_boolean('oncurrentworkspace');
}

function _setOnCurrent() {
    settings.set_boolean('oncurrentworkspace', !_getOnCurrent());
}



function _getLandingStartup() {
	return settings.get_string('landingstartup');
}

function _setLandingStartup(command) {
	settings.set_string('landingstartup', command);
}

function _getLandingOnLastWS() {
	return settings.get_string('landinglastworkspace');
}

function _setLandingOnLastWS(command) {
	settings.set_string('landinglastworkspace', command);
}

function _getLandingStandard() {
	return settings.get_string('landingstandard');
}

function _setLandingStandard(command) {
	settings.set_string('landingstandard', command);
}
