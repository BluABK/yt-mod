// ==UserScript==
// @name         ABK's YT-Mod
// @namespace    https://github.com/BluABK/yt-mod
// @version      0.5
// @description  Enchance your YouTube experience.
// @author       BluABK
// @match        https://www.youtube.com/feed/subscriptions*
// @grant        none
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @require      https://gist.github.com/raw/2625891/waitForKeyElements.js
// ==/UserScript==

(function() {
    'use strict';

    /**
     * CONFIG
     */
    const CONFIG = {
        dimClickedVideos: true,
        customProto: "GimmeYT",
        customProtoHrefOnVideoThumbnail: true,
        customProtoHrefOnVideoTitle: false,
        colouriseVideoTiles: true
    };

    // Constants / Common properties.
    const VIDEO_TILE_TAG_NAME = "YTD-GRID-VIDEO-RENDERER";
    const VIDEO_TILE_THUMBNAIL_TAG_NAME = "YTD-THUMBNAIL";

    // Helpers
    const COLORS =
        ['#80ED12', '#A5D604', '#C7B601', '#E39209', '#F66C1C', '#FE4838', '#FB295B', '#ED1180',
        '#D504A6', '#B601C8', '#910AE3', '#6B1DF6', '#4739FE', '#285BFB', '#1181ED', '#03A6D5',
        '#01C8B5', '#0AE491', '#1DF66B', '#3AFE47', '#5CFB28', '#82EC10', '#A7D403', '#C9B401',
        '#E4900A', '#F76A1E', '#FE463A', '#FB275D', '#EC1082', '#D403A8', '#B401CA', '#8F0AE5',
        '#691EF7', '#453BFE', '#275DFB', '#1083EC', '#03A8D3', '#01CAB3', '#0BE58F', '#1FF769',
        '#3BFE45', '#5EFA26', '#84EB0F', '#A9D303', '#CBB301', '#E68E0B', '#F7681F', '#FE443C',
        '#FA265F', '#EB0F84']; // 50 total

    // List to store video tiles
    let videoTiles = [];

    function RGB2Color(r,g,b) {
        return 'rgb(' + Math.round(r) + ',' + Math.round(g) + ',' + Math.round(b) + ')';
    }

    function recreateNode(el, withChildren) {
        if (withChildren) {
            el.parentNode.replaceChild(el.cloneNode(true), el);
        }
        else {
            var newEl = el.cloneNode(false);
            while (el.hasChildNodes()) newEl.appendChild(el.firstChild);
            el.parentNode.replaceChild(newEl, el);
        }
    }

    /*
    // Le pointless endeavour... has no real effect due to underlying event listeners.. (left in as future warning)...
    function preventClick(event) {
        console.log("Prevented default action: click", event);
        event.preventDefault();
    }
    */

    function isVideoTile(jNode) {
         return jNode.tagName === VIDEO_TILE_TAG_NAME;
    }

    /**
     * Throws exception if object's tag name is not what is expected.
     * @param obj Object to check tag name of.
     * @param tag Tag name (string) to ensure.
     */
    function ensureTagIs(obj, tag) {
        if (obj.tagName !== tag)
        {
            console.error(`Object was not of expected tag '${tag}'!`, obj)
            throw new Error(`Object was not of expected tag '${tag}'!`);
        }
    }

    /**
     * Acquire handles to stuff we want to manipulate.
     * @param eventTarget
     */
    function getTileHandles(eventTarget) {
        if (eventTarget == null) {
            console.error(`event target was null or undefined!`, eventTarget);
            throw new Error(`event target was null or undefined!`);
        }

        let videoThumbnail = eventTarget;
        let currentTagName = eventTarget.tagName;

        while (currentTagName !== VIDEO_TILE_THUMBNAIL_TAG_NAME) {
            // Traverse up the stack until the desired element is found.
            if (videoThumbnail.parentElement != null) {
                videoThumbnail = videoThumbnail.parentElement;
                currentTagName = videoThumbnail.tagName;
            } else {
                // In case of null we've likely traveled up the entire stack, but not found a match.
                console.error(`Video thumbnail was null or no occurrence of ${VIDEO_TILE_THUMBNAIL_TAG_NAME} found while traversing stack of event target!`, eventTarget);
                throw new Error(`Video thumbnail was null or no occurrence of ${VIDEO_TILE_THUMBNAIL_TAG_NAME} found while traversing stack of event target!`);
            }
        }

        //let videoThumbnail = event.originalTarget.parentElement.parentElement.parentElement.parentElement; // ytd-thumbnail
        let videoDismissible = videoThumbnail.parentElement; // div id="dismissible", container element for tile content.
        let videoTile = videoThumbnail.parentElement.parentElement; // div id="items" class="style-scope ytd-gid-renderer"
        //let videoTiles = videoDismissible.parentElement.parentElement; // div id="items" class="style-scope ytd-gid-renderer"

        return {
            tileThumbnail: videoThumbnail,
            tileContent: videoDismissible,
            tile: videoTile
        };
    }

    function getVideoTiles() {
        return videoTiles;
    }

    function listVideoTiles() {
        for (let i = 0; i < videoTiles.length; i++) {
            console.log(`videoTile #${i}`, videoTiles[i]);
        }
    }

    /**
     * Dims the video tile.
     * @param videoTile ytd-grid-video-renderer HTMLElement
     * @param opacity
     */
    function dimVideoTile(videoTile, opacity = 0.25) {
        ensureTagIs(videoTile, VIDEO_TILE_TAG_NAME);
        videoTile.style.opacity = opacity.toString();
    }

    /**
     * Hides the video tile.
     * @param videoTile ytd-grid-video-renderer HTMLElement
     */
    function hideVideoTile(videoTile) {
        ensureTagIs(videoTile, VIDEO_TILE_TAG_NAME);
        videoTile.style.display = "none";
    }

    /**
     * Shows the video tile.
     * @param videoTile ytd-grid-video-renderer HTMLElement
     */
    function showVideoTile(videoTile) {
        ensureTagIs(videoTile, VIDEO_TILE_TAG_NAME);
        videoTile.style.display = "block";
    }

    /**
     *  Hide/Unhides the video tile.
     * @param videoTile ytd-grid-video-renderer HTMLElement
     */
    function toggleVisibility(videoTile) {
        ensureTagIs(videoTile, VIDEO_TILE_TAG_NAME);
        videoTile.style.display !== "none" ? videoTile.style.display = "none" : videoTile.style.display = "block";
    }

    /**
     * Removes video tile from feed (built-in).
     *
     * NB: There is no simple way to undo this,
     * it is removed from its parent using a provided built-in function.
     * @param videoTile
     */
    function removeVideoTile(videoTile) {
        ensureTagIs(videoTile, VIDEO_TILE_TAG_NAME);
        videoTile.remove();
    }

    function handleVideoThumbMouseDown(event) {
        // console.log("event", event);

        if (event.which === 2) {
            console.log(`Handling ${event.type} for video`, event, event.originalTarget);

            // Acquire handles to stuff we want to manipulate.
            // let videoThumbnail = event.originalTarget.parentElement.parentElement.parentElement.parentElement; // ytd-thumbnail
            // let videoDismissible = videoThumbnail.parentElement; // div id="dismissible"
            // let videoTile = videoDismissible.parentElement; // div id="items" class="style-scope ytd-gid-renderer"
            // let videoTiles = videoDismissible.parentElement.parentElement; // div id="items" class="style-scope ytd-gid-renderer"
            let videoTileHandles = getTileHandles(event.originalTarget);

            // Make a handled video tile stand out, so it's easier to distinguish:
            if (CONFIG.dimClickedVideos) {
                // - Dim the video.
                dimVideoTile(videoTileHandles.tile);
            }
         }
    }

    function handleVideoTiles(jNode) {
        let gridRenderer = jNode[0];
        let items = gridRenderer.children.items;

        let colorCounter = 0;
        for (let videoTile of items.children) {
            //console.log("videoTile", videoTile);
            videoTiles.push(videoTile);

            // Beautiful rainbow colouring (primarily for debug purposes).
            if (colorCounter > COLORS.length) {
                colorCounter = 0;
            }

            if (CONFIG.colouriseVideoTiles) videoTile.style.background = COLORS[colorCounter] + "20"; // color + alpha

            // A video tile has a list of dismissed and dismissible (dismissed isn't needed at this time, so skipped.).
            let dismissible = videoTile.children.dismissible;
            //console.log("dismissible", dismissible);

            // Determine some useful elements' whereabouts.
            let videoThumb = dismissible.children[0].children[0];
            let videoDetails = dismissible.children[1];
            let videoButtons = dismissible.children[2];

            let videoMeta = videoDetails.children.meta;
            let videoTitle = videoMeta.children[0].children[1];
            let videoMetadataContainer = videoMeta.children[1];
            let videoChannelNameElement = videoMetadataContainer.children.metadata.children[0].children[0];
            let videoChannelName = videoChannelNameElement.children.container.children[0].children[0].children[0];

            // Remove ev
            //console.log("Removing _handleNative$$module$third_party$javascript$polymer$v2$polymer$lib$utils$gestures");
            //videoThumb.removeEventListener("mousedown", _handleNative);
            //console.log("videoThumb listeners.", getEventListeners(videoThumb));
            //recreateNode(videoThumb);

            // NB: we cannot reliably use the click event for event handlers on the middle or right button.
            // Instead, to distinguish between the mouse buttons we have to use the mousedown and mouseup
            // events as most browsers do fire mousedown and mouseup events for any mouse button.
            videoThumb.addEventListener("mousedown", handleVideoThumbMouseDown, true);

            if (CONFIG.customProtoHrefOnVideoThumbnail || CONFIG.customProtoHrefOnVideoTitle) {
                // Get the video ID.
                let reSearchVideoId = /\?v=(.*)/;
                let videoId = videoThumb.search.match(reSearchVideoId)[1];

                // Redirect the <a href>.
                if (CONFIG.customProtoHrefOnVideoThumbnail) {
                    videoThumb.setAttribute('href', `${CONFIG.customProto}:${videoId}`);
                }
                if (CONFIG.customProtoHrefOnVideoTitle) {
                    videoTitle.setAttribute('href', `${CONFIG.customProto}:${videoId}`);
                }
            }
            colorCounter++;
        }
    }

    function removeListener(target, type, listener) {
        console.log("Removing listener", target.tagName, type, listener);
        // If null or undefined, treat as malformed.
        if (target == null) {
            console.error("removeListener target was null or undefined, aborted!", type, listener);
            return;
        }

        target.removeEventListener(type, listener);
        console.log("Removed listener", target.tagName, type, listener);
    }

    function parseSubfeed (jNode) {
        // Handle video tiles.
        handleVideoTiles(jNode);
    }
/*
    // Catch those sneaky listeners!
    var _listeners = [];

    EventTarget.prototype.addEventListenerBase = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function addEventListener(type, listener)
    {
        //console.log("this", this);
        //return;
        //removeListener(this, type, listener);
        // Mouseclick listener removal attempt (fails due to AJAX and async stuff that adds them back in somehow).
        /*
        if (type.includes("mousedown") || type.includes("mouseenter") || type.includes("mouseleave")) {
            //console.log("Intercepted added listener", listener)
            //console.log("Removing listener", this.tagName, type, listener);
            this.removeEventListener(type, listener);
            return;

            if (listener.name == "_handleNative$$module$third_party$javascript$polymer$v2$polymer$lib$utils$gestures") {
                console.log("match", type, listener, this);
            }
        }
        *//*

        // Add listener to list of listeners.
        _listeners.push({target: this, type: type, listener: listener});
        //this.addEventListenerBase(type, listener);
        //console.log("Added listener", this, type, listener);
    };

    console.log("listeners", _listeners);
*/
    // Wait for all video tiles to load before executing own code.
    waitForKeyElements('ytd-grid-renderer.style-scope', parseSubfeed);

    /**
     * YT-Mod API
     *
     * Exposes certain properties to the web browser to add some basic form of API.
     */
    // Object for own exposed API.
    var YTMod = window.YTMod = {};

    // Exposed API
    YTMod.CONIFG = CONFIG;
    YTMod.videoTiles = videoTiles;
    YTMod.toggleVisibility = toggleVisibility;
    YTMod.showVideoTile = showVideoTile;
    YTMod.hideVideoTile = hideVideoTile;
    YTMod.dimVideoTile = dimVideoTile;
    YTMod.listVideoTiles = listVideoTiles;

})();