/*
 * extension.js
 * Gnome3 Jump to Overview Extension
 *
 * Opens the Overview or Apps Page on various selectable Events:
 *
 *	> Open the Overview when the last window on the current workspace is closed (Gnome-Shell < 3.10 behaviour)
 *	> Jump to the Overview when Gnome Shell is restarted
 *
 *
 * Author: Simon Junga (simonthechipmunk@gmx.de)
 *
 *
 * This program is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option)
 * any later version.
 *
 */


//***// imports:

// main functionality
const Main = imports.ui.main;
const Mainloop = imports.mainloop;

// utilities for external programs and command line
const Config = imports.misc.config;
const ShellVersion = Config.PACKAGE_VERSION.split('.');
const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;

// application display
const Appdisplay = imports.ui.appDisplay;

// own imports
const Me = imports.misc.extensionUtils.getCurrentExtension();
const Prefs = Me.imports.prefs;
const Utils = Me.imports.utils;



// define global variables
let workspaceChanged, currentWorkspace, windowRemoved;
let eventStartup=null;




//***// basic extension functions

function init() {
 	// initialize preferences
	Prefs.init();

}




function enable() {
        // connect to 'workspace-switched' signal
        workspaceChanged = global.screen.connect('workspace-switched', _checkWorkspace);

	// execute _checkWorkspace at extension start
	_checkWorkspace();


	// open the Overview on Shell startup if set in the preferences
	if(Prefs._getOnStartup() && global.display.focus_window == null) {

		_checkStartup();
	
		// if overview didn't show, try again after 1 second
		// (may be caused by a slow machine or autostart applications)
		if(Main.overview._shown == false){

			eventStartup = GLib.timeout_add_seconds(0, 1, _checkStartup);
		}

	}



}




function disable() {
        // disconnect from signals
        global.screen.disconnect(workspaceChanged);
        currentWorkspace.disconnect(windowRemoved);

	// remove timer event
	if(eventStartup) {
		Mainloop.source_remove(eventStartup);
	}


}




//***// extension functions

function _checkWorkspace() {

        // disconnect former 'window-removed' signal (if any)
        if(currentWorkspace) {
        currentWorkspace.disconnect(windowRemoved);
        }
   
        // get the current workspace
        currentWorkspace = global.screen.get_active_workspace();

        // connect to window-removed on current workspace
        windowRemoved = currentWorkspace.connect('window-removed', function() { 


                // get active windows on current workspace and number of workspaces
                let windowList = currentWorkspace.list_windows();
		let activeWindows = windowList.length;
                let activeWorkspaces = global.screen.get_n_workspaces();

		// ignore widgets (e.g. screenlets) and minimized windows 
		for each (var window in windowList) {
			if(window.is_skip_taskbar() || (!window.showing_on_its_workspace() 
				&& Prefs._getIgnoreMinimized()) ) {activeWindows --};
		}


                // check for "last window closed", "overview shown" and preferences settings
                if(activeWindows < 1 && Main.overview._shown == false ) {

			if (Prefs._getOnCurrent() && (activeWorkspaces > 2 || Prefs._getDynamicWorkspaceSetting() == false)) {
                        	// show landing page
                        	_OpenLandingPage(Prefs._getLandingStandard() );

			}

			else if (Prefs._getOnLastWS() && activeWorkspaces <= 2 && Prefs._getDynamicWorkspaceSetting() == true) {
				// show landing page
                        	_OpenLandingPage(Prefs._getLandingOnLastWS() );

			}
			
                }

            
	});
 

}




function _checkStartup() {

	// check if desktops are empty and show the overview (open windows cause glitches in Overview at Shell restart)
	let activeWorkspacesStartup = global.screen.get_n_workspaces();
	let checkOK = true;
	
	// check every active workspace
	for (var i = 0; i < activeWorkspacesStartup; i ++) {

		let currentWorkspaceCheck = global.screen.get_workspace_by_index(i);
		let windowListCheck = currentWorkspaceCheck.list_windows();
		let activeWindowsCheck = windowListCheck.length;

		
		for each (var window in windowListCheck) {
			if(window.is_skip_taskbar() ) {activeWindowsCheck --};
		}

		if(activeWindowsCheck > 0) {
			// check returns false if open windows are found
			checkOK = false;
			break;
		}

	}



	 if (checkOK && Main.overview._shown == false) {
		// show landing page
		_OpenLandingPage(Prefs._getLandingStartup() );

	}

return false;

}




function _OpenLandingPage(landing) {
	// open the overview or apps-page according to user settings

	// show Overview
	Main.overview.show.call(Main.overview);

	if(landing == "applications") {

		// activate apps button
		Main.overview.viewSelector._showAppsButton.checked = true;
		// move to apps page
		Main.overview.viewSelector.appDisplay._showView(Appdisplay.Views.ALL);
	}

	else if(landing == "frequent") {

		// activate apps button
		Main.overview.viewSelector._showAppsButton.checked = true;
		// move to frequent page
		Main.overview.viewSelector.appDisplay._showView(Appdisplay.Views.FREQUENT);
	}

	else {
		// nothing to do
		return;
	}


}
	


