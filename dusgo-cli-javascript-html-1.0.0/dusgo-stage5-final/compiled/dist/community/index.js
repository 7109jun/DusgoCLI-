"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.communityOpen = communityOpen;
exports.communitySearch = communitySearch;
exports.communityProject = communityProject;
exports.communityUser = communityUser;
const BASE = "https://playentry.org";
const sections = {
    projects: "/project/list/all",
    popular: "/project/list/popular",
    entrylife: "/community/entrylife",
    qna: "/community/qna/list/1",
    tips: "/community/tips/list/1",
    notice: "/community/notice/list/1"
};
async function communityOpen(browser, target = "projects") {
    const url = sections[target] ? BASE + sections[target] : normalizeUrl(target);
    await browser.open(url);
    return url;
}
async function communitySearch(browser, query) {
    if (!query.trim())
        throw new Error("community search <검색어>가 필요합니다.");
    const url = `${BASE}/us?query=${encodeURIComponent(query)}`;
    await browser.open(url);
    return url;
}
async function communityProject(browser, idOrUrl) {
    const url = /^https?:\/\//i.test(idOrUrl) ? idOrUrl : `${BASE}/project/${encodeURIComponent(idOrUrl)}`;
    await browser.open(url);
    return url;
}
async function communityUser(browser, idOrUrl) {
    const url = /^https?:\/\//i.test(idOrUrl) ? idOrUrl : `${BASE}/profile/${encodeURIComponent(idOrUrl)}/project`;
    await browser.open(url);
    return url;
}
function normalizeUrl(value) { return /^https?:\/\//i.test(value) ? value : `${BASE}/${value.replace(/^\/+/, "")}`; }
