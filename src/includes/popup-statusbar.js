// ==UserScript==
// @name Chrome-like statusbar for Opera
// @version 2012.12.06
// @include http*
// @exclude opera:*
// @exclude chrome:*
// @exclude about:*
// @exclude widget:*
// @exclude *.jpg
// @exclude *.jpeg
// @exclude *.png
// @exclude *.apng
// @exclude *.gif
// @exclude *.svg
// @exclude *.swf
// ==/UserScript==
 
function PopupStatusbar() {
    var ID = "_opera_extension_$_popup_statusbar_";
    var HIDE_TIMEOUT = 400; // ms
    var SHOW_DELAY = 1500; //ms
    var SITE = window.location.protocol + '//' + window.location.hostname;
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
            "background: #eee",
            "color: #000",
            "padding: 2px 6px",
            "margin: 0",
            "box-sizing: border-box",
            "border-top: 0 solid #ccc",
            "border-right: 0 solid #ccc",
            "border-width: 1px 1px 0 0",
            "border-top-right-radius: 4px",
            "overflow: hidden",
            "white-space: nowrap",
            "line-height: 1.7em",
            "text-overflow: ellipsis",
            "-o-transition: opacity .3s, max-width .3s",
            /*"transition: opacity .3s, max-width .3s",*/
            "text-shadow: rgba(250, 250, 250, .5) 0px 1px 0;",
            "direction: ltr",
            "font-size: .8em",
        ],

        // Platform specific styling, lots of guesswork going on here
        "lin": [
            "font-family: 'Droid Sans', Ubuntu, 'DejaVu Sans'",
            "border-color: #aaa9a9",
            "background: #f2f1f0",
            "color: #333"
        ],
        "win": [
            "font-family: Calibri, Tahoma;",
            "border-color: #798999",
            "background: #ccc",
            "color: #0c0c0d",
        ],
        "mac": [
            "font-family: 'Lucida Grande', Verdana, sans-serif;",
            "color: #222",
            "box-shadow: 1px -1px 1px rgba(0, 0, 0, .1)"
        ],

        // Scheme specific styling
        "https": [
            "background: #FCF9BD",
            "color: #431",
            "border-color: #E3E1AB"
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
    var self = this;

    this._currentTarget = null;
    this._isExpanded = false;
    this._isDelayed = false;

    this.show = function(event) {
        var url, target = event.target;

        while (target && !/^(?:a|area|img)$/i.test(target.nodeName)) target = target.parentNode;
        if (!target || !(url = target.href || target.src) || self._currentTarget === target || ~url.indexOf(SITE) || /^#|(?:javascript\s*:\s*void\(\d\);?)$/i.test(url)) return;

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
                  statusbar.textContent = decodeURI(url.replace(/^https?:\/\//i, ""));
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

            self._currentTarget = target;

            // Expand it after a while, Chrome style
            expandTimeoutId = setTimeout(function() {
                // Doesn't animate when setting it to "100%"
                statusbar.style.maxWidth = document.documentElement.clientWidth + "px !important";
                self._isExpanded = true;
            }.bind(self), EXPAND_TIMEOUT);

            self._isDelayed = false;
        }, SHOW_DELAY);
    };

    this.hide = function(event) {
        // exit if we didn't execute show function on timeout
        self._isExpanded = false;
        self._currentTarget = null;

        if (self._isDelayed) {
            clearTimeout(delayTimeoutId);
            self._currentTarget = null;
            return;
        }

        clearTimeout(expandTimeoutId);
        hideTimeoutId = setTimeout(self._removeElement, HIDE_TIMEOUT);
    };

    this._removeElement = function() {
        var ele = document.getElementById(ID);
        if (ele) {
            // Setting display before removing is a workaround for a reflow bug
            // where the statusbar gets stuck on the page if it's too short.
            ele.style.display = "none !important";
            ele.parentNode.removeChild(ele);
        }
    };
}

window.addEventListener("DOMContentLoaded", function(event) {
    if (window.self !== window.top) return;

    var statusbar = new PopupStatusbar();
    var show_bound = statusbar.show.bind(statusbar);

    document.documentElement.addEventListener("mouseover", show_bound, false);
    opera.extension.addEventListener("disconnect", function() {
        statusbar._removeElement();
        document.documentElement.removeEventListener("mouseover", show_bound, false);
    }, false);
}, false);

