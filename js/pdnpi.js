let CheckBox = function(id) {
	this.element = $(id+" *");
}
CheckBox.prototype = {
	setSelected: function(select) {
		this.element.prop("checked",select);
	},
	isSelected: function() {
		return this.element.is(":checked");
	}
}
window.onload = function() {
	let update = true;
	let lastSort = 0;
	let loading = $("#loading");
	let anytype = new CheckBox("#any-type");
	let effect = new CheckBox("#effect");
	let adjustment = new CheckBox("#adjustment");
	let filetype = new CheckBox("#filetype");
	let external = new CheckBox("#external");
	let pluginPack = new CheckBox("#plugin-pack");
	anytype.setSelected(true);
	$("#any-type").change(function() {
		if(anytype.isSelected()) {
			effect.setSelected(false);
			adjustment.setSelected(false);
			filetype.setSelected(false);
			external.setSelected(false);
			pluginPack.setSelected(false);
		}
	});
	$("#effect,#adjustment,#filetype,#external,#plugin-pack").change(function() {
		if((effect.isSelected() || adjustment.isSelected() || filetype.isSelected() || external.isSelected() || pluginPack.isSelected()) && anytype.isSelected()) {
			anytype.setSelected(false);
		}
	});
	
	let anystatus = new CheckBox("#any-status");
	let active = new CheckBox("#active");
	let new_ = new CheckBox("#new");
	let depreciated = new CheckBox("#depreciated");
	let obsolete = new CheckBox("#obsolete");
	let unsupported = new CheckBox("#unsupported");
	let integrated = new CheckBox("#integrated");
	active.setSelected(true);
	new_.setSelected(true);
	depreciated.setSelected(true);
	$("#any-status").change(function() {
		if(anystatus.isSelected()) {
			active.setSelected(false);
			new_.setSelected(false);
			depreciated.setSelected(false);
			obsolete.setSelected(false);
			unsupported.setSelected(false);
			integrated.setSelected(false);
		}
	});
	$("#active,#new,#depreciated,#obsolete,#unsupported,#integrated").change(function() {
		if((active.isSelected() || new_.isSelected() || depreciated.isSelected() || obsolete.isSelected() || unsupported.isSelected() || integrated.isSelected()) && anystatus.isSelected()) {
			anystatus.setSelected(false);
		}
	});
	
	function updateListing() {
		let keywords = $("#keywords").val();
		let release = $("#release").find(":selected").val();
		let author = $("#author").find(":selected").val();
		let index = pdnpi.plugin_index;
		for(let i=0; i<index.length; i++) {
			let plug = index[i]
			
			let add = false;
			for(key in plug) {
				let value = plug[key];
				if(keywords == "") {
					add = true;
					break;
				} else if(value.toString().toLowerCase().indexOf(keywords.toLowerCase()) != -1) {
					add = true;
					break;
				}
			};
			
			if(release > 0 && add) {
				add = false;
				let now = new Date();
				let date = new Date(plug.release);
				let diff = now - date;
				if(release == 1 && diff <= (1000*60*60*24*30*6)) {
					add = true;
				} else if(release == 2 && diff <= (1000*60*60*24*30*12)) {
					add = true;
				} else if(release == 3 && diff <= (1000*60*60*24*30*12*3)) {
					add = true;
				}
			}
			
			if(author == 1 && add) {
				a = $("#author").find(":selected").text();
				if(plug.author != a) {
					add = false;
				}
			}
			
			if(!anytype.isSelected() && add) {
				add = false;
				if(plug.type == "Effect" && effect.isSelected()) add = true;
				if(plug.type == "Adjustment" && adjustment.isSelected()) add = true;
				if(plug.type == "Filetype" && filetype.isSelected()) add = true;
				if(plug.type == "External Resource" && external.isSelected()) add = true;
				if(plug.type == "Plugin Pack" && pluginPack.isSelected()) add = true;
			}
			if(!anystatus.isSelected() && add) {
				add = false;
				if((plug.status == "Active" || plug.status == "New") && active.isSelected()) add = true;
				if(plug.status == "New" && new_.isSelected()) add = true;
				if(plug.status == "Depreciated" && depreciated.isSelected()) add = true;
				if(plug.status == "Obsolete" && obsolete.isSelected()) add = true;
				if(plug.status == "Unsupported" && unsupported.isSelected()) add = true;
				if(plug.status == "Integrated" && integrated.isSelected()) add = true;
			}
			
			if(add) {
				$("#plugin-"+plug.id).show();
			} else {
				$("#plugin-"+plug.id).attr("style", "display: none !important;");
			}
		}
		$("#count").text($("#plugin-box").find(".plugin:visible").length+" / "+index.length);
		let order = $("#order").find(":selected").val();
		if(lastSort != order) {
			$("#plugin-box").find(".plugin").sort(function(a,b){
				let ca, cb;
				if(order == 0) {
					ca = $(a).find("a").text();
					cb = $(b).find("a").text();
				} else if(order == 1) {
					ca = new Date($(a).find(".release").text());
					cb = new Date($(b).find(".release").text());
					return (ca < cb) ? 1 : (ca > cb) ? -1 : 0; // Return newest first
				} else if(order == 2) {
					ca = $(a).find(".author").text();
					cb = $(b).find(".author").text();
				} else if(order == 3) {
					ca = $(a).find(".menu").text();
					cb = $(b).find(".menu").text();
				}
				return (ca < cb) ? -1 : (ca > cb) ? 1 : 0;
			}).appendTo("#plugin-box");
			lastSort = order;
		}
		loading.hide();
	}
	$.ajax({
		dataType: "json",
		url: './index/plugin-index.json'
	}).done((pdnpi) =>  {
		window["pdnpi"] = pdnpi;
		window["authors"] = [];
		let index = pdnpi.plugin_index;
		for(let i=0; i<index.length; i++) {
			let plug = index[i];
			plug["id"] = i;
			if(authors.indexOf(plug.author) == -1) {
				authors.push(plug.author);
            }
			let alt_topic = "";
			if(plug.alt_topic) {
                alt_topic = " <strong>See also: <a target=\"_blank\" href=\"https://forums.getpaint.net/topic/" + plug.alt_topic +"-index\" title=\"Alternate Topic\">"+" Topic "+plug.alt_topic+"</a></strong>";
			}
			$("#plugin-box").append(
			"<div id=\"plugin-"+i+"\" class=\"d-flex flex-column plugin "+plug.type.toLowerCase()+"\">"+
				"<div class=\"row justify-content-between\">"+
				"<span><strong><a target=\"_blank\" href=\"https://forums.getpaint.net/topic/"+plug.topic_id+"-index\">"+plug.title+"</a></strong>"+
                "<span class=\"text-muted release\" style=\"margin-left:10px\"><i>" + plug.release + "</i></span></span>" +
                "<span class=\"text-muted author\"><strong>"+plug.author+"</strong></span>"+
				"</div>"+
				"<span class=\"desc\">"+
                plug.desc +
                alt_topic +
				"</span>"+
				"<div class=\"row\">"+
					"<span class=\"tag type\" title=\"Plugin Type\">"+plug.type+"</span>"+
					"<span class=\"tag status\" title=\"Plugin Status\">"+plug.status+"</span>"+
					"<span class=\"tag compat\" title=\"Compatibility\">"+plug.compatibility+"</span>"+
                    "<span class=\"tag menu\" title=\"Menu Location\">" + plug.menu + "</span>" +
                    "<span class=\"tag dll\" title=\"DLL(s)\">" + plug.dlls + "</span>" +
				"</div>"+
			"</div>"
			);
		}
		authors.sort(function (a, b) {
			return a.toLowerCase().localeCompare(b.toLowerCase());
		});
		for(let i=0; i<authors.length; i++) {
			$("#author").append(
			"<option value=\"1\">"+authors[i]+"</option>"
			);
		}
		updateListing();
		$("#sidemenu *").change(function(){update = true;loading.show();});
		$("#keywords").on('keyup',function(){update = true;loading.show();});
		setInterval(function() {
			if(update) {
				console.log("update!");
				updateListing();
				update = false;
			}
		},250);
	}).fail((err) => {
		console.log(err);
	});
}

// Scroll to top
$(document).ready(function(){ 
    $(window).scroll(function(){ 
        if ($(this).scrollTop() > 100) { 
            $('#scroll').fadeIn(); 
        } else { 
            $('#scroll').fadeOut(); 
        } 
    }); 
    $('#scroll').click(function(){ 
        $("html, body").animate({ scrollTop: 0 }, 600); 
        return false; 
    }); 
});