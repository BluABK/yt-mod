// ==UserScript==
// @name         ABK's YT-Mod
// @namespace    https://github.com/BluABK/yt-mod
// @version      0.5
// @description  Enhance your YouTube experience.
// @author       BluABK
// @match        https://www.youtube.com/feed/subscriptions*
// @match        https://www.youtube.com/c/*/videos
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
        dimmedVideoOpacity: 0.25,
        customProto: "GimmeYT",
        customProtoHrefOnVideoThumbnail: true,
        customProtoHrefOnVideoTitle: false,
        colouriseVideoTiles: true,
        colourisedVideoTileAlpha: 30
    };

    // Constants / Common properties.
    const GRID_RENDERER = "YTD-GRID-RENDERER";
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

        let videoThumbnailElement = eventTarget;
        let currentTagName = eventTarget.tagName;

        while (currentTagName !== VIDEO_TILE_THUMBNAIL_TAG_NAME) {
            // Traverse up the stack until the desired element is found.
            if (videoThumbnailElement.parentElement != null) {
                videoThumbnailElement = videoThumbnailElement.parentElement;
                currentTagName = videoThumbnailElement.tagName;
            } else {
                // In case of null we've likely traveled up the entire stack, but not found a match.
                console.error(`Video thumbnail was null or no occurrence of ${VIDEO_TILE_THUMBNAIL_TAG_NAME} found while traversing stack of event target!`, eventTarget);
                throw new Error(`Video thumbnail was null or no occurrence of ${VIDEO_TILE_THUMBNAIL_TAG_NAME} found while traversing stack of event target!`);
            }
        }

        // A video tile has a list of dismissed and dismissible (dismissed isn't needed at this time, so skipped.).
        let videoDismissible = videoThumbnailElement.parentElement; // div id="dismissible", container element for tile content.

        // The video tile element itself.
        let videoTile = videoThumbnailElement.parentElement.parentElement; // div id="items" class="style-scope ytd-gid-renderer"

        // Other useful fields.
        let videoDetails = videoDismissible.children[1];
        let videoButtons = videoDismissible.children[2];

        let videoMeta = videoDetails.children.meta;
        let videoTitle = videoMeta.children[0].children[1];
        let videoMetadataContainer = videoMeta.children[1];
        let videoChannelNameElement = videoMetadataContainer.children.metadata.children[0].children[0];
        let videoChannelName = videoChannelNameElement.children.container.children[0].children[0].children[0];

        return {
            tile: videoTile,
            thumbnailElement: videoThumbnailElement,
            thumbnail: videoThumbnailElement.children.thumbnail,
            content: videoDismissible,
            details: videoDetails,
            buttons: videoButtons,
            meta: videoMeta,
            title: videoTitle,
            metadataContainer: videoMetadataContainer,
            channelNameElement: videoChannelNameElement,
            channelName: videoChannelName
        };
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
            let videoTileHandles = getTileHandles(event.originalTarget);

            // Make a handled video tile stand out, so it's easier to distinguish:
            if (CONFIG.dimClickedVideos) {
                // - Dim the video.
                dimVideoTile(videoTileHandles.tile, CONFIG.dimmedVideoOpacity);
            }
         }
    }

    /**
     * Video tile handler.
     *
     * @param gridRenderer GRID_RENDERER element which holds the video tiles.
     */
    function handleVideoTiles(gridRenderer) {
        let items = gridRenderer.children.items;

        let colorCounter = 0;
        for (let videoTileElement of items.children) {
            videoTiles.push(videoTileElement);

            // Acquire handles to stuff we want to manipulate.
            // FIXME: Should probably make getTileHandles handle video tile as argument instead of needing to pass its thumbnail.
            let videoTileHandles = getTileHandles(videoTileElement.children.dismissible.children[0].children[0]);

            // Beautiful rainbow colouring (primarily for debug purposes).
            if (colorCounter > COLORS.length) {
                colorCounter = 0;
            }

            if (CONFIG.colouriseVideoTiles) videoTileElement.style.background = COLORS[colorCounter] + CONFIG.colourisedVideoTileAlpha.toString(); // color + alpha

            // NB: we cannot reliably use the click event for event handlers on the middle or right button.
            // Instead, to distinguish between the mouse buttons we have to use the mousedown and mouseup
            // events as most browsers do fire mousedown and mouseup events for any mouse button.
            videoTileHandles.thumbnail.addEventListener("mousedown", handleVideoThumbMouseDown, true);

            if (CONFIG.customProtoHrefOnVideoThumbnail || CONFIG.customProtoHrefOnVideoTitle) {
                // Get the video ID.
                let reSearchVideoId = /\?v=(.*)/;
                let videoId = videoTileHandles.thumbnail.search.match(reSearchVideoId)[1];

                // Redirect the <a href>.
                if (CONFIG.customProtoHrefOnVideoThumbnail) {
                    videoTileHandles.thumbnail.setAttribute('href', `${CONFIG.customProto}:${videoId}`);
                }
                if (CONFIG.customProtoHrefOnVideoTitle) {
                    videoTileHandles.title.setAttribute('href', `${CONFIG.customProto}:${videoId}`);
                }
            }
            colorCounter++;
        }
    }

    /**
     * Removes an event listener, given required criteria.
     *
     * @param target Target element to remove the listener from.
     * @param type Listener type.
     * @param listener The listener to be removed.
     */
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

    /**
     * Parse the subscription feed.
     *
     * @param jNode Object containing a context that is supposedly the grid renderer.
     *
     *              Object
     *              {
     *                  0: ytd-grid-renderer.style-scope.ytd-item-section-renderer,
     *                  context: ytd-grid-renderer.style-scope.ytd-item-section-renderer,
     *                  length: 1
     *              }
     */
    function parseSubfeed(jNode) {
        // Make sure that the context is of expected tag.
        ensureTagIs(jNode.context, GRID_RENDERER);

        // Handle video tiles.
        handleVideoTiles(jNode.context);
    }

    /**
     * ================================================================================================================
     * ===================================================== MAIN =====================================================
     * ================================================================================================================
     */

    /**
     * Wait for all video tiles to load before executing own code.
     *
     * Calls the given function with the given element id passed as argument.
     */
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