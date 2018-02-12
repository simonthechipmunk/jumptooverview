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
 * Author: Simon Junga (simonthechipmunk at gmx.de)
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
let workspaceChanged, currentWorkspace, windowRemoved, windowAdded;
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
	
		// Check for startup conditions as soon as the mainloop turns idle (make sure gnome-shell is fully loaded)
		eventStartup = GLib.idle_add(GLib.PRIORITY_LOW, function() { 
			_checkStartup();
			return false;
            
		});

	}



}




function disable() {
        // disconnect from signals
        global.screen.disconnect(workspaceChanged);
        currentWorkspace.disconnect(windowRemoved);
        currentWorkspace.disconnect(windowAdded);

	// remove mainloop event
	if(eventStartup) {
		Mainloop.source_remove(eventStartup);
	}


}




//***// extension functions

function _checkWorkspace() {

        // disconnect former 'window-removed' signal (if any)
        if(currentWorkspace) {
        	currentWorkspace.disconnect(windowRemoved);
        	currentWorkspace.disconnect(windowAdded);
        }
   
        // get the current workspace
        currentWorkspace = global.screen.get_active_workspace();

	//get intitial windows on the current workspace
	let former_windowList = currentWorkspace.list_windows();




	// connect to window-added on current workspace
        windowAdded = currentWorkspace.connect('window-added', function() {

        	//update windowlist
        	former_windowList = currentWorkspace.list_windows();

        });


        // connect to window-removed on current workspace
        windowRemoved = currentWorkspace.connect('window-removed', function() { 


                // get active windows on current workspace and number of workspaces
                let windowList = currentWorkspace.list_windows();
		let activeWindowCount = windowList.length;
		let primaryWindowCount = 0;
                let activeWorkspaces = global.screen.get_n_workspaces();
                let primaryMonitor = global.screen.get_primary_monitor();

		// prevent popup notifications (e.g. Skype legacy) from triggering the Overview on an empty Desktop
		// BUG: Skype legacy notifications don't register as windows but trigger the "window-removed" event
		//if we detect such a window there's no need to open the overview. skip evaluation and continue
		if(former_windowList.length == windowList.length){
			//nothing to do
		}
		else{
			//check for removed window and open the overview if necessary
			
			for each (var window in former_windowList) {
			
				//count formerly active windows on the primary monitor
				if(window.get_monitor() == primaryMonitor && !window.is_skip_taskbar()){
					primaryWindowCount++
				}			
			}
		
			for each (var window in windowList) {
			
				// ignore widgets (e.g. screenlets) and minimized windows
				if(window.is_skip_taskbar() 
					|| (window.get_monitor() != primaryMonitor && Prefs._getIgnoreSecondary())
					|| (!window.showing_on_its_workspace() && Prefs._getIgnoreMinimized()) ){
						activeWindowCount--
				}
			
				//count currently active windows on the primary monitor
				if(window.get_monitor() == primaryMonitor && !window.is_skip_taskbar()){
					primaryWindowCount--
				}			
			}
		
			//if set in the preferences, ignore windows if they have been removed from a secondary monitor
			let primary_window_removed = true;
			if(primaryWindowCount == 0 && Prefs._getIgnoreSecondary()){
				primary_window_removed = false;
			}		
		

		        // check for "last window closed", "overview shown" and preferences settings
		        if(activeWindowCount < 1 && Main.overview._shown == false && primary_window_removed) {

				if (Prefs._getOnCurrent() && (activeWorkspaces > 2 || Prefs._getDynamicWorkspaceSetting() == false)) {
		                	// show landing page
		                	_OpenLandingPage(Prefs._getLandingStandard() );

				}

				else if (Prefs._getOnLastWS() && activeWorkspaces <= 2 && Prefs._getDynamicWorkspaceSetting() == true) {
					// show landing page
		                	_OpenLandingPage(Prefs._getLandingOnLastWS() );

				}
			
		        }
		}
                
                former_windowList = windowList;

            
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
	


