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

// CheckBox selection and deselection behavior.
function cb(allCb, cbs) {
	allCb.element.change(function(){
		if(allCb.isSelected()) {
			cbs.forEach(checkBox => checkBox.setSelected(false));
		}
	});
	cbs.forEach(checkBox => checkBox.element.change(function() {
		if(checkBox.isSelected()) {
			allCb.setSelected(false);
		}
	}));
}

$(document).ready(function() {
	let keywords = $("#keywords");
	let release = $("#release");
	let author = $("#author");
	let menu = $("#menu-list");
	
	let anyType = new CheckBox("#any-type");
	let effect = new CheckBox("#effect");
	let adjustment = new CheckBox("#adjustment");
	let fileType = new CheckBox("#filetype");
	let external = new CheckBox("#external");
	let pluginPack = new CheckBox("#plugin-pack");
	anyType.setSelected(true);
	cb(anyType, [effect,adjustment,fileType,external,pluginPack]);
	
	let anyStatus = new CheckBox("#any-status");
	let active = new CheckBox("#active");
	let new_ = new CheckBox("#new");
	let depreciated = new CheckBox("#depreciated");
	let obsolete = new CheckBox("#obsolete");
	let unsupported = new CheckBox("#unsupported");
	let integrated = new CheckBox("#integrated");
	active.setSelected(true);
	new_.setSelected(true);
	depreciated.setSelected(true);
	cb(anyStatus, [active,new_,depreciated,obsolete,unsupported,integrated]);
	
	let pluginBox = $("#plugin-box");
	let loading = $("#loading");
	loading.fadeOut();
	
	// Builds and controls a plugin in the listing.
	let Plugin = function(element) {
		this.element = element;
		this.data = {
			"alt_topic": (element.has(".alt") ? element.find(".alt").data("id") : ""),
			"author": element.find(".author").text(),
			"author_id": element.find(".author").data("id"),
			"compatibility": element.find(".tag.compat").text(),
			"desc": element.find(".desc").text(),
			"dlls": element.find(".tag.dll").text(),
			"release": element.find(".release").text(),
			"status": element.find(".tag.status").text(),
			"title": element.find(".title").text(),
			"topic_id": element.data("id"),
			"type": element.find(".tag.type").text(),
			"menu": element.find(".tag.menu").text()
		}
	}
	Plugin.prototype = {
		show: function(){this.element.show()},
		hide: function(){this.element.attr("style", "display: none !important;")}
	}
	
	let pdnpi = {}
	
	pdnpi["plugins"] = []; // List of all Plugin elements.
	pdnpi["authors"] = []; // List of unique authors.
	pdnpi["menus"] = [];   // List of unique menu locations.
	
	window["pdnpi"] = pdnpi;
	$.each($(".plugin"), function(index, value) {
		pdnpi.plugins.push(new Plugin($(value)));
	});
	
	let id = 0;
	pdnpi.plugins.forEach(plugin => {
		if(pdnpi.authors.indexOf(plugin.data.author) == -1) {
			pdnpi.authors.push(plugin.data.author);
		}
		if(pdnpi.menus.indexOf(plugin.data.menu) == -1) {
			pdnpi.menus.push(plugin.data.menu);
		}
	});
	
	let sortAlpha = function (a, b) {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	};
	pdnpi.authors.sort(sortAlpha);
	for(let i=0; i<pdnpi.authors.length; i++) {
		$("#author").append('<option value="1">'+pdnpi.authors[i]+'</option>');
	}
	pdnpi.menus.sort(sortAlpha);
	for(let i=0; i<pdnpi.menus.length; i++) {
		$("#menu-list").append('<option value="1">'+pdnpi.menus[i]+'</option>');
	}
	
	function cu() {
		loading.show();
		setTimeout(()=>{
			console.log("Updating...");
			updateListing();
		},5);
	}
	
	$("#sidemenu *").change(cu);
	$("#keywords").on('keyup',cu);
	cu();
	
	let lastSort = 0;
	let updateListing = function() {
		let shouldDisplay = function(plugin) {
			let keywords = $("#keywords").val();
			if(keywords != "") {
				let h = true;
				for(key in plugin.data) {
					if(plugin.data[key] && plugin.data[key].toString().toLowerCase().indexOf(keywords.toLowerCase()) != -1) {
						h = false;
					}
				}
				if(h) return false;
			}
			
			let release = $("#release").find(":selected").val();
			let now = new Date();
			let date = new Date(plugin.data.release);
			let diff = now - date;
			if(release == 1 && diff > (1000*60*60*24*30*6)) {
				return false;
			} else if(release == 2 && diff > (1000*60*60*24*30*12)) {
				return false;
			} else if(release == 3 && diff > (1000*60*60*24*30*12*3)) {
				return false;
			}
			
			let author = $("#author").find(":selected").val();
			if(author == 1) {
				if(plugin.data.author != $("#author").find(":selected").text()) {
					return false;
				}
			}
			
			let menu = $("#menu-list").find(":selected").val();
			if(menu == 1) {
				if(plugin.data.menu != $("#menu-list").find(":selected").text()) {
					return false;
				}
			}
			
			if(!anyType.isSelected()) {
				let h = true;
				let type = plugin.data.type;
				if(type == "Effect" && effect.isSelected()) h = false;
				if(type == "Adjustment" && adjustment.isSelected()) h = false;
				if(type == "Filetype" && fileType.isSelected()) h = false;
				if(type == "External Resource" && external.isSelected()) h = false;
				if(type == "Plugin Pack" && pluginPack.isSelected()) h = false;
				if(h) return false;
			}
			
			if(!anyStatus.isSelected()) {
				let h = true;
				let status = plugin.data.status;
				if((status == "Active" || status == "New") && active.isSelected()) h = false;
				if(status == "New" && new_.isSelected()) h = false;
				if(status == "Depreciated" && depreciated.isSelected()) h = false;
				if(status == "Obsolete" && obsolete.isSelected()) h = false;
				if(status == "Unsupported" && unsupported.isSelected()) h = false;
				if(status == "Integrated" && integrated.isSelected()) h = false;
				if(h) return false;
			}
			return true;
		}
		
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
		
		pdnpi.plugins.forEach(plugin => {
			if(shouldDisplay(plugin)) {
				plugin.show();
			} else {
				plugin.hide();
			}
		});
		
		$("#count").text($("#plugin-box").find(".plugin:visible").length+" / "+pdnpi.plugins.length);
		loading.fadeOut();
		console.log("Updated listing.");
	}
	
	// Scroll to top of page.
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