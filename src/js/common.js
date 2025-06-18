//import { QdrantClient } from '@qdrant/js-client-rest';
//const { QdrantClient } = require('@qdrant/js-client-rest');
//const express = require('express');

// 로컬 Qdrant 서버에 연결
//const client = new QdrantClient({ url: 'http://127.0.0.1:6333' });

// Qdrant Cloud에 연결할 경우
/**
const cloudClient = new QdrantClient({
	url: 'https://your-qdrant-cloud-url',
	apiKey: '<your-api-key>',
}); */


CODE = {
	getLanguage : (languagekey) => {
		const defaultValue = {
			languagekey: "",
			languagename: "",
			isocode: "",
			description: "",
			orderseq: "",
			usable: "",
			insertdt: "",
			updatedt: "",
		};

		return CODE.language.find(item => item.languagekey == languagekey) || defaultValue;
	},
}

ninegrid.setCssPath("/css/nine-grid");

ninegrid.setOptions("confirm", {
		"class"			: "rgb",	//"classic", "rgb"
		"animation"		: "run",
		"true-text"		: "OK",
		"false-text"	: "Cancel",
	});

ninegrid.setOptions("alert", {
	"class"			: "rgb",	//"classic", "rgb"
	"animation"		: "fade",	//run, reverseRun, moveUp, moveDown, zoom, fade
});

let clientkey = null;

document.addEventListener("dataInit", e => {
	refresh();
});

document.addEventListener("menuChanged", e => {
});

selectList = async () => {
	const grd = document.querySelector("nine-grid");
	const topMenu = document.querySelector("top-menu");

	grd.classList.add("loading");

	try {
		const res = await request("/report/selectList.do", topMenu.getSearchOptions());
		grd.data.source = res.list;
	} catch (e) {
		grd.classList.remove("loading");
	}
}

refresh = () => {
	if (document.querySelector("nine-grid")) {
		selectList();
	}
	else {
		document.querySelector("line-chart,bar-chart").refresh();
	}
}

document.addEventListener("DOMContentLoaded", (event) => {
	const button = document.querySelector("top-menu button");
	if (button) {
		button.addEventListener("click", e => {
			refresh();
		});
	}
});


request = async (url, data = {}) => {

	data = data || {};

	const ajaxRequest = async (url, data, method = "POST") => {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open(method, url, true);
			xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');

			//console.log(url);

			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4) {
					if (xhr.status >= 200 && xhr.status < 300) {
						resolve(JSON.parse(xhr.responseText));
					} else {
						//console.error(xhr);
						ninegrid.alert(xhr.response, null, {
							class: "rgb",
							animation: "shake",
						});

						reject({
							status: xhr.status,
							statusText: xhr.statusText,
							response: xhr.response//JSON.parse(xhr.response)
						});
					}
				}
			};

			xhr.send(JSON.stringify(data));
		});
	};

	return await ajaxRequest(url, data);
}



includeHTML = () => {

	var z, i, elmnt, file, xhttp;
	z = document.getElementsByTagName("*");
	for (i = 0; i < z.length; i++) {
		elmnt = z[i];
		file = elmnt.getAttribute("include-html");
		if (file) {
			xhttp = new XMLHttpRequest();
			xhttp.onreadystatechange = function() {
				if (this.readyState == 4 && this.status == 200) {
					elmnt.innerHTML = this.responseText;
					elmnt.removeAttribute("include-html");
					includeHTML();
				}
			}
			
			xhttp.open("GET", file, true);
			xhttp.send();
			return;
		}
	}
};


