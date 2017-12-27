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
	let depreciated = new CheckBox("#depreciated");
	let obsolete = new CheckBox("#obsolete");
	let unsupported = new CheckBox("#unsupported");
	let builtIn = new CheckBox("#built-in");
	active.setSelected(true);
	depreciated.setSelected(true);
	$("#any-status").change(function() {
		if(anystatus.isSelected()) {
			active.setSelected(false);
			depreciated.setSelected(false);
			obsolete.setSelected(false);
			unsupported.setSelected(false);
			builtIn.setSelected(false);
		}
	});
	$("#active,#depreciated,#obsolete,#unsupported,#built-in").change(function() {
		if((active.isSelected() || depreciated.isSelected() || obsolete.isSelected() || unsupported.isSelected() || builtIn.isSelected()) && anystatus.isSelected()) {
			anystatus.setSelected(false);
		}
	});
	
	function updateListing() {
		let keywords = $("#keywords").val();
		let release = $("#release").find(":selected").val();
		
		$("#plugin-box").empty();
		
		let index = pdnpi.plugin_index;
		for(let i=0; i<index.length; i++) {
			let plug = index[i]
			
			let add = false;
			for(key in plug) {
				let value = plug[key];
				if(keywords == "") {
					add = true;
					break;
				} else if(value.toLowerCase().indexOf(keywords.toLowerCase()) != -1) {
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
			
			if(!anytype.isSelected() && add) {
				if(plug.type == "Effect" && !effect.isSelected()) add = false;
				if(plug.type == "Adjustment" && !adjustment.isSelected()) add = false;
				if(plug.type == "Filetype" && !filetype.isSelected()) add = false;
				if(plug.type == "External Resource" && !external.isSelected()) add = false;
				if(plug.type == "Plugin Pack" && !pluginPack.isSelected()) add = false;
			}
			if(!anystatus.isSelected() && add) {
				if(plug.status == "Active" && !active.isSelected()) add = false;
				if(plug.status == "Depreciated" && !depreciated.isSelected()) add = false;
				if(plug.status == "Obsolete" && !obsolete.isSelected()) add = false;
				if(plug.status == "Unsupported" && !unsupported.isSelected()) add = false;
				if(plug.status == "Built In" && !builtIn.isSelected()) add = false;
			}
			
			if(add) {
				$("#plugin-box").append(
				"<div class=\"d-flex flex-column plugin "+plug.type.toLowerCase().replace(" ","-")+"\">"+
					"<div class=\"row justify-content-between\">"+
						"<span><strong><a target=\"_blank\" href=\"https://forums.getpaint.net/topic/"+plug.topic_id+"-index?from=pdnpi\">"+plug.title+"</a></strong>"+
						"<span class=\"text-muted release\" style=\"margin-left:10px\"><i>"+plug.release+"</i></span></span>"+
						"<span class=\"text-muted author\"><strong>"+plug.author+"</strong></span>"+
					"</div>"+
					"<span class=\"desc\">"+
						plug.desc+
					"</span>"+
					"<div class=\"row\">"+
						"<span class=\"tag type\">"+plug.type+"</span>"+
						"<span class=\"tag status\">"+plug.status+"</span>"+
						"<span class=\"tag compat\">"+plug.compatibility+"</span>"+
						"<span class=\"tag menu\">"+plug.menu+"</span>"+
					"</div>"+
				"</div>"
				);
			}
		}
		$("#count").text($("#plugin-box").children().length+" / "+index.length);
	}
	$.ajax({
		dataType: "json",
		url: './index/plugin-index-2017-dec.min.json'
	}).done((res) =>  {
		window["pdnpi"] = res;
		updateListing();
	}).fail((err) => {
		console.log(err);
	});
	$("#sidemenu *").change(function(){update = true;});
	$("#keywords").on('keyup',function(){update = true;});
	setInterval(function() {
		if(update) {
			console.log("update!");
			updateListing();
			update = false;
		}
	},250);
}