/**
 * Authors: David Håsäther, <davidh@opera.com>
 *          Jan Henrik Helmers, <janhh@opera.com>
 * Version: 0.2
 */
 
function PopupStatusbar() {
    var ID = "_opera_extension_$_popup_statusbar_";
    var HIDE_TIMEOUT = 400; // ms
    var SHOW_DELAY = 1000; //ms
    var EXPAND_TIMEOUT = 700; // ms
    var platform = window.navigator.platform.toLowerCase().slice(0, 3) || "";
    var styles = {
        // Base styling
        "base": [
            "position: fixed",
            "z-index: 2147483647",
            "top: auto",
            "right: auto",
            "bottom: 0",
            "left: 0",
            "height: auto",
            "font: 13px sans-serif",
            "background: #ddd",
            "color: #000",
            "padding: 2px 4px",
            "margin: 0",
            "box-sizing: border-box",
            "border: 0 solid #999",
            "border-width: 1px 1px 0 0",
            "border-top-right-radius: 4px",
            "overflow: hidden",
            "white-space: nowrap",
            "text-overflow: ellipsis",
            "-o-transition: opacity .3s, max-width .3s",
            /*"transition: opacity .3s, max-width .3s",*/
            "text-shadow: 0 1px rgba(255, 255, 255, .5)",
            "direction: ltr"
        ],

        // Platform specific styling, lots of guesswork going on here
        "lin": [
            "font-family: 'Droid Sans', Ubuntu, 'DejaVu Sans'",
            "border-color: #aaa9a9",
            "background: #f2f1f0",
            "color: #333"
        ],
        "win": [
            "font: 12px 'Segoe UI', Tahoma",
            "border-color: #798999",
            "background: #e0ebf8",
            "color: #0c0c0d",
            "text-shadow: 0 1px #f2f7fc"
        ],
        "mac": [
            "font: 11px 'Lucida Grande'",
            "color: #222",
            "box-shadow: 1px -1px 1px rgba(0, 0, 0, .1)"
        ],

        // Scheme specific styling
        "https": [
            "background: #fc5",
            "color: #431",
            "border-color: #431"
        ],
        "ftp": [
        ],
        "javascript": [
        ],
        "mailto": [
        ]
    };

    var hideTimeoutId = null;
    var expandTimeoutId = null;
    var delayTimeoutId = null;

    this._currentTarget = null;
    this._isExpanded = false;
    this._isDelayed = false;

    this.show = function(event) {
        var self = this, target = event.target;
        while (target && !/^(?:a|area|img)$/i.test(target.nodeName))
            target = target.parentNode;

        if (!target || (!target.href && !target.src)) return;
        var url = target.href || target.src;

        // TODO: do some refactoring here, move stuff out
        var removeBound = function(event) {
            self.hide(event);
            target.removeEventListener("mouseout", removeBound, false);
        }.bind(self);

        target.addEventListener("mouseout", removeBound, false);
        self._isDelayed = true;
        clearTimeout(delayTimeoutId);

        delayTimeoutId = setTimeout(function() {
            if (!self._isDelayed) return;

            clearTimeout(hideTimeoutId);

            var ele = document.getElementById(ID),
                statusbar = ele || document.createElement("statusbar");

            if (self._currentTarget !== target) {
                // Not dealing with the same target, remove the element
                self._removeElement();

                var scheme = url.slice(0, url.indexOf(":"));
                statusbar.id = ID;
                statusbar.style.cssText = styles["base"].concat(styles[platform] || [])
                                            .concat(styles[scheme] || [])
                                            .concat(ele ? "opacity: 1" : "opacity: 0")
                                            .concat(
                                                self._isExpanded
                                                ? "max-width: 100%"
                                                : "max-width:" + Math.min(500, document.documentElement.clientWidth) + "px")
                                            .join(" !important;");
                try {
                    statusbar.textContent = decodeURI(url.replace("http://", ""));
                }
                catch (bug) {
                    statusbar.textContent = url;
                }

                // Append it to the document element to avoid problems when someone does
                // document.body.lastChild or similar
                document.documentElement.appendChild(statusbar);

                // If the mouse is over the statusbar, don't show it
                var box = statusbar.getBoundingClientRect();
                if (event.clientY > box.top && event.clientX < box.width) {
                    self._removeElement();
                    return;
                }

                // Fade it in
                setTimeout(function() {
                    statusbar.style.opacity = "1 !important";
                }, 10);
            }

            self._currentTarget = target;

            // Expand it after a while, Chrome style
            expandTimeoutId = setTimeout(function() {
                // Doesn't animate when setting it to "100%"
                statusbar.style.maxWidth = document.documentElement.clientWidth + "px !important";
                self._isExpanded = true;
            }.bind(self), EXPAND_TIMEOUT);

            statusbar.addEventListener("mouseover", self._removeElement.bind(self), false);

            self._isDelayed = false;
        }, SHOW_DELAY);
    };

    this.hide = function(event) {
        var self = this;
        // exit if we didn't execute show function on timeout
        if (self._isDelayed) {
            clearTimeout(delayTimeoutId);
            self._currentTarget = null;
            return;
        }

        clearTimeout(expandTimeoutId);
        hideTimeoutId = setTimeout(function() {
            // Setting display before removing is a workaround for a reflow bug
            // where the statusbar gets stuck on the page if it's too short.
            var ele = document.getElementById(ID);
            if (ele) ele.style.display = "none !important";
            setTimeout(self._removeElement.bind(self), 0);
            self._isExpanded = false;
        }.bind(self), HIDE_TIMEOUT);
    };

    this._removeElement = function() {
        var ele = document.getElementById(ID);
        if (ele) {
            ele.parentNode.removeChild(ele);
            self._currentTarget = null;
        }
    };
}

window.addEventListener("DOMContentLoaded", function(event) {
    if (window.self !== window.top) return;

     // Temporary until Opera has a proper implementation
    var slice = Array.prototype.slice;
    Function.prototype.bind = function(context) {
        var method = this;
        var args = slice.call(arguments, 1);
        return function() {
            return method.apply(context, args.concat(slice.call(arguments, 0)));
        };
    };

    var statusbar = new PopupStatusbar();
    var show_bound = statusbar.show.bind(statusbar);

    document.documentElement.addEventListener("mouseover", show_bound, false);
    opera.extension.addEventListener("disconnect", function() {
        statusbar._removeElement();
        document.documentElement.removeEventListener("mouseover", show_bound, false);
    }, false);
}, false);

