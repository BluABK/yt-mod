# ABK's YT-Mod
Tampermonkey script etc to modify your YouTube experience.

## Setup
### 1. Web browser
#### Tampermonkey script
Install the tampermonkey plugin, followed by importing the `yt-mod-tampermonkey.js` script. 

### 2. Desktop (Windows)
#### Compiling to binary
##### 1. Install dependencies
* `pip install pyinstaller`

##### 2. Compile python script into a .EXE
Run `build.bat` in the `protocol_handler` directory.

#### Register the custom protocol in Windows Registry
1. Make necessary edits to `install-protocol-windows.reg`.
2. Right-click and select "merge", then go through the merge process.

### 2. Desktop (Linux)
FIXME: TODO!
(Involves creating a .desktop file and putting it somewhere in `~/.local/`)