window.onload = function() {
	$.ajax({
		dataType: "json",
		url: './index/plugin-index-2017-dec.min.json'
	}).done((pdnpi) =>  {
		let index = pdnpi.plugin_index;
		$("#any-type").find("#count").text(index.length);
		for(let i=0; i<index.length; i++) {
			let plug = index[i];
			$("#plugin-box").append(
			"<div class=\"d-flex flex-column plugin "+plug.type.toLowerCase().replace(" ","-")+"\">"+
				"<div class=\"row justify-content-between\">"+
					"<span><strong><a target=\"_blank\" href=\"https://forums.getpaint.net/topic/"+plug.topic_id+"-index?from=pdnpi\">"+plug.title+"</a></strong>"+
					"<span class=\"text-muted\" style=\"margin-left:10px\"><i>"+plug.release+"</i></span></span>"+
					"<span class=\"text-muted\"><i>"+plug.author+"</i></span>"+
				"</div>"+
				"<span class=\"description\">"+
					plug.desc+
				"</span>"+
				"<div class=\"row\">"+
					"<span class=\"tag type\">"+plug.type+"</span>"+
					"<span class=\"tag status\">"+plug.status+"</span>"+
					"<span class=\"tag compatibility\">"+plug.compatibility+"</span>"+
				"</div>"+
			"</div>"
			);
		}
	}).fail((err) => {
		console.log(err);
	});
}