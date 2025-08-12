# settings.json files
This folder contains multiple settings.json files for various use cases.

## How to use
1. Start with any settings.*.json file
2. Add in any additional components from other settings files in this folder
3. Make any other modifications (consider saving the good ones)
4. Save the resulting file in your project as `<project_root>/.claude/settings.json`

## TODO:
- Add a link to the claude code docs on settings.json to this readme
- I think there might be something to building out a framework around the hooks:
    - the settings file contains a call to an entry python script for every hook
    - that base python script look in a <hook_name> folder and calls every python script there
    - that way all you have to do is add scripts to the correct folder in your project or home folder's `.claude/hooks/scripts/<hook_name>` folder and you're good
    - since python can run shell scripts, there's probably a world where you could make this work with shell scripts as well
    