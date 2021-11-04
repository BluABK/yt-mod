import os
import sys
import traceback
from subprocess import Popen
from pathlib import Path
import json

"""
Notes:
    Using sys.exit instead of exit due to issues with pyinstaller and other .EXE makers.
"""

# Required due to being run by system (with cwd of %SystemRoot%)
# NB: Using sys.argv instead of sys.path or __file__ due to pyinstaller changing these to a temp dir.
SCRIPT_PATH = os.path.dirname(os.path.realpath(sys.argv[0]))


def hold(is_err=False):
    """
    Keeps the console open, useful to catch errors and see what's going on when not run from a console.
    :return:
    """
    msg = "Press <Enter> key to exit..."
    if is_err:
        sys.stderr.write(msg + '\n')
    else:
        print(msg)

    input()


def show_help():
    print("Usage: gimmeyt:<video_id>")
    print("Example: gimmeyt:cZdustxzEIs")


try:
    with open(Path(SCRIPT_PATH, "../cfg/config.json").as_posix(), "r") as f:
        CONFIG = json.load(f)
except Exception as exc:
    sys.stderr.write("Exception occurred trying to load config!\n")
    traceback.print_exc()
    hold(is_err=True)
    sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        show_help()
        hold()
        sys.exit(1)

    proto_part = "{}:".format(CONFIG["proto"])
    video_id = sys.argv[1][len(proto_part):]

    url = "{pre}{id}{post}".format(pre=CONFIG["arg_pre"], id=video_id, post=CONFIG["arg_post"])

    try:
        Popen([Path(CONFIG["program_path"]).as_posix(), CONFIG["program_args"], url])
    except Exception as exc:
        sys.stderr.write("Exception occurred!\n")
        traceback.print_exc()
        hold(is_err=True)
        sys.exit(1)
