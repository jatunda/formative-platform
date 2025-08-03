// public/view.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

const app = initializeApp({ 
	databaseURL: "https://formative-platform-default-rtdb.firebaseio.com/",
});
const db = getDatabase(app);

const params = new URLSearchParams(window.location.search);
const classId = params.get("class");
const today = new Date();
const dayIndex = Math.floor((today - new Date("2025-08-02")) / 86400000);
console.log("view.js dayindex: %s", dayIndex);

let pageIds = [];
let pageCache = {};
const contentEl = document.getElementById("content");

async function cachePages() {
	// Fetch all pages in parallel and cache them
	const fetches = pageIds.map(id => 
		get(ref(db, `content/${id}`)).then(snap => {
			pageCache[id] = snap.val();
		})
	);
	await Promise.all(fetches);
}

function renderContent(data) {
	if (!data) {
		contentEl.textContent = "Content not found.";
		return;
	}

	if(data.title){
		const title = document.createElement("h2");
		title.textContent = data.title;
		contentEl.appendChild(title);
	}

	data.blocks.forEach(block => {
		if (block.type === "question" && Array.isArray(block.content)) {
			block.content.forEach(item => {
				if (item.type === "text") {
					const p = document.createElement("p");
					p.textContent = item.value;
					contentEl.appendChild(p);
				}
				if (item.type === "code") {
					const pre = document.createElement("pre");
					pre.textContent = item.value;
					contentEl.appendChild(pre);
				}
			});
		}
	});
}

function loadPage() {
	for (let idx = 0; idx < pageIds.length; idx++) {
		const page = pageIds[idx];
		if (idx !== 0) {
			const hr = document.createElement("hr");
			contentEl.appendChild(hr);
		}
		const data = pageCache[page];
		renderContent(data);
	}
}

async function init() {
	const snap = await get(ref(db, `schedule/${classId}/${dayIndex}`));
	const ids = snap.val();
	if (!ids || ids.length === 0) {
		contentEl.textContent = "No content for today.";
		return;
	}
	pageIds = ids;
	await cachePages();
	loadPage();
}

init();
