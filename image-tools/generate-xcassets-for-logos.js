#!/usr/bin/env node

//
// Licensed under the MIT license: http://opensource.org/licenses/MIT
//
// Bill Lynch, 1/2015
//

//
// Usage:
// - Make this file executable (chmod +x) and call it directly ("./generate-xcassets-for-logos.js")
//
// Readme: 
//
// This is a companion script to another script I wrote that generates PNGs from the layers of an
// Illustrator file. Based on the output ("generated" directory below), manipulate the PNGs in 
// to their own directories and create JSON files. This will conform to XCode's xcassets
// directory format. The idea is to create a set of directories that can be copied directly in
// to XCode.
//
// I made this script for my purposes and as such it's not as generalized. That said, most of what
// you'd need to change is in the configuration section below. I made this to process a bunch of 
// exported logo images of the file convention: NAME-SIZE.png, NAME-SIZE@2x.png, NAME-SIZE@3x.png.
// Modify for your own uses...
//
// Input directory looks like this: (based on my other script)
//
//  some_directory
//		+- NAME-SIZE.png
//		+- NAME-SIZE@2x.png
//		+- NAME-SIZE@3x.png
//		+- NAME2-SIZE.png (and so on and so on...)
//
// Ouptut looks like this: (based on my configuration of "Logos" as the output name)
//
//  Logos.xcassets
//		+- NAME-SIZE.imageset
//			+- NAME-SIZE.png
//			+- NAME-SIZE@2x.png
//			+- NAME-SIZE@3x.png
//			+- Contents.json
//		+- NAME2-SIZE.imageset (and so on and so on...)
//
// The JSON in Contents.json looks like this:
//
//   {
//     "images": [
//       {
//         "idiom": "universal",
//         "scale": "1x",
//         "filename": "NAME-SIZE.png"
//       },
//       {
//         "idiom": "universal",
//         "scale": "2x",
//         "filename": "NAME-SIZE@2x.png"
//       },
//       {
//         "idiom": "universal",
//         "scale": "3x",
//         "filename": "NAME-SIZE@3x.png"
//       }
//     ],
//     "info": {
//       "version": 1,
//       "author": "xcode"
//     }
//   }
//
//
// Caveats:
//
// - Input/output directories are in the "Configuration" section below...
// - This script won't clean a target directory. To cleanly generate the xcassets file, delete
//   the target path first..
// - Before running, generate the necessary dependencies via node and the package.json file.
//

var fs = require('fs')
var _ = require('underscore')
var execSync = require("exec-sync");
var jsonfile = require('jsonfile')

//
// Configuration
//

var OUTPUT_DIR = "../../out"
var LOGOS_DIR = OUTPUT_DIR + "/logos"
var GENERATED_DIR = LOGOS_DIR + "/generated"
var XCASSETS_DEST = LOGOS_DIR
var XCASSETS_NAME = "Logos"
var XCASSETS_OUT = LOGOS_DIR + "/" + XCASSETS_NAME + ".xcassets"

//
// End configuration
//


// Create directories if they don't exist already
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR)
}
if (!fs.existsSync(LOGOS_DIR)) {
	fs.mkdirSync(LOGOS_DIR)
}

// Make sure the logo PNG's have been generated from Illustrator
if (!fs.existsSync(GENERATED_DIR)) {
	console.error("Error: generated logo PNG files from Illustrator not found")
	process.exit(1)
}

//
// 1. Read all the filenames from the "generated" directory
//
var files = fs.readdirSync(GENERATED_DIR)
// Ignore anything that's not a PNG file
files = _.filter(files, function(file) { return file.indexOf(".png") > -1 })

//
// 2. Group the file names by similar name (e.g., "NAME1" or "NAME2") and by file size (e.g., "32" or "48").
//

// First, group by team code...
files = _.groupBy(files, function(file) {
	return file.substring(0, file.indexOf("-"))
})

// Second, group by file sizes
for (var team in files) {
	var filelist = files[team]

	filelist = _.groupBy(filelist, function(f) {
		var dashPosition = f.indexOf("-")
		if (f.indexOf("@") > -1) {
			// "NAME-SIZE@2x.png" case
			return f.substring(dashPosition+1, f.indexOf("@"))
		}
		else {
			// "NAME-SIZE.png" case
			return f.substring(dashPosition+1, f.indexOf("."))
		}
	})
	// Add back the grouped structure in the same file container
	files[team] = filelist
}

//
// 3. Create the new xcassets file (i.e., a directory with a naming convention and subdirectories)
//

if (!fs.existsSync(XCASSETS_OUT)) {
	fs.mkdirSync(XCASSETS_OUT)
}

// For each file AND image size, create a new imageset directory (e.g., "NAME-SIZE.imageset")
_.each(files, function(teamData, teamName) {

	_.each(teamData, function(sizes, size) {
		var imagesetName = teamName + "-" + size
		var imagesetDir = XCASSETS_OUT + "/" + imagesetName + ".imageset"
		if (!fs.existsSync(imagesetDir)) {
			fs.mkdirSync(imagesetDir)	
		}
		// Copy the specific images (name + size) from the generated directory to 
		// the new directory
		var source = GENERATED_DIR + "/" + imagesetName + "*.png" // use a pattern to get all @2x and @3x as well
		execSync("cp " + source + " " + imagesetDir)

		// Create the Contents.json file in the new imagesetDir
		var json = {}
		json.images = []

		for (var f in sizes) {
			var imagename = sizes[f]
			var scale = "1x"
			if (imagename.indexOf("@2x") > -1) {
				scale = "2x"
			}
			else if (imagename.indexOf("@3x") > -1) {
				scale = "3x"
			}
			json.images.push({
				"idiom" : "universal",
				"scale" : scale,
				"filename" : imagename
			})
		}
		json.info = {"version":1, "author":"xcode"}

		jsonfile.writeFileSync(imagesetDir + "/Contents.json", json)
	})
})








