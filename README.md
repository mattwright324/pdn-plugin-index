# pdn-plugin-index
An interactive site to quickly search and find Paint.NET plugins in the forums.
* https://forums.getpaint.net/topic/15260-plugin-index/
* https://mattw.io/pdn-plugin-index/


## Forum Integration

    <style>
        #pdnpi, #pdnpi-iframe {
            margin: 0;
            padding: 0;
            border: none;
            width: 100%;
            height: 100%;
            overflow: hidden;
        }
    </style>
    <div id="pdnpi"></div>
    <script>
            (function() {
                "use strict";
                
                let iframe = document.createElement("iframe");
                iframe.setAttribute("id", "pdnpi-iframe");
                iframe.src = "https://mattw.io/pdn-plugin-index";
                iframe.sandbox = "allow-scripts allow-popups";
                
                let pdnpi = document.getElementById("pdnpi");
                pdnpi.appendChild(iframe);
            })();
    </script>
