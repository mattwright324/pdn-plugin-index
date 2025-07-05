# pdn-plugin-index
An interactive site to quickly search and find Paint.NET plugins in the forums.
* https://forums.getpaint.net/topic/15260-plugin-index/
* https://mattw.io/pdn-plugin-index/

### Building

Refer to [BUILD.md](https://github.com/mattwright324/pdn-plugin-index/blob/master/BUILD.md)
for instructions on how to build and run `pdn-plugin-index` from source.

### Forum Integration

```html
<p>
    <style type="text/css">
        #pdnpi, #pdnpi-iframe {
            margin: 0;
            padding: 0;
            border: none;
            width: 100%;
            height: 1200px;
            overflow: hidden;
 	    box-shadow: rgba(149, 157, 165, 0.6) 0px 2px 4px;
        }
    </style>
</p>
<div id="pdnpi">
	&nbsp;
</div>
<script>
    (function() {
        "use strict";

        let iframe = document.createElement("iframe");
        iframe.setAttribute("id", "pdnpi-iframe");
        iframe.allow = "clipboard-write";
        iframe.src = "https://mattw.io/pdn-plugin-index" + window.location.search;
        iframe.sandbox = "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin";

        let pdnpi = document.getElementById("pdnpi");
        pdnpi.appendChild(iframe);

        const params = new URL(window.location).searchParams;
        if (params.size > 0 && !params.has("do")) {
            pdnpi.scrollIntoView(true);
        }
    })();
</script>
```
